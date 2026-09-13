/**
 * Parity check: packed scene.pkg route vs RePKG-extracted ZIP route.
 *
 * The pkg import path exists so users can skip the RePKG round-trip, which
 * means both routes must produce the *same* scene. This tool rebuilds real
 * RePKG-extracted scene folders into synthetic `scene.pkg` archives and then
 * runs the identical pipeline over both entry maps, comparing:
 *
 *   entry map          (path set and bytes)
 *   resource graph     (parseWallpaperEngineResourceGraph)
 *   capability report  (analyzeWallpaperEngineCapabilities)
 *   converted archive  (convertWallpaperEngineResourceGraph)
 *   persisted resources (buildWallpaperEngineSceneResources)
 *
 * Synthetic packing mirrors how Wallpaper Engine really stores textures:
 *   - a `stem_0 ... stem_N` run that a material declares as a spritesheet
 *     becomes ONE multi-image TEX, which the reader must expand back into the
 *     same numbered image entries;
 *   - every other image becomes a single-image TEX;
 *   - JSON / MDL / shader / font entries are stored verbatim.
 *
 * Each PNG is wrapped as an embedded-PNG TEX payload, so the reader passes the
 * original bytes straight through and the byte comparison stays meaningful.
 *
 * Usage:
 *   node src/tools/check-wallpaper-engine-pkg-parity.mjs [corpusDir ...]
 *
 * With no argument it looks for `../wallpaper` next to the project. Missing
 * corpora are reported and skipped, so this is safe to run anywhere.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { deflateSync } from 'node:zlib';

import {
  createCanvasStub,
  createPngEncoder,
  createTsLoader,
  resolveSourceRoot,
} from './lib/load-ts-module.mjs';

// The source root is `<project>/src`, so the project root is its parent.
const projectRoot = path.dirname(resolveSourceRoot());
const defaultCorpus = path.resolve(projectRoot, '..', 'wallpaper');

const sources = process.argv.slice(2).length ? process.argv.slice(2) : [defaultCorpus];
const roots = sources.map((source) => path.resolve(source));

const load = createTsLoader(resolveSourceRoot());
const encodePng = createPngEncoder(deflateSync);
const canvasGlobals = createCanvasStub(encodePng);

const pkgImport = load('features/theme/utils/wallpaperEnginePkgImport.ts', canvasGlobals);
const resourceGraph = load('features/theme/utils/wallpaperEngineResourceGraph.ts');
const sceneConverter = load('features/theme/utils/wallpaperEngineSceneConverter.ts');
const capabilityAnalyzer = load('features/theme/utils/wallpaperEngineCapabilityAnalyzer.ts');
const sceneStorage = load('features/theme/utils/wallpaperEngineSceneStorage.ts');

// ── synthetic pkg builders ───────────────────────────────────────────────────
const encoder = new TextEncoder();

const concat = (parts) => {
  const total = parts.reduce((sum, p) => sum + p.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) { out.set(part, offset); offset += part.length; }
  return out;
};

const i32 = (value) => {
  const b = new Uint8Array(4);
  new DataView(b.buffer).setInt32(0, value, true);
  return b;
};

const u32 = (value) => {
  const b = new Uint8Array(4);
  new DataView(b.buffer).setUint32(0, value, true);
  return b;
};

const sizedString = (value) => concat([i32(encoder.encode(value).length), encoder.encode(value)]);
const nstring = (value) => concat([encoder.encode(value), new Uint8Array([0])]);

const buildPkg = (entries) => {
  const header = concat([sizedString('PKGV0001'), i32(entries.length)]);
  const indexParts = [];
  let offset = 0;
  for (const entry of entries) {
    indexParts.push(concat([sizedString(entry.path), u32(offset), u32(entry.stored.length)]));
    offset += entry.stored.length;
  }
  return concat([header, ...indexParts, ...entries.map((e) => e.stored)]);
};

const readPngSize = (png) => {
  if (png.length < 24 || png[0] !== 0x89) return { width: 1, height: 1 };
  const view = new DataView(png.buffer, png.byteOffset, png.byteLength);
  return { width: view.getUint32(16, false), height: view.getUint32(20, false) };
};

/** TEXB0001 container holding `images` (one mipmap each). */
const buildTex = (images) => {
  const parts = [
    nstring('TEXV0005'),
    nstring('TEXI0001'),
    i32(0), // RGBA8888
    i32(0), // flags
    i32(images[0].width),
    i32(images[0].height),
    i32(images[0].width),
    i32(images[0].height),
    u32(0),
    nstring('TEXB0001'),
    i32(images.length),
  ];
  for (const image of images) {
    parts.push(i32(1), i32(image.width), i32(image.height), i32(image.bytes.length), image.bytes);
  }
  return concat(parts);
};

/** Texture references that some material declares as a spritesheet. */
const collectSpritesheetRefs = (relativePaths, bytesOf) => {
  const decoder = new TextDecoder();
  const refs = new Set();
  for (const relativePath of relativePaths) {
    if (!/\.json$/i.test(relativePath)) continue;
    let json;
    try { json = JSON.parse(decoder.decode(bytesOf(relativePath))); } catch { continue; }
    if (!json || !Array.isArray(json.passes)) continue;
    for (const pass of json.passes) {
      const flag = pass?.combos?.spritesheet;
      if (!(flag === 1 || flag === true || flag === '1')) continue;
      for (const texture of pass.textures ?? []) {
        if (typeof texture === 'string' && texture.trim()) {
          refs.add(texture.trim().replace(/\\/g, '/').replace(/\.tex$/i, ''));
        }
      }
    }
  }
  return [...refs];
};

const stemMatchesRef = (stem, refs) => {
  const normalized = stem.replace(/\\/g, '/');
  return refs.some((ref) => normalized === ref || normalized.endsWith(`/${ref}`));
};

/**
 * Rebuild an extracted file set into the entries a matching scene.pkg contains.
 *
 * A numbered image is only treated as a spritesheet frame when a material
 * declares it as one — RePKG output alone cannot tell `Star_04` (frame 4) from
 * a texture the author named `Star_04`.
 */
const planPkgEntries = (relativePaths, bytesOf) => {
  const toTexImage = (relativePath) => {
    const bytes = bytesOf(relativePath);
    return { bytes, ...readPngSize(bytes) };
  };

  const groups = new Map();
  const plainImages = [];
  const others = [];
  const pathSet = new Set(relativePaths);
  const spritesheetRefs = collectSpritesheetRefs(relativePaths, bytesOf);

  for (const relativePath of relativePaths) {
    if (!/\.(png|jpe?g)$/i.test(relativePath)) { others.push(relativePath); continue; }
    const match = /^(.*)_(\d+)\.(png|jpe?g)$/i.exec(relativePath);
    if (!match) { plainImages.push(relativePath); continue; }
    if (pathSet.has(relativePath.replace(/\.(png|jpe?g)$/i, '.json'))) { plainImages.push(relativePath); continue; }
    if (!stemMatchesRef(match[1], spritesheetRefs)) { plainImages.push(relativePath); continue; }
    const key = `${match[1]}\u0000${match[3].toLowerCase()}`;
    const group = groups.get(key) ?? { stem: match[1], frames: [] };
    group.frames.push({ index: Number(match[2]), path: relativePath });
    groups.set(key, group);
  }

  const out = [];
  for (const group of groups.values()) {
    group.frames.sort((a, b) => a.index - b.index);
    if (group.frames.length >= 2) {
      out.push({ path: `${group.stem}.tex`, stored: buildTex(group.frames.map((f) => toTexImage(f.path))) });
      continue;
    }
    const only = group.frames[0];
    out.push({ path: only.path.replace(/\.(png|jpe?g)$/i, '.tex'), stored: buildTex([toTexImage(only.path)]) });
  }
  for (const relativePath of plainImages) {
    out.push({ path: relativePath.replace(/\.(png|jpe?g)$/i, '.tex'), stored: buildTex([toTexImage(relativePath)]) });
  }
  for (const relativePath of others) out.push({ path: relativePath, stored: bytesOf(relativePath) });
  return out;
};

// ── corpus discovery ─────────────────────────────────────────────────────────
const collectFiles = (dir) => {
  const out = [];
  const walk = (current) => {
    for (const name of readdirSync(current)) {
      const full = path.join(current, name);
      if (statSync(full).isDirectory()) walk(full);
      else out.push(full);
    }
  };
  walk(dir);
  return out;
};

const findScenes = (dir, depth = 0) => {
  if (depth > 4) return [];
  let names = [];
  try { names = readdirSync(dir); } catch { return []; }
  if (names.includes('scene.json') || names.includes('gifscene.json')) return [dir];
  const found = [];
  for (const name of names) {
    const full = path.join(dir, name);
    try { if (statSync(full).isDirectory()) found.push(...findScenes(full, depth + 1)); } catch { /* skip */ }
  }
  return found;
};

// ── comparison ───────────────────────────────────────────────────────────────
const diff = (a, b) => {
  const sa = JSON.stringify(a);
  const sb = JSON.stringify(b);
  if (sa === sb) return null;
  let i = 0;
  while (i < sa.length && i < sb.length && sa[i] === sb[i]) i += 1;
  const from = Math.max(0, i - 70);
  return `first difference at ${i}\n      zip: ...${sa.slice(from, from + 300)}\n      pkg: ...${sb.slice(from, from + 300)}`;
};

let sceneCount = 0;
let failures = 0;

const checkScene = async (root, label) => {
  const localFailures = [];
  const files = collectFiles(root);
  const relativePaths = files.map((f) => path.relative(root, f).replace(/\\/g, '/'));
  const cache = new Map();
  const bytesOf = (relativePath) => {
    const cached = cache.get(relativePath);
    if (cached) return cached;
    const bytes = new Uint8Array(readFileSync(path.join(root, relativePath)));
    cache.set(relativePath, bytes);
    return bytes;
  };

  const zipEntries = new Map();
  for (const relativePath of relativePaths) zipEntries.set(relativePath, bytesOf(relativePath));

  const pkgBytes = buildPkg(planPkgEntries(relativePaths, bytesOf));
  const pkgResult = await pkgImport.readWallpaperEnginePkgEntries(new File([pkgBytes], 'scene.pkg'));
  const pkgEntries = pkgResult.entries;

  const zipKeys = [...zipEntries.keys()].sort();
  const pkgKeys = [...pkgEntries.keys()].sort();
  const keyDiff = diff(zipKeys, pkgKeys);
  if (keyDiff) localFailures.push(`entry path sets differ\n${keyDiff}`);

  let byteMismatch = 0;
  for (const key of zipKeys) {
    const a = zipEntries.get(key);
    const b = pkgEntries.get(key);
    if (!a || !b || a.length !== b.length) { byteMismatch += 1; continue; }
    for (let i = 0; i < a.length; i += 1) { if (a[i] !== b[i]) { byteMismatch += 1; break; } }
  }
  if (byteMismatch) localFailures.push(`${byteMismatch}/${zipKeys.length} entries differ in bytes`);

  const zipGraph = resourceGraph.parseWallpaperEngineResourceGraph(zipEntries);
  const pkgGraph = resourceGraph.parseWallpaperEngineResourceGraph(pkgEntries);
  for (const [name, a, b] of [
    ['resource graph', zipGraph, pkgGraph],
    ['capability report',
      capabilityAnalyzer.analyzeWallpaperEngineCapabilities(zipEntries, zipGraph),
      capabilityAnalyzer.analyzeWallpaperEngineCapabilities(pkgEntries, pkgGraph)],
  ]) {
    const d = diff(a, b);
    if (d) localFailures.push(`${name} differs\n${d}`);
  }

  const zipArchive = sceneConverter.convertWallpaperEngineResourceGraph(zipEntries, zipGraph);
  const pkgArchive = sceneConverter.convertWallpaperEngineResourceGraph(pkgEntries, pkgGraph);
  const archiveDiff = diff(zipArchive, pkgArchive);
  if (archiveDiff) localFailures.push(`converted archive differs\n${archiveDiff}`);

  for (let index = 0; index < zipArchive.scenes.length; index += 1) {
    const resourcesOf = (archive, entries) => Array.from(
      sceneStorage.buildWallpaperEngineSceneResources('x', archive.scenes[index], entries).resources,
      (r) => ({ path: r.path, mimeType: r.mimeType, byteLength: r.byteLength }),
    );
    const d = diff(resourcesOf(zipArchive, zipEntries), resourcesOf(pkgArchive, pkgEntries));
    if (d) localFailures.push(`scene ${index}: persisted resources differ\n${d}`);
  }

  const kinds = {};
  for (const scene of zipArchive.scenes) {
    for (const layer of scene.layers) kinds[layer.source.kind] = (kinds[layer.source.kind] ?? 0) + 1;
  }
  const layers = Object.values(kinds).reduce((a, b) => a + b, 0);
  const kindSummary = Object.entries(kinds).map(([k, v]) => `${k}:${v}`).join(' ') || 'none';

  sceneCount += 1;
  if (localFailures.length) {
    failures += localFailures.length;
    console.log(`  [FAIL] ${label}`);
    for (const failure of localFailures) console.log(`      ${failure}`);
  } else {
    console.log(`  [ok]   ${label}: ${zipKeys.length} entries, ${layers} layer(s) [${kindSummary}]`
      + (pkgResult.textureIssues.length ? `, ${pkgResult.textureIssues.length} texture issue(s)` : ''));
  }
};

const scenes = [];
for (const root of roots) {
  if (!statSync(root, { throwIfNoEntry: false })?.isDirectory()) {
    console.log(`skipping missing corpus: ${root}`);
    continue;
  }
  scenes.push(...findScenes(root));
}

if (!scenes.length) {
  console.log('\nNo RePKG-extracted scene folders found; nothing to compare.');
  console.log('Pass one or more corpus directories, e.g.');
  console.log('  node src/tools/check-wallpaper-engine-pkg-parity.mjs ../wallpaper');
  process.exit(0);
}

console.log(`Comparing ${scenes.length} extracted scene folder(s)\n`);

for (const root of scenes) {
  const label = root.split(/[\\/]/).slice(-2).join('/');
  try {
    await checkScene(root, label);
  } catch (error) {
    failures += 1;
    console.log(`  [ERROR] ${label}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

console.log(`\n${'='.repeat(64)}`);
console.log(`scenes compared: ${sceneCount}   failures: ${failures}`);
if (failures) process.exitCode = 1;
