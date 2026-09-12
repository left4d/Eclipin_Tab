import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
let ts;
try {
  ts = require('typescript');
} catch {
  ts = require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js');
}
const root = process.cwd();
const moduleCache = new Map();

function loadTsModule(relativePath, globals = {}) {
  const filename = path.resolve(root, relativePath);
  if (moduleCache.has(filename) && Object.keys(globals).length === 0) return moduleCache.get(filename);

  const source = fs.readFileSync(filename, 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.CommonJS,
      esModuleInterop: true,
    },
    fileName: filename,
  }).outputText;
  const module = { exports: {} };
  if (Object.keys(globals).length === 0) moduleCache.set(filename, module.exports);

  const resolveProjectModule = (basePath) => {
    for (const candidate of [basePath, `${basePath}.ts`, `${basePath}.tsx`, path.join(basePath, 'index.ts'), path.join(basePath, 'index.tsx')]) {
      if (fs.existsSync(candidate)) return loadTsModule(path.relative(root, candidate));
    }
    throw new Error(`Unable to resolve local module: ${basePath}`);
  };

  const localRequire = (specifier) => {
    if (specifier.startsWith('@/')) {
      return resolveProjectModule(path.join(root, specifier.slice(2)));
    }
    if (specifier.startsWith('.')) {
      return resolveProjectModule(path.resolve(path.dirname(filename), specifier));
    }
    return require(specifier);
  };

  const context = vm.createContext({
    module,
    exports: module.exports,
    require: localRequire,
    console,
    URL,
    window: {
      open: () => null,
      location: { assign: () => {} },
    },
    globalThis,
    Uint8Array,
    Math,
    Date,
    ...globals,
  });
  vm.runInContext(output, context, { filename });
  if (Object.keys(globals).length === 0) moduleCache.set(filename, module.exports);
  return module.exports;
}

const url = loadTsModule('shared/utils/url.ts');
assert.equal(url.normalizeUrl('example.com'), 'https://example.com/');
assert.equal(url.normalizeUrl('localhost:5173'), 'http://localhost:5173/');
assert.equal(url.normalizeUrl('javascript:alert(1)'), '');
assert.equal(url.normalizeUrl('file:///tmp/test'), '');
assert.equal(url.normalizeUrl('not-a-domain'), '');
assert.equal(url.normalizeUrl('intranet'), '');
assert.equal(url.normalizeUrl('http://intranet'), 'http://intranet/');
assert.equal(url.normalizeUrl('nas.home:5000'), 'http://nas.home:5000/');
assert.equal(url.looksLikeUrl('example.com/path'), true);
assert.equal(url.looksLikeUrl('localhost:5173'), true);
assert.equal(url.looksLikeUrl('how to focus'), false);
assert.equal(url.looksLikeUrl('youtube'), false);
assert.equal(url.resolveNavigationInput('https://example.com'), 'https://example.com/');
assert.equal(url.resolveNavigationInput('best design tools'), null);

const openedUrls = [];
const assignedUrls = [];
const popup = { opener: {} };
const navigation = loadTsModule('shared/utils/url.ts', {
  window: {
    open: (...args) => {
      openedUrls.push(args);
      return popup;
    },
    location: { assign: (value) => assignedUrls.push(value) },
  },
});
assert.equal(navigation.navigateToUrl('example.com', { openInNewTab: true }), true);
assert.deepEqual(openedUrls[0], ['https://example.com/', '_blank', 'noopener,noreferrer']);
assert.equal(popup.opener, null);
assert.equal(navigation.navigateToUrl('localhost:5173', { openInNewTab: false }), true);
assert.deepEqual(assignedUrls, ['http://localhost:5173/']);
assert.equal(navigation.navigateToUrl('javascript:alert(1)'), false);
assert.equal(openedUrls.length, 1);

const spaces = loadTsModule('features/spaces/types/space.ts');
const freshSpaces = spaces.createDefaultSpacesState();
const migratedEmptySpaces = spaces.createDefaultSpacesState([]);
assert.equal(freshSpaces.spaces[0].apps.length, 9);
assert.equal(migratedEmptySpaces.spaces[0].apps.length, 0);
assert.equal(freshSpaces.spaces[1].apps.length, 6);



const vectorIconSizing = loadTsModule('features/vector-icons/utils/vectorIconSizing.ts');
assert.equal(vectorIconSizing.VECTOR_ICON_CANONICAL_SIZE, 100);
assert.equal(vectorIconSizing.VECTOR_ICON_CANONICAL_CONTENT_SIZE, 88);
assert.equal(vectorIconSizing.VECTOR_ICON_DEFAULT_DISPLAY_SIZE, 128);

const ids = loadTsModule('shared/utils/id.ts');
const generated = new Set(Array.from({ length: 200 }, () => ids.createId()));
assert.equal(generated.size, 200);
assert.match(ids.createId('widget'), /^widget-/);

const layout = loadTsModule('features/widgets/utils/layoutAlgorithm.ts');
const a = { id: 'a', type: 'link', pageId: 1, x: 0, y: 0, w: 2, h: 2 };
const b = { id: 'b', type: 'link', pageId: 1, x: 1, y: 1, w: 2, h: 2 };
const otherPage = { ...b, id: 'c', pageId: 0 };
assert.equal(layout.collides(a, b), true);
assert.equal(layout.collides(a, otherPage), false);
const freeSlot = layout.findFreeSlot(1, 1, [a], 4, 1);
assert.equal(freeSlot?.x, 2);
assert.equal(freeSlot?.y, 0);

const pageScroll = loadTsModule('features/navigation/utils/pageScroll.ts');
assert.equal(pageScroll.getPagedScrollTarget({ scrollTop: 0, clientHeight: 800, scrollHeight: 2600 }, 1), 800);
assert.equal(pageScroll.getPagedScrollTarget({ scrollTop: 800, clientHeight: 800, scrollHeight: 2600 }, 1), 1600);
assert.equal(pageScroll.getPagedScrollTarget({ scrollTop: 1600, clientHeight: 800, scrollHeight: 2600 }, -1), 800);
assert.equal(pageScroll.getPagedScrollTarget({ scrollTop: 1600, clientHeight: 800, scrollHeight: 1900 }, 1), 1100);

const widgetLayoutService = loadTsModule('features/widgets/services/widgetLayoutService.ts');
const widgetLayoutConfig = loadTsModule('features/widgets/config/widgetLayoutConfig.ts');
assert.equal(widgetLayoutConfig.WIDGET_MIN_SIZE.gtrend.w, 96);
assert.equal(widgetLayoutConfig.WIDGET_MIN_SIZE.gtrend.h, 72);
assert.equal(widgetLayoutService.normalizePriority(1200.8), 999);
assert.equal(widgetLayoutService.normalizePriority(-1200.8), -999);
const scaledWidgetLayoutService = loadTsModule('features/widgets/services/widgetLayoutService.ts', {
  window: { innerWidth: 2560, innerHeight: 1440, outerWidth: 2560, devicePixelRatio: 1 },
  document: { querySelectorAll: () => [] },
});
assert.equal(scaledWidgetLayoutService.WIDGET_REFERENCE_WIDTH, 1920);
assert.equal(scaledWidgetLayoutService.getWidgetViewportScale(), 2560 / 1920);
assert.deepEqual({ ...scaledWidgetLayoutService.getWidgetViewport() }, { w: 1920, h: 1080 });
const widgetCounts = widgetLayoutService.getWidgetCounts([
  { ...a, pageId: 0 },
  { ...b, pageId: 1 },
]);
assert.equal(widgetCounts.first, 1);
assert.equal(widgetCounts.second, 1);
const normalizedAnalog = widgetLayoutService.normalizeStoredWidget({
  id: 'analog', type: 'analogClock', pageId: 1, x: -4, y: -2, w: 240, h: 190,
});
assert.equal(normalizedAnalog.x, -4);
assert.equal(normalizedAnalog.y, -2);
assert.equal(normalizedAnalog.w, 240);
assert.equal(normalizedAnalog.h, 190);

const freeLayoutBounds = loadTsModule('shared/utils/freeLayoutBounds.ts');
assert.equal(freeLayoutBounds.clampFreeLayoutAxis(-80, 1000, 200), -50);
assert.equal(freeLayoutBounds.clampFreeLayoutAxis(900, 1000, 200), 850);
assert.equal(freeLayoutBounds.clampFreeLayoutAxis(820, 1000, 200), 820);

const md5Utils = loadTsModule('shared/utils/md5.ts');
assert.equal(md5Utils.md5(''), 'd41d8cd98f00b204e9800998ecf8427e');
assert.equal(md5Utils.md5('abc'), '900150983cd24fb0d6963f7d28e17f72');
assert.equal(md5Utils.md5('你好'), '7eca689f0d3389d9dea66ae112e5cfd7');


const zipUtils = loadTsModule('shared/utils/zip.ts', {
  TextDecoder,
  TextEncoder,
  Blob,
  File,
  Response,
  DecompressionStream,
  DataView,
  ArrayBuffer,
});
const testCrc32 = (bytes) => {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let i = 0; i < 8; i += 1) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
};
const rawName = Uint8Array.from([0x32,0x30,0x32,0x35,0xd4,0xde,0xd6,0xfa,0x2e,0x70,0x6e,0x67]);
const unicodeName = new TextEncoder().encode('2025赞助.png');
const unicodeExtra = new Uint8Array(4 + 1 + 4 + unicodeName.length);
const unicodeExtraView = new DataView(unicodeExtra.buffer);
unicodeExtraView.setUint16(0, 0x7075, true);
unicodeExtraView.setUint16(2, 1 + 4 + unicodeName.length, true);
unicodeExtra[4] = 1;
unicodeExtraView.setUint32(5, testCrc32(rawName), true);
unicodeExtra.set(unicodeName, 9);
const zipPayload = new TextEncoder().encode('ok');
const localHeader = new Uint8Array(30 + rawName.length + unicodeExtra.length + zipPayload.length);
const localHeaderView = new DataView(localHeader.buffer);
localHeaderView.setUint32(0, 0x04034b50, true);
localHeaderView.setUint16(4, 20, true);
localHeaderView.setUint16(6, 0, true);
localHeaderView.setUint16(8, 0, true);
localHeaderView.setUint32(18, zipPayload.length, true);
localHeaderView.setUint32(22, zipPayload.length, true);
localHeaderView.setUint16(26, rawName.length, true);
localHeaderView.setUint16(28, unicodeExtra.length, true);
localHeader.set(rawName, 30);
localHeader.set(unicodeExtra, 30 + rawName.length);
localHeader.set(zipPayload, 30 + rawName.length + unicodeExtra.length);
const unicodeZipEntries = await zipUtils.readZip(new File([localHeader], 'unicode.zip', { type: 'application/zip' }));
assert.equal(unicodeZipEntries.has('2025赞助.png'), true);
assert.equal(new TextDecoder().decode(unicodeZipEntries.get('2025赞助.png')), 'ok');


const wallpaperEngineTextMetrics = loadTsModule('features/theme/utils/wallpaperEngineTextMetrics.ts');
assert.equal(wallpaperEngineTextMetrics.wePointSizeToScenePixels(16), 64);
assert.equal(wallpaperEngineTextMetrics.wePointSizeToScenePixels(20), 80);
assert.equal(wallpaperEngineTextMetrics.wePointSizeToScenePixels(0), 0.4);
assert.deepEqual(
  { ...wallpaperEngineTextMetrics.getWeTextAnchorCenterOffset({
    width: 405,
    height: 84,
    scaleX: 1,
    scaleY: 1,
    rotationDeg: 0,
    horizontalAlign: 'center',
    verticalAlign: 'top',
  }) },
  { x: 0, y: 42 },
);
assert.deepEqual(
  { ...wallpaperEngineTextMetrics.getWeTextAnchorCenterOffset({
    width: 130,
    height: 20,
    scaleX: 1,
    scaleY: 1,
    rotationDeg: 0,
    horizontalAlign: 'right',
    verticalAlign: 'top',
  }) },
  { x: -65, y: 10 },
);
const rotatedTextAnchorOffset = wallpaperEngineTextMetrics.getWeTextAnchorCenterOffset({
  width: 100,
  height: 40,
  scaleX: 2,
  scaleY: 0.5,
  rotationDeg: 90,
  horizontalAlign: 'left',
  verticalAlign: 'center',
});
assert.ok(Math.abs(rotatedTextAnchorOffset.x) < 1e-9);
assert.ok(Math.abs(rotatedTextAnchorOffset.y - 100) < 1e-9);

const wallpaperEngineGraph = loadTsModule('features/theme/utils/wallpaperEngineResourceGraph.ts', {
  TextDecoder,
});
const encodeJson = (value) => new TextEncoder().encode(JSON.stringify(value));
const weEntries = new Map([
  ['sample/custom-root.json', encodeJson({
    camera: { center: '0 0 -1' },
    general: { orthogonalprojection: { width: 1920, height: 1080 } },
    objects: [{
      id: 7,
      name: '鸟',
      image: 'models/鸟.json',
      origin: '960 540 0',
      scale: '1 1 1',
      angles: '0 0 0',
      visible: { value: true },
    }],
  })],
  ['sample/models/#U9e1f.json', encodeJson({ material: 'materials/鸟.json' })],
  ['sample/materials/#U9e1f.json', encodeJson({
    passes: [{ textures: ['鸟'], combos: { spritesheet: 1 } }],
  })],
  ['sample/materials/#U9e1f_10.png', Uint8Array.of(10)],
  ['sample/materials/#U9e1f_2.png', Uint8Array.of(2)],
  ['sample/materials/#U9e1f_0.png', Uint8Array.of(0)],
]);
const weGraph = wallpaperEngineGraph.parseWallpaperEngineResourceGraph(weEntries);
assert.equal(weGraph.scenes.length, 1);
assert.equal(weGraph.scenes[0].descriptorPath, 'sample/custom-root.json');
assert.equal(weGraph.scenes[0].imageLayers.length, 1);
assert.equal(weGraph.scenes[0].imageLayers[0].modelPath, 'sample/models/#U9e1f.json');
assert.equal(weGraph.scenes[0].imageLayers[0].materialPath, 'sample/materials/#U9e1f.json');
assert.equal(weGraph.scenes[0].imageLayers[0].textures[0].kind, 'frameSequence');
assert.deepEqual(
  Array.from(weGraph.scenes[0].imageLayers[0].textures[0].paths),
  ['sample/materials/#U9e1f_0.png', 'sample/materials/#U9e1f_2.png', 'sample/materials/#U9e1f_10.png'],
);

const wrappedPropertyEntries = new Map([
  ['wrapped/scene.json', encodeJson({
    camera: { center: '0 0 -1' },
    general: {
      orthogonalprojection: { width: { value: 3840 }, height: { value: 2160 } },
      cameraparallax: { value: true },
      cameraparallaxamount: { value: 0.25 },
    },
    objects: [{
      id: 8,
      image: 'models/layer.json',
      origin: { animation: { options: { fps: 30 } }, value: '3984.76025 1970.36499 2' },
      scale: { script: 'return value;', value: '1.5 0.75 1' },
      angles: { animation: {}, value: '0 0 1.25' },
      size: { value: '640 360' },
      parallaxDepth: { value: '0.2 -0.1' },
      alpha: { script: 'return value;', value: 0.4 },
      visible: { animation: {}, value: false },
      colorBlendMode: { value: 4 },
    }],
  })],
  ['wrapped/models/layer.json', encodeJson({ material: 'materials/layer.json' })],
  ['wrapped/materials/layer.json', encodeJson({ passes: [{ textures: ['layer'] }] })],
  ['wrapped/materials/layer.png', Uint8Array.of(1)],
]);
const wrappedPropertyGraph = wallpaperEngineGraph.parseWallpaperEngineResourceGraph(wrappedPropertyEntries);
const wrappedLayer = wrappedPropertyGraph.scenes[0].imageLayers[0];
assert.deepEqual(Array.from(wrappedLayer.transform.origin), [3984.76025, 2160 - 1970.36499, 2]);
assert.deepEqual(Array.from(wrappedLayer.transform.scale), [1.5, 0.75, 1]);
assert.deepEqual(Array.from(wrappedLayer.transform.angles), [0, 0, -1.25]);
assert.deepEqual(Array.from(wrappedLayer.transform.size), [640, 360]);
assert.deepEqual(Array.from(wrappedLayer.transform.parallaxDepth), [0.2, -0.1]);
assert.equal(wrappedLayer.transform.opacity, 0.4);
assert.equal(wrappedLayer.transform.visible, false);
assert.equal(wrappedLayer.colorBlendMode, 4);
assert.equal(wrappedPropertyGraph.scenes[0].size.width, 3840);
assert.equal(wrappedPropertyGraph.scenes[0].size.height, 2160);
assert.equal(wrappedPropertyGraph.scenes[0].cameraParallax.enabled, true);
assert.equal(wrappedPropertyGraph.scenes[0].cameraParallax.amount, 0.25);

const opacityEffectEntries = new Map([
  ['opacity/scene.json', encodeJson({
    general: { orthogonalprojection: { width: 800, height: 600 } },
    objects: [{
      id: 12,
      image: 'models/layer.json',
      origin: '400 300 0',
      size: '400 300',
      alpha: 0.8,
      effects: [{
        file: 'effects/custom-opacity.json',
        visible: true,
        passes: [{
          constantshadervalues: { alpha: 0.5 },
          textures: [null, 'masks/fade_mask'],
        }],
      }],
    }],
  })],
  ['opacity/models/layer.json', encodeJson({ material: 'materials/layer.json' })],
  ['opacity/materials/layer.json', encodeJson({ passes: [{ textures: ['layer'] }] })],
  ['opacity/materials/layer.png', Uint8Array.of(1)],
  ['opacity/effects/custom-opacity.json', encodeJson({ replacementkey: 'opacity' })],
  ['opacity/materials/masks/fade_mask.png', Uint8Array.of(2)],
]);
const opacityEffectGraph = wallpaperEngineGraph.parseWallpaperEngineResourceGraph(opacityEffectEntries);
const opacityGraphLayer = opacityEffectGraph.scenes[0].imageLayers[0];
assert.equal(opacityGraphLayer.opacityEffects.length, 1);
assert.equal(opacityGraphLayer.opacityEffects[0].maskPath, 'opacity/materials/masks/fade_mask.png');
assert.equal(opacityGraphLayer.opacityEffects[0].alpha, 0.5);
assert.equal(opacityGraphLayer.textureEffects.length, 1);
assert.equal(opacityGraphLayer.textureEffects[0].kind, 'opacity');
assert.equal(opacityGraphLayer.textureEffects[0].maskPath, 'opacity/materials/masks/fade_mask.png');
assert.equal(opacityGraphLayer.hasEffects, false);

const waterWavesEffectEntries = new Map([
  ['waterwaves/scene.json', encodeJson({
    general: { orthogonalprojection: { width: 800, height: 600 } },
    objects: [{
      id: 18,
      image: 'models/layer.json',
      origin: '400 300 0',
      size: '400 300',
      effects: [{
        file: 'effects/custom-waterwaves.json',
        visible: true,
        passes: [{
          constantshadervalues: { direction: 0.25, speed: 4, scale: 18, exponent: 1.5, strength: 0.08 },
          textures: [null, 'masks/wave_mask', 'masks/time_offset'],
        }],
      }],
    }],
  })],
  ['waterwaves/models/layer.json', encodeJson({ material: 'materials/layer.json' })],
  ['waterwaves/materials/layer.json', encodeJson({ passes: [{ textures: ['layer'] }] })],
  ['waterwaves/materials/layer.png', Uint8Array.of(1)],
  ['waterwaves/effects/custom-waterwaves.json', encodeJson({ replacementkey: 'waterwaves' })],
  ['waterwaves/materials/masks/wave_mask.png', Uint8Array.of(2)],
  ['waterwaves/materials/masks/time_offset.png', Uint8Array.of(3)],
]);
const waterWavesEffectGraph = wallpaperEngineGraph.parseWallpaperEngineResourceGraph(waterWavesEffectEntries);
const waterWavesGraphLayer = waterWavesEffectGraph.scenes[0].imageLayers[0];
assert.equal(waterWavesGraphLayer.waterWavesEffects.length, 1);
assert.equal(waterWavesGraphLayer.waterWavesEffects[0].maskPath, 'waterwaves/materials/masks/wave_mask.png');
assert.equal(waterWavesGraphLayer.waterWavesEffects[0].timeOffsetPath, 'waterwaves/materials/masks/time_offset.png');
assert.equal(waterWavesGraphLayer.waterWavesEffects[0].direction, 0.25);
assert.equal(waterWavesGraphLayer.waterWavesEffects[0].speed, 4);
assert.equal(waterWavesGraphLayer.waterWavesEffects[0].scale, 18);
assert.equal(waterWavesGraphLayer.waterWavesEffects[0].exponent, 1.5);
assert.equal(waterWavesGraphLayer.waterWavesEffects[0].strength, 0.08);
assert.equal(waterWavesGraphLayer.hasEffects, false);
assert.equal(waterWavesGraphLayer.textureEffects.length, 1);
assert.equal(waterWavesGraphLayer.textureEffects[0].kind, 'waterWaves');

const scrollEffectEntries = new Map([
  ['scroll/scene.json', encodeJson({
    general: { orthogonalprojection: { width: 800, height: 600 } },
    objects: [
      {
        id: 20,
        image: 'models/layer.json',
        origin: '400 300 0',
        size: '400 300',
        effects: [{
          file: 'effects/legacy-scroll.json',
          visible: true,
          passes: [{
            constantshadervalues: {
              ui_editor_properties_speed_x: -0.19,
              ui_editor_properties_speed_y: 0.24,
            },
          }],
        }],
      },
      {
        id: 21,
        image: 'models/layer.json',
        origin: '400 300 0',
        size: '400 300',
        effects: [{
          file: 'effects/modern-scroll.json',
          visible: true,
          passes: [{
            constantshadervalues: { repeat: '2 3', speedx: 0.25, speedy: -0.5 },
          }],
        }],
      },
    ],
  })],
  ['scroll/models/layer.json', encodeJson({ material: 'materials/layer.json' })],
  ['scroll/materials/layer.json', encodeJson({ passes: [{ textures: ['layer'] }] })],
  ['scroll/materials/layer.png', Uint8Array.of(1)],
  ['scroll/effects/legacy-scroll.json', encodeJson({ name: 'ui_editor_effect_scroll_title' })],
  ['scroll/effects/modern-scroll.json', encodeJson({ replacementkey: 'scroll' })],
]);
const scrollEffectGraph = wallpaperEngineGraph.parseWallpaperEngineResourceGraph(scrollEffectEntries);
assert.equal(scrollEffectGraph.scenes[0].imageLayers.length, 2);
const legacyScroll = scrollEffectGraph.scenes[0].imageLayers[0].textureEffects[0];
const modernScroll = scrollEffectGraph.scenes[0].imageLayers[1].textureEffects[0];
assert.equal(legacyScroll.kind, 'scroll');
assert.equal(legacyScroll.speedX, -0.19);
assert.equal(legacyScroll.speedY, 0.24);
assert.deepEqual(Array.from(legacyScroll.repeat), [1, 1]);
assert.equal(modernScroll.kind, 'scroll');
assert.equal(modernScroll.speedX, 0.25);
assert.equal(modernScroll.speedY, -0.5);
assert.deepEqual(Array.from(modernScroll.repeat), [2, 3]);
assert.equal(scrollEffectGraph.scenes[0].imageLayers[0].hasEffects, false);
assert.equal(scrollEffectGraph.scenes[0].imageLayers[1].hasEffects, false);

const transformEffectEntries = new Map([
  ['transform/scene.json', encodeJson({
    general: { orthogonalprojection: { width: 800, height: 600 } },
    objects: [
      {
        id: 210,
        image: 'models/layer.json',
        origin: '400 300 0',
        size: '400 300',
        effects: [{
          file: 'effects/transform.json',
          visible: true,
          passes: [{
            combos: { MODE: 0, CLAMP: 0 },
            constantshadervalues: { offset: '0.1 -0.2', scale: '1.5 0.75', angle: 0.3 },
          }],
        }],
      },
      {
        id: 211,
        image: 'models/layer.json',
        origin: '400 300 0',
        size: '400 300',
        effects: [{
          file: 'effects/transform.json',
          visible: true,
          passes: [{ combos: { MODE: 1 }, constantshadervalues: { scale: '2 2' } }],
        }],
      },
    ],
  })],
  ['transform/models/layer.json', encodeJson({ material: 'materials/layer.json' })],
  ['transform/materials/layer.json', encodeJson({ passes: [{ textures: ['layer'] }] })],
  ['transform/materials/layer.png', Uint8Array.of(1)],
  ['transform/effects/transform.json', encodeJson({ replacementkey: 'transform', version: 1 })],
]);
const transformEffectGraph = wallpaperEngineGraph.parseWallpaperEngineResourceGraph(transformEffectEntries);
assert.equal(transformEffectGraph.scenes[0].imageLayers.length, 2);
const baseTransform = transformEffectGraph.scenes[0].imageLayers[0].textureEffects[0];
assert.equal(baseTransform.kind, 'transform');
assert.deepEqual(Array.from(baseTransform.offset), [0.1, -0.2]);
assert.deepEqual(Array.from(baseTransform.scale), [1.5, 0.75]);
assert.equal(baseTransform.angle, 0.3);
assert.equal(baseTransform.repeat, false);
assert.equal(transformEffectGraph.scenes[0].imageLayers[0].hasEffects, false);
assert.equal(transformEffectGraph.scenes[0].imageLayers[1].textureEffects.length, 0);
assert.equal(transformEffectGraph.scenes[0].imageLayers[1].hasEffects, true);

const spinEffectEntries = new Map([
  ['spin/scene.json', encodeJson({
    general: { orthogonalprojection: { width: 800, height: 600 } },
    objects: [
      {
        id: 22,
        image: 'models/layer.json',
        origin: '400 300 0',
        size: '400 300',
        effects: [{
          file: 'effects/spin.json',
          visible: true,
          passes: [{
            combos: { REPEAT: 0, ELLIPTICAL: 1 },
            constantshadervalues: {
              center: '0.25 0.75',
              speed: 2,
              ratio: -1.5,
              angle: 0.4,
              phase: 0.125,
              size: 0.45,
              feather: 0.01,
            },
          }],
        }],
      },
      {
        id: 23,
        image: 'models/layer.json',
        origin: '400 300 0',
        size: '400 300',
        effects: [{
          file: 'effects/spin.json',
          visible: true,
          passes: [{ combos: { NOISE: 1 }, constantshadervalues: { speed: 1 } }],
        }],
      },
    ],
  })],
  ['spin/models/layer.json', encodeJson({ material: 'materials/layer.json' })],
  ['spin/materials/layer.json', encodeJson({ passes: [{ textures: ['layer'] }] })],
  ['spin/materials/layer.png', Uint8Array.of(1)],
  ['spin/effects/spin.json', encodeJson({ replacementkey: 'spin', version: 2 })],
]);
const spinEffectGraph = wallpaperEngineGraph.parseWallpaperEngineResourceGraph(spinEffectEntries);
assert.equal(spinEffectGraph.scenes[0].imageLayers.length, 2);
const baseSpin = spinEffectGraph.scenes[0].imageLayers[0].textureEffects[0];
assert.equal(baseSpin.kind, 'spin');
assert.deepEqual(Array.from(baseSpin.center), [0.25, 0.75]);
assert.equal(baseSpin.speed, 2);
assert.equal(baseSpin.ratio, -1.5);
assert.equal(baseSpin.axis, 0.4);
assert.equal(baseSpin.phase, 0.125);
assert.equal(baseSpin.size, 0.45);
assert.equal(baseSpin.feather, 0.01);
assert.equal(baseSpin.repeat, false);
assert.equal(baseSpin.elliptical, true);
assert.equal(spinEffectGraph.scenes[0].imageLayers[0].hasEffects, false);
assert.equal(spinEffectGraph.scenes[0].imageLayers[1].textureEffects.length, 0);
assert.equal(spinEffectGraph.scenes[0].imageLayers[1].hasEffects, true);
assert.equal(baseSpin.aspectCorrect, true);
assert.equal(baseSpin.softMask, true);

const legacySpinEffectEntries = new Map([
  ['spin-v1/scene.json', encodeJson({
    general: { orthogonalprojection: { width: 800, height: 600 } },
    objects: [{
      id: 24,
      image: 'models/layer.json',
      origin: '400 300 0',
      size: '400 300',
      effects: [{
        file: 'effects/spin-v1.json',
        visible: true,
        passes: [{
          combos: { MODE: 0, PERSPECTIVE: 0, ELLIPTICAL: 1 },
          constantshadervalues: { center: '0.4 0.6', speed: 0.3, ratio: 2, angle: 0.2 },
        }],
      }],
    }],
  })],
  ['spin-v1/models/layer.json', encodeJson({ material: 'materials/layer.json' })],
  ['spin-v1/materials/layer.json', encodeJson({ passes: [{ textures: ['layer'] }] })],
  ['spin-v1/materials/layer.png', Uint8Array.of(1)],
  ['spin-v1/effects/spin-v1.json', encodeJson({ name: 'ui_editor_effect_spin_title', version: 1 })],
]);
const legacySpinEffectGraph = wallpaperEngineGraph.parseWallpaperEngineResourceGraph(legacySpinEffectEntries);
const legacySpin = legacySpinEffectGraph.scenes[0].imageLayers[0].textureEffects[0];
assert.equal(legacySpin.kind, 'spin');
assert.deepEqual(Array.from(legacySpin.center), [0.4, 0.6]);
assert.equal(legacySpin.speed, 0.3);
assert.equal(legacySpin.ratio, 2);
assert.equal(legacySpin.axis, 0.2);
assert.equal(legacySpin.phase, 0);
assert.equal(legacySpin.repeat, true);
assert.equal(legacySpin.elliptical, false);
assert.equal(legacySpin.aspectCorrect, false);
assert.equal(legacySpin.softMask, false);
assert.equal(legacySpinEffectGraph.scenes[0].imageLayers[0].hasEffects, false);

const perspectiveEffectEntries = new Map([
  ['perspective/scene.json', encodeJson({
    general: { orthogonalprojection: { width: 800, height: 600 } },
    objects: [{
      id: 25,
      image: 'models/layer.json',
      origin: '400 300 0',
      size: '400 300',
      effects: [{
        file: 'effects/perspective.json',
        visible: true,
        passes: [{
          combos: { REPEAT: 0 },
          constantshadervalues: {
            point0: '0.1 0.11',
            point1: '0.9 0.11',
            point2: '0.8 0.4',
            point3: '0.2 0.4',
          },
        }],
      }],
    }],
  })],
  ['perspective/models/layer.json', encodeJson({ material: 'materials/layer.json' })],
  ['perspective/materials/layer.json', encodeJson({ passes: [{ textures: ['layer'] }] })],
  ['perspective/materials/layer.png', Uint8Array.of(1)],
  ['perspective/effects/perspective.json', encodeJson({ replacementkey: 'perspective', version: 2 })],
]);
const perspectiveEffectGraph = wallpaperEngineGraph.parseWallpaperEngineResourceGraph(perspectiveEffectEntries);
const perspectiveEffect = perspectiveEffectGraph.scenes[0].imageLayers[0].textureEffects[0];
assert.equal(perspectiveEffect.kind, 'perspective');
assert.deepEqual(Array.from(perspectiveEffect.points[0]), [0.1, 0.11]);
assert.deepEqual(Array.from(perspectiveEffect.points[3]), [0.2, 0.4]);
assert.equal(perspectiveEffect.repeat, false);
assert.equal(perspectiveEffectGraph.scenes[0].imageLayers[0].hasEffects, false);

const foliageSwayEffectEntries = new Map([
  ['foliage/scene.json', encodeJson({
    general: { orthogonalprojection: { width: 800, height: 600 } },
    objects: [
      {
        id: 26,
        image: 'models/layer.json',
        origin: '400 300 0',
        size: '400 300',
        effects: [{
          file: 'effects/foliagesway.json',
          visible: true,
          passes: [{
            constantshadervalues: {
              Phase: 3,
              Power: 1.5,
              Strength: 15,
              phase: 0.23,
              power: 0.92,
              ratio: 1.68,
              scale: 0.18,
              scrolldirection: 0.45,
              speeduv: 2.82,
              strength: 0.48,
            },
            textures: [null, 'masks/leaf_mask', null],
          }],
        }],
      },
      {
        id: 27,
        image: 'models/layer.json',
        origin: '400 300 0',
        size: '400 300',
        effects: [{
          file: 'effects/foliagesway.json',
          visible: true,
          passes: [{
            constantshadervalues: { speeduv: 1.5, strength: 0.2, ratio: 0.5 },
            textures: [null, null, 'noise/custom_noise'],
          }],
        }],
      },
      {
        id: 28,
        image: 'models/layer.json',
        origin: '400 300 0',
        size: '400 300',
        effects: [{
          file: 'effects/foliagesway.json',
          visible: true,
          passes: [{ combos: { MODE: 1 }, constantshadervalues: { speeduv: 2 } }],
        }],
      },
    ],
  })],
  ['foliage/models/layer.json', encodeJson({ material: 'materials/layer.json' })],
  ['foliage/materials/layer.json', encodeJson({ passes: [{ textures: ['layer'] }] })],
  ['foliage/materials/layer.png', Uint8Array.of(1)],
  ['foliage/materials/masks/leaf_mask.png', Uint8Array.of(2)],
  ['foliage/materials/noise/custom_noise.png', Uint8Array.of(3)],
  ['foliage/effects/foliagesway.json', encodeJson({ replacementkey: 'foliagesway', version: 2 })],
]);
const foliageSwayEffectGraph = wallpaperEngineGraph.parseWallpaperEngineResourceGraph(foliageSwayEffectEntries);
assert.equal(foliageSwayEffectGraph.scenes[0].imageLayers.length, 3);
const baseFoliageSway = foliageSwayEffectGraph.scenes[0].imageLayers[0].textureEffects[0];
assert.equal(baseFoliageSway.kind, 'foliageSway');
assert.equal(baseFoliageSway.maskPath, 'foliage/materials/masks/leaf_mask.png');
assert.equal(baseFoliageSway.noisePath, null);
assert.equal(baseFoliageSway.speed, 2.82);
assert.equal(baseFoliageSway.strength, 0.48);
assert.equal(baseFoliageSway.phase, 0.23);
assert.equal(baseFoliageSway.power, 0.92);
assert.equal(baseFoliageSway.noiseScale, 0.18);
assert.equal(baseFoliageSway.ratio, 1.68);
assert.equal(baseFoliageSway.direction, 0.45);
assert.equal(foliageSwayEffectGraph.scenes[0].imageLayers[0].hasEffects, false);
const customNoiseFoliageSway = foliageSwayEffectGraph.scenes[0].imageLayers[1].textureEffects[0];
assert.equal(customNoiseFoliageSway.kind, 'foliageSway');
assert.equal(customNoiseFoliageSway.noisePath, 'foliage/materials/noise/custom_noise.png');
assert.equal(foliageSwayEffectGraph.scenes[0].imageLayers[1].hasEffects, false);
assert.equal(foliageSwayEffectGraph.scenes[0].imageLayers[2].textureEffects.length, 0);
assert.equal(foliageSwayEffectGraph.scenes[0].imageLayers[2].hasEffects, true);


const waterFlowEffectEntries = new Map([
  ['waterflow/scene.json', encodeJson({
    general: { orthogonalprojection: { width: 800, height: 600 } },
    objects: [
      {
        id: 29,
        image: 'models/layer.json',
        origin: '400 300 0',
        size: '400 300',
        effects: [{
          file: 'effects/waterflow-legacy.json',
          visible: true,
          passes: [{
            constantshadervalues: {
              ui_editor_properties_phase_scale: 10,
              ui_editor_properties_speed: 0.17,
              ui_editor_properties_strength: 0.6,
            },
            textures: [null, 'masks/flow_legacy', 'effects/waterflowphase'],
          }],
        }],
      },
      {
        id: 30,
        image: 'models/layer.json',
        origin: '400 300 0',
        size: '400 300',
        effects: [{
          file: 'effects/waterflow-dual.json',
          visible: true,
          passes: [{
            constantshadervalues: { phasescale: 4.98, speed: 0.25, strength: 0.25 },
            textures: [null, 'util/noflow', 'effects/waterflowphase'],
          }],
        }],
      },
      {
        id: 31,
        image: 'models/layer.json',
        origin: '400 300 0',
        size: '400 300',
        effects: [{
          file: 'effects/waterflow-feather.json',
          visible: true,
          passes: [{
            constantshadervalues: { feather: 0.4, phasescale: 2, speed: 0.1, strength: 8 },
            textures: [null, 'masks/flow_feather', 'effects/waterflowphase'],
          }],
        }],
      },
    ],
  })],
  ['waterflow/models/layer.json', encodeJson({ material: 'materials/layer.json' })],
  ['waterflow/materials/layer.json', encodeJson({ passes: [{ textures: ['layer'] }] })],
  ['waterflow/materials/layer.png', Uint8Array.of(1)],
  ['waterflow/materials/masks/flow_legacy.png', Uint8Array.of(2)],
  ['waterflow/materials/masks/flow_feather.png', Uint8Array.of(3)],
  ['waterflow/materials/effects/waterflowphase.png', Uint8Array.of(4)],
  ['waterflow/effects/waterflow-legacy.json', encodeJson({ name: 'ui_editor_effect_water_flow_title' })],
  ['waterflow/effects/waterflow-dual.json', encodeJson({ replacementkey: 'waterflow', version: 1 })],
  ['waterflow/effects/waterflow-feather.json', encodeJson({ replacementkey: 'water_flow', version: 1 })],
]);
const waterFlowEffectGraph = wallpaperEngineGraph.parseWallpaperEngineResourceGraph(waterFlowEffectEntries);
assert.equal(waterFlowEffectGraph.scenes[0].imageLayers.length, 3);
const legacyWaterFlow = waterFlowEffectGraph.scenes[0].imageLayers[0].textureEffects[0];
assert.equal(legacyWaterFlow.kind, 'waterFlow');
assert.equal(legacyWaterFlow.flowMapPath, 'waterflow/materials/masks/flow_legacy.png');
assert.equal(legacyWaterFlow.phasePath, 'waterflow/materials/effects/waterflowphase.png');
assert.equal(legacyWaterFlow.speed, 0.17);
assert.equal(legacyWaterFlow.strength, 0.6);
assert.equal(legacyWaterFlow.phaseScale, 10);
assert.equal(legacyWaterFlow.phaseMode, 'legacy');
assert.equal(legacyWaterFlow.feather, null);
const dualWaterFlow = waterFlowEffectGraph.scenes[0].imageLayers[1].textureEffects[0];
assert.equal(dualWaterFlow.kind, 'waterFlow');
assert.equal(dualWaterFlow.flowMapPath, null);
assert.equal(dualWaterFlow.phaseMode, 'dual');
assert.equal(dualWaterFlow.feather, null);
const featherWaterFlow = waterFlowEffectGraph.scenes[0].imageLayers[2].textureEffects[0];
assert.equal(featherWaterFlow.kind, 'waterFlow');
assert.equal(featherWaterFlow.flowMapPath, 'waterflow/materials/masks/flow_feather.png');
assert.equal(featherWaterFlow.phaseMode, 'dual');
assert.equal(featherWaterFlow.feather, 0.4);
assert.equal(featherWaterFlow.strength, 8);
assert.equal(waterFlowEffectGraph.scenes[0].imageLayers.every((layer) => layer.hasEffects === false), true);

const shakeEffectEntries = new Map([
  ['shake/scene.json', encodeJson({
    general: { orthogonalprojection: { width: 800, height: 600 } },
    objects: [
      {
        id: 310,
        image: 'models/layer.json',
        origin: '400 300 0',
        size: '400 300',
        effects: [{
          file: 'effects/shake/effect.json',
          visible: true,
          passes: [{
            constantshadervalues: { bounds: '0.1 0.9', friction: '1.5 2', speed: 2, strength: 0.12 },
            textures: [null, 'masks/shake_direction'],
          }],
        }],
      },
      {
        id: 311,
        image: 'models/layer.json',
        origin: '400 300 0',
        size: '400 300',
        effects: [{
          file: 'effects/shake/effect.json',
          visible: true,
          passes: [{
            combos: { DIRECTION: 1 },
            constantshadervalues: { speed: 1, strength: 0.2 },
            textures: [null, 'util/noflow'],
          }],
        }],
      },
      {
        id: 312,
        image: 'models/layer.json',
        origin: '400 300 0',
        size: '400 300',
        effects: [{
          file: 'effects/shake/effect.json',
          visible: true,
          passes: [{
            combos: { NOISE: 1 },
            constantshadervalues: { speed: 1, strength: 0.1 },
            textures: [null, 'masks/shake_direction'],
          }],
        }],
      },
    ],
  })],
  ['shake/models/layer.json', encodeJson({ material: 'materials/layer.json' })],
  ['shake/materials/layer.json', encodeJson({ passes: [{ textures: ['layer'] }] })],
  ['shake/materials/layer.png', Uint8Array.of(1)],
  ['shake/materials/masks/shake_direction.png', Uint8Array.of(2)],
  ['shake/effects/shake/effect.json', encodeJson({ replacementkey: 'shake', version: 1 })],
]);
const shakeEffectGraph = wallpaperEngineGraph.parseWallpaperEngineResourceGraph(shakeEffectEntries);
assert.equal(shakeEffectGraph.scenes[0].imageLayers.length, 3);
const baseShake = shakeEffectGraph.scenes[0].imageLayers[0].textureEffects[0];
assert.equal(baseShake.kind, 'shake');
assert.equal(baseShake.directionMapPath, 'shake/materials/masks/shake_direction.png');
assert.equal(baseShake.speed, 2);
assert.equal(baseShake.strength, 0.12);
assert.deepEqual(Array.from(baseShake.friction), [1.5, 2]);
assert.deepEqual(Array.from(baseShake.bounds), [0.1, 0.9]);
assert.equal(baseShake.directionMode, 0);
assert.equal(shakeEffectGraph.scenes[0].imageLayers[0].hasEffects, false);
const positiveShake = shakeEffectGraph.scenes[0].imageLayers[1].textureEffects[0];
assert.equal(positiveShake.kind, 'shake');
assert.equal(positiveShake.directionMapPath, null);
assert.equal(positiveShake.directionMode, 1);
assert.equal(shakeEffectGraph.scenes[0].imageLayers[1].hasEffects, false);
assert.equal(shakeEffectGraph.scenes[0].imageLayers[2].textureEffects.length, 0);
assert.equal(shakeEffectGraph.scenes[0].imageLayers[2].hasEffects, true);

const blurPreciseEffectEntries = new Map([
  ['blurprecise/scene.json', encodeJson({
    general: { orthogonalprojection: { width: 800, height: 600 } },
    objects: [
      {
        id: 315,
        image: 'models/layer.json',
        origin: '400 300 0',
        size: '400 300',
        effects: [{
          file: 'effects/blurprecise/effect.json',
          visible: true,
          passes: [
            {
              combos: { BLURALPHA: 1, KERNEL: 0, VERTICAL: 0 },
              constantshadervalues: { scale: '1.17 1.17' },
              textures: [null, null, null],
            },
            {
              combos: { BLURALPHA: 0, ENABLEMASK: 1, KERNEL: 0, VERTICAL: 1 },
              constantshadervalues: { scale: '1.17 1.17' },
              textures: [null, null, 'masks/blur_mask'],
            },
          ],
        }],
      },
      {
        id: 316,
        image: 'models/layer.json',
        origin: '400 300 0',
        size: '400 300',
        effects: [{
          file: 'effects/blurprecise/effect.json',
          visible: true,
          passes: [
            {
              combos: { BLURALPHA: 1, KERNEL: 1, VERTICAL: 0 },
              constantshadervalues: { scale: '1 1' },
              textures: [null, null, null],
            },
            {
              combos: { BLURALPHA: 1, KERNEL: 1, VERTICAL: 1 },
              constantshadervalues: { scale: '1 1' },
              textures: [null, null, null],
            },
          ],
        }],
      },
    ],
  })],
  ['blurprecise/models/layer.json', encodeJson({ material: 'materials/layer.json' })],
  ['blurprecise/materials/layer.json', encodeJson({ passes: [{ textures: ['layer'] }] })],
  ['blurprecise/materials/layer.png', Uint8Array.of(1)],
  ['blurprecise/materials/masks/blur_mask.png', Uint8Array.of(2)],
  ['blurprecise/effects/blurprecise/effect.json', encodeJson({ replacementkey: 'blur_precise', version: 1 })],
]);
const blurPreciseEffectGraph = wallpaperEngineGraph.parseWallpaperEngineResourceGraph(blurPreciseEffectEntries);
assert.equal(blurPreciseEffectGraph.scenes[0].imageLayers.length, 2);
const baseBlurPrecise = blurPreciseEffectGraph.scenes[0].imageLayers[0].textureEffects[0];
assert.equal(baseBlurPrecise.kind, 'blurPrecise');
assert.equal(baseBlurPrecise.maskPath, 'blurprecise/materials/masks/blur_mask.png');
assert.deepEqual(Array.from(baseBlurPrecise.scale), [1.17, 1.17]);
assert.equal(baseBlurPrecise.horizontalKernel, 0);
assert.equal(baseBlurPrecise.verticalKernel, 0);
assert.equal(baseBlurPrecise.blurAlpha, false);
assert.equal(blurPreciseEffectGraph.scenes[0].imageLayers[0].hasEffects, false);
assert.equal(blurPreciseEffectGraph.scenes[0].imageLayers[1].textureEffects.length, 0);
assert.equal(blurPreciseEffectGraph.scenes[0].imageLayers[1].hasEffects, true);


const shineEffectEntries = new Map([
  ['shine/scene.json', encodeJson({
    general: { orthogonalprojection: { width: 800, height: 600 } },
    objects: [
      {
        id: 318,
        image: 'models/layer.json',
        origin: '400 300 0',
        size: '400 300',
        effects: [{
          file: 'effects/shine/effect.json',
          visible: true,
          passes: [
            {
              combos: { NOISE: 1 },
              constantshadervalues: {
                raythreshold: 0.42,
                noiseamount: 0.65,
                noisescale: 4.5,
                noisespeed: 0.2,
              },
              textures: [null, 'masks/shine_mask', 'noise/custom_clouds'],
            },
            {
              combos: { EDGES: 3, SAMPLES: 2 },
              constantshadervalues: {
                color: '0.2 0.8 1',
                direction: 0.75,
                rayintensity: 1.25,
                raylength: 0.14,
                speed: 0.3,
              },
            },
            {
              combos: { KERNEL: 0, VERTICAL: 0 },
              constantshadervalues: { scale: '1.2 1.2' },
            },
            {
              combos: { KERNEL: 0, VERTICAL: 1 },
              constantshadervalues: { scale: '1.2 1.2' },
            },
            {
              combos: { BLENDMODE: 9, COPYBG: 0 },
            },
          ],
        }],
      },
      {
        id: 319,
        image: 'models/layer.json',
        origin: '400 300 0',
        size: '400 300',
        effects: [{
          file: 'effects/shine/effect.json',
          visible: true,
          passes: [
            { constantshadervalues: { raythreshold: 0.5 } },
            { constantshadervalues: { direction: 0, rayintensity: 1, raylength: 0.1, speed: 0 } },
            { constantshadervalues: { scale: '1 1' } },
            { combos: { VERTICAL: 1 }, constantshadervalues: { scale: '1 1' } },
            { combos: { BLENDMODE: 33 } },
          ],
        }],
      },
    ],
  })],
  ['shine/models/layer.json', encodeJson({ material: 'materials/layer.json' })],
  ['shine/materials/layer.json', encodeJson({ passes: [{ textures: ['layer'] }] })],
  ['shine/materials/layer.png', Uint8Array.of(1)],
  ['shine/materials/masks/shine_mask.png', Uint8Array.of(2)],
  ['shine/materials/noise/custom_clouds.png', Uint8Array.of(3)],
  ['shine/effects/shine/effect.json', encodeJson({
    replacementkey: 'shine',
    version: 1,
    passes: [{}, {}, {}, {}, {}],
    fbos: [
      { name: '_rt_HalfCompoBuffer1', scale: 2, format: 'rgba_backbuffer' },
      { name: '_rt_HalfCompoBuffer2', scale: 2, format: 'rgba_backbuffer' },
    ],
  })],
]);
const shineEffectGraph = wallpaperEngineGraph.parseWallpaperEngineResourceGraph(shineEffectEntries);
assert.equal(shineEffectGraph.scenes[0].imageLayers.length, 2);
const baseShine = shineEffectGraph.scenes[0].imageLayers[0].textureEffects[0];
assert.equal(baseShine.kind, 'shine');
assert.equal(baseShine.maskPath, 'shine/materials/masks/shine_mask.png');
assert.equal(baseShine.noisePath, 'shine/materials/noise/custom_clouds.png');
assert.equal(baseShine.threshold, 0.42);
assert.equal(baseShine.noiseAmount, 0.65);
assert.equal(baseShine.noiseScale, 4.5);
assert.equal(baseShine.noiseSpeed, 0.2);
assert.deepEqual(Array.from(baseShine.rayColor), [0.2, 0.8, 1]);
assert.equal(baseShine.rayDirection, 0.75);
assert.equal(baseShine.raySpeed, 0.3);
assert.equal(baseShine.rayIntensity, 1.25);
assert.equal(baseShine.rayLength, 0.14);
assert.equal(baseShine.edges, 3);
assert.equal(baseShine.sampleMode, 2);
assert.deepEqual(Array.from(baseShine.blurScale), [1.2, 1.2]);
assert.equal(baseShine.kernel, 0);
assert.equal(baseShine.blendMode, 9);
assert.equal(baseShine.copyBackground, false);
assert.equal(baseShine.noiseEnabled, true);
assert.equal(shineEffectGraph.scenes[0].imageLayers[0].hasEffects, false);
assert.equal(shineEffectGraph.scenes[0].imageLayers[1].textureEffects.length, 0);
assert.equal(shineEffectGraph.scenes[0].imageLayers[1].hasEffects, true);

const textShineEffectEntries = new Map(shineEffectEntries);
textShineEffectEntries.set('shine/scene.json', encodeJson({
  general: { orthogonalprojection: { width: 800, height: 600 } },
  objects: [{
    id: 3200,
    name: 'Effect clock',
    text: '12:34',
    font: 'fonts/Monofur-PK7og.ttf',
    pointsize: 16,
    color: '1 1 1',
    origin: '400 300 0',
    size: '320 100',
    horizontalalign: 'center',
    verticalalign: 'center',
    effects: [{
      file: 'effects/shine/effect.json',
      visible: true,
      passes: [
        {
          combos: { NOISE: 1 },
          constantshadervalues: { raythreshold: 0.42, noiseamount: 0.65, noisescale: 4.5, noisespeed: 0.2 },
          textures: [null, 'masks/shine_mask', 'noise/custom_clouds'],
        },
        {
          combos: { EDGES: 3, SAMPLES: 2 },
          constantshadervalues: { color: '0.2 0.8 1', direction: 0.75, rayintensity: 1.25, raylength: 0.14, speed: 0.3 },
        },
        { combos: { KERNEL: 0, VERTICAL: 0 }, constantshadervalues: { scale: '1.2 1.2' } },
        { combos: { KERNEL: 0, VERTICAL: 1 }, constantshadervalues: { scale: '1.2 1.2' } },
        { combos: { BLENDMODE: 22, COPYBG: 0 } },
      ],
    }],
  }],
}));
const textShineEffectGraph = wallpaperEngineGraph.parseWallpaperEngineResourceGraph(textShineEffectEntries);
assert.equal(textShineEffectGraph.scenes[0].textLayers.length, 1);
assert.equal(textShineEffectGraph.scenes[0].textLayers[0].textureEffects.length, 1);
assert.equal(textShineEffectGraph.scenes[0].textLayers[0].textureEffects[0].kind, 'shine');
assert.equal(textShineEffectGraph.scenes[0].textLayers[0].textureEffects[0].blendMode, 22);
assert.equal(textShineEffectGraph.scenes[0].textLayers[0].hasEffects, false);


const godRaysEffectEntries = new Map([
  ['godrays/scene.json', encodeJson({
    general: { orthogonalprojection: { width: 800, height: 600 } },
    objects: [
      {
        id: 320,
        image: 'models/layer.json',
        origin: '400 300 0',
        size: '400 300',
        effects: [{
          file: 'effects/godrays/effect.json',
          visible: true,
          passes: [
            {
              constantshadervalues: {
                ui_editor_properties_ray_threshold: 0.89,
              },
              textures: [null, 'util/white'],
            },
            {
              constantshadervalues: {
                ui_editor_properties_center: '0.6407873630523682 0.2960065007209778',
                ui_editor_properties_color_end: '0.6745098039215687 0.36470588235294116 0.07450980392156863',
                ui_editor_properties_color_start: '0.30196078431372547 0.054901960784313725 0.054901960784313725',
                ui_editor_properties_ray_intensity: 2,
                ui_editor_properties_ray_length: 0.93,
              },
            },
            {
              constantshadervalues: {
                ui_editor_properties_blur_scale: '1.72 1.72',
              },
            },
            {
              combos: { VERTICAL: 1 },
              constantshadervalues: {
                ui_editor_properties_blur_scale: '1.72 1.72',
              },
            },
            {
              textures: [null, '_rt_imageLayerComposite_320_a'],
            },
          ],
        }],
      },
      {
        id: 321,
        image: 'models/layer.json',
        origin: '400 300 0',
        size: '400 300',
        effects: [{
          file: 'effects/godrays/effect.json',
          visible: true,
          passes: [
            { constantshadervalues: { ui_editor_properties_ray_threshold: 0.4 }, textures: [null, 'masks/rays_mask'] },
            {
              combos: { CASTER: 1, SAMPLES: 2 },
              constantshadervalues: {
                ui_editor_properties_direction: 0.6,
                ui_editor_properties_color_start: '1 0.8 0.6',
                ui_editor_properties_color_end: '0.4 0.2 0.1',
                ui_editor_properties_ray_intensity: 1.2,
                ui_editor_properties_ray_length: 0.5,
              },
            },
            { combos: { KERNEL: 2 }, constantshadervalues: { ui_editor_properties_blur_scale: '1.1 1.1' } },
            { combos: { KERNEL: 2, VERTICAL: 1 }, constantshadervalues: { ui_editor_properties_blur_scale: '1.1 1.1' } },
            { combos: { BLENDMODE: 9 } },
          ],
        }],
      },
      {
        id: 322,
        image: 'models/layer.json',
        origin: '400 300 0',
        size: '400 300',
        effects: [{
          file: 'effects/godrays/effect.json',
          visible: true,
          passes: [
            { constantshadervalues: { ui_editor_properties_ray_threshold: 0.5 }, textures: [null, 'util/white'] },
            { constantshadervalues: { ui_editor_properties_ray_length: 0.5, ui_editor_properties_ray_intensity: 1 } },
            { constantshadervalues: { ui_editor_properties_blur_scale: '1 1' } },
            { combos: { VERTICAL: 1 }, constantshadervalues: { ui_editor_properties_blur_scale: '1 1' } },
            { combos: { BLENDMODE: 33 } },
          ],
        }],
      },
    ],
  })],
  ['godrays/models/layer.json', encodeJson({ material: 'materials/layer.json' })],
  ['godrays/materials/layer.json', encodeJson({ passes: [{ textures: ['layer'] }] })],
  ['godrays/materials/layer.png', Uint8Array.of(1)],
  ['godrays/materials/masks/rays_mask.png', Uint8Array.of(2)],
  ['godrays/effects/godrays/effect.json', encodeJson({
    name: 'ui_editor_effect_godrays_title',
    passes: [
      { material: 'materials/effects/godrays_downsample2.json' },
      { material: 'materials/effects/godrays_cast.json' },
      { material: 'materials/effects/godrays_gaussian_x.json' },
      { material: 'materials/effects/godrays_gaussian_y.json' },
      { material: 'materials/effects/godrays_combine.json' },
    ],
    fbos: [
      { name: '_rt_HalfCompoBuffer1', scale: 2, format: 'rgba8888' },
      { name: '_rt_HalfCompoBuffer2', scale: 2, format: 'rgba8888' },
    ],
  })],
]);
const godRaysEffectGraph = wallpaperEngineGraph.parseWallpaperEngineResourceGraph(godRaysEffectEntries);
assert.equal(godRaysEffectGraph.scenes[0].imageLayers.length, 3);
const radialGodRays = godRaysEffectGraph.scenes[0].imageLayers[0].textureEffects[0];
assert.equal(radialGodRays.kind, 'godRays');
assert.equal(radialGodRays.maskPath, null);
assert.equal(radialGodRays.threshold, 0.89);
assert.equal(radialGodRays.caster.mode, 'radial');
assert.deepEqual(Array.from(radialGodRays.caster.center), [0.6407873630523682, 0.2960065007209778]);
assert.equal(radialGodRays.rayLength, 0.93);
assert.equal(radialGodRays.rayIntensity, 2);
assert.deepEqual(Array.from(radialGodRays.colorStart), [0.30196078431372547, 0.054901960784313725, 0.054901960784313725]);
assert.deepEqual(Array.from(radialGodRays.colorEnd), [0.6745098039215687, 0.36470588235294116, 0.07450980392156863]);
assert.equal(radialGodRays.sampleMode, 0);
assert.deepEqual(Array.from(radialGodRays.blurScale), [1.72, 1.72]);
assert.equal(radialGodRays.kernel, 1);
assert.equal(radialGodRays.blendMode, 9);
assert.equal(godRaysEffectGraph.scenes[0].imageLayers[0].hasEffects, false);
const directionalGodRays = godRaysEffectGraph.scenes[0].imageLayers[1].textureEffects[0];
assert.equal(directionalGodRays.kind, 'godRays');
assert.equal(directionalGodRays.maskPath, 'godrays/materials/masks/rays_mask.png');
assert.equal(directionalGodRays.caster.mode, 'directional');
assert.equal(directionalGodRays.caster.direction, 0.6);
assert.equal(directionalGodRays.sampleMode, 2);
assert.equal(directionalGodRays.kernel, 2);
assert.equal(godRaysEffectGraph.scenes[0].imageLayers[1].hasEffects, false);
assert.equal(godRaysEffectGraph.scenes[0].imageLayers[2].textureEffects.length, 0);
assert.equal(godRaysEffectGraph.scenes[0].imageLayers[2].hasEffects, true);

const waterRippleEffectEntries = new Map([
  ['waterripple/scene.json', encodeJson({
    general: { orthogonalprojection: { width: 800, height: 600 } },
    objects: [
      {
        id: 320,
        image: 'models/layer.json',
        origin: '400 300 0',
        size: '400 300',
        effects: [{
          file: 'effects/waterripple/effect.json',
          visible: true,
          passes: [{
            constantshadervalues: {
              animationspeed: 0.2,
              ratio: 1,
              ripplestrength: 0.1,
              scale: 1,
              scrolldirection: 0.4,
              scrollspeed: 0.05,
            },
            // Exercise descriptor-material fallback for the canonical normal map.
            textures: [null, null, null],
          }],
        }],
      },
      {
        id: 321,
        image: 'models/layer.json',
        origin: '400 300 0',
        size: '400 300',
        effects: [{
          file: 'effects/waterripple/effect.json',
          visible: true,
          passes: [{
            constantshadervalues: {
              animationspeed: 0.05,
              ratio: 1.5,
              ripplestrength: 0.14,
              scale: 0.1,
              scrolldirection: -2,
              scrollspeed: 0.01,
            },
            textures: [null, 'masks/ripple_mask', 'effects/waterripplenormal'],
          }],
        }],
      },
      {
        id: 322,
        image: 'models/layer.json',
        origin: '400 300 0',
        size: '400 300',
        effects: [{
          file: 'effects/waterripple/effect.json',
          visible: true,
          passes: [{
            combos: { PERSPECTIVE: 1 },
            constantshadervalues: {
              point0: '0 0',
              point1: '1 0',
              point2: '1 1',
              point3: '0 1',
            },
            textures: [null, null, 'effects/waterripplenormal'],
          }],
        }],
      },
    ],
  })],
  ['waterripple/models/layer.json', encodeJson({ material: 'materials/layer.json' })],
  ['waterripple/materials/layer.json', encodeJson({ passes: [{ textures: ['layer'] }] })],
  ['waterripple/materials/layer.png', Uint8Array.of(1)],
  ['waterripple/materials/masks/ripple_mask.png', Uint8Array.of(2)],
  ['waterripple/materials/effects/waterripplenormal.png', Uint8Array.of(3)],
  ['waterripple/materials/effects/waterripple.json', encodeJson({
    passes: [{ textures: [null, null, 'effects/waterripplenormal'] }],
  })],
  ['waterripple/effects/waterripple/effect.json', encodeJson({
    version: 1,
    replacementkey: 'waterripple',
    passes: [{ material: 'materials/effects/waterripple.json' }],
  })],
]);
const waterRippleEffectGraph = wallpaperEngineGraph.parseWallpaperEngineResourceGraph(waterRippleEffectEntries);
assert.equal(waterRippleEffectGraph.scenes[0].imageLayers.length, 3);
const baseWaterRipple = waterRippleEffectGraph.scenes[0].imageLayers[0].textureEffects[0];
assert.equal(baseWaterRipple.kind, 'waterRipple');
assert.equal(baseWaterRipple.maskPath, null);
assert.equal(baseWaterRipple.normalPath, 'waterripple/materials/effects/waterripplenormal.png');
assert.equal(baseWaterRipple.animationSpeed, 0.2);
assert.equal(baseWaterRipple.scale, 1);
assert.equal(baseWaterRipple.scrollSpeed, 0.05);
assert.equal(baseWaterRipple.direction, 0.4);
assert.equal(baseWaterRipple.ratio, 1);
assert.equal(baseWaterRipple.strength, 0.1);
assert.equal(waterRippleEffectGraph.scenes[0].imageLayers[0].hasEffects, false);
const maskedWaterRipple = waterRippleEffectGraph.scenes[0].imageLayers[1].textureEffects[0];
assert.equal(maskedWaterRipple.kind, 'waterRipple');
assert.equal(maskedWaterRipple.maskPath, 'waterripple/materials/masks/ripple_mask.png');
assert.equal(maskedWaterRipple.normalPath, 'waterripple/materials/effects/waterripplenormal.png');
assert.equal(maskedWaterRipple.ratio, 1.5);
assert.equal(maskedWaterRipple.strength, 0.14);
assert.equal(waterRippleEffectGraph.scenes[0].imageLayers[1].hasEffects, false);
assert.equal(waterRippleEffectGraph.scenes[0].imageLayers[2].textureEffects.length, 0);
assert.equal(waterRippleEffectGraph.scenes[0].imageLayers[2].hasEffects, true);

const wallpaperEngineEffectIr = loadTsModule('features/theme/utils/wallpaperEngineEffectIr.ts');
assert.equal(wallpaperEngineEffectIr.canonicalWallpaperEngineEffectKey('foliage_sway'), 'foliagesway');
assert.equal(wallpaperEngineEffectIr.canonicalWallpaperEngineEffectKey('water_flow'), 'waterflow');
assert.equal(wallpaperEngineEffectIr.canonicalWallpaperEngineEffectParameterKey('ui_editor_properties_speed_x'), 'speedx');
assert.equal(wallpaperEngineEffectIr.canonicalWallpaperEngineEffectParameterKey('speedx'), 'speedx');

const genericEffectIrEntries = new Map([
  ['effect-ir/scene.json', encodeJson({
    general: { orthogonalprojection: { width: 800, height: 600 } },
    objects: [{
      id: 19,
      image: 'models/layer.json',
      origin: '400 300 0',
      size: '400 300',
      effects: [{
        file: 'effects/foliagesway/effect.json',
        visible: true,
        passes: [{
          combos: { MODE: 1 },
          constantshadervalues: {
            strength: { value: 0.5, animation: { options: { fps: 30 } }, script: 'export function update() {}' },
            scale: '1 2',
          },
          textures: [null, 'masks/leaf_mask'],
        }],
      }],
    }],
  })],
  ['effect-ir/models/layer.json', encodeJson({ material: 'materials/layer.json' })],
  ['effect-ir/materials/layer.json', encodeJson({ passes: [{ textures: ['layer'] }] })],
  ['effect-ir/materials/layer.png', Uint8Array.of(1)],
  ['effect-ir/effects/foliagesway/effect.json', encodeJson({
    name: 'ui_editor_effect_foliage_sway_title',
    passes: [{ material: 'materials/effects/foliagesway.json' }],
  })],
]);
const genericEffectIrGraph = wallpaperEngineGraph.parseWallpaperEngineResourceGraph(genericEffectIrEntries);
const genericEffectIrLayer = genericEffectIrGraph.scenes[0].imageLayers[0];
assert.equal(genericEffectIrLayer.effectChain.length, 1);
assert.equal(genericEffectIrLayer.effectChain[0].key, 'foliagesway');
assert.equal(genericEffectIrLayer.effectChain[0].sourceKey, 'foliage_sway');
assert.equal(genericEffectIrLayer.effectChain[0].descriptorVersion, null);
assert.equal(genericEffectIrLayer.effectChain[0].passes[0].materialReference, 'materials/effects/foliagesway.json');
assert.equal(genericEffectIrLayer.effectChain[0].passes[0].combos.MODE, 1);
assert.equal(genericEffectIrLayer.effectChain[0].passes[0].constants.strength.value, 0.5);
assert.equal(genericEffectIrLayer.effectChain[0].passes[0].constants.strength.hasAnimation, true);
assert.equal(genericEffectIrLayer.effectChain[0].passes[0].constants.strength.hasScript, true);
assert.equal(genericEffectIrLayer.effectChain[0].passes[0].constants.scale.value, '1 2');
assert.deepEqual(Array.from(genericEffectIrLayer.effectChain[0].passes[0].textures), [null, 'masks/leaf_mask']);
assert.equal(genericEffectIrLayer.hasEffects, true);

const compositionEntries = new Map([
  ['composition/scene.json', encodeJson({
    general: { orthogonalprojection: { width: 800, height: 600 } },
    objects: [
      { id: 21, image: 'models/base.json', origin: '400 300 0', size: '400 200', visible: false },
      { id: 22, image: 'models/mask.json', origin: '400 300 0', size: '200 200', visible: false },
      {
        id: 23,
        image: 'models/util/composelayer.json',
        origin: '400 300 0',
        size: '200 200',
        effects: [
          { file: 'effects/tint.json', visible: true, passes: [{ combos: { BLENDMODE: 0 }, constantshadervalues: { color: '0 0 0', alpha: 1 } }] },
          { file: 'effects/blend.json', visible: true, passes: [{ combos: { BLENDMODE: 0 }, constantshadervalues: { multiply: 1.5 }, textures: [null, '_rt_imageLayerComposite_21_a', '_rt_imageLayerComposite_22_a'] }] },
          { file: 'effects/blend.json', visible: true, passes: [{ combos: { BLENDMODE: 7 }, constantshadervalues: { multiply: 0.5 }, textures: [null, '_rt_imageLayerComposite_21_a'] }] },
          { file: 'effects/transform.json', visible: true, passes: [{ constantshadervalues: { offset: '0.1 -0.2', scale: '0.5 1', angle: 0.25 } }] },
          { file: 'effects/fisheye.json', visible: true, passes: [{ constantshadervalues: { center: '0.5 0.4', distortion: 0.6, size: 0.9 } }] },
          { file: 'effects/opacity.json', visible: true, passes: [{ constantshadervalues: { alpha: 0.8 }, textures: [null, '_rt_imageLayerComposite_22_a'] }] },
        ],
      },
    ],
  })],
  ['composition/models/base.json', encodeJson({ material: 'materials/base.json' })],
  ['composition/materials/base.json', encodeJson({ passes: [{ textures: ['base'] }] })],
  ['composition/materials/base.png', Uint8Array.of(1)],
  ['composition/models/mask.json', encodeJson({ material: 'materials/mask.json' })],
  ['composition/materials/mask.json', encodeJson({ passes: [{ textures: ['mask'] }] })],
  ['composition/materials/mask.png', Uint8Array.of(2)],
  ['composition/effects/tint.json', encodeJson({ name: 'ui_editor_effect_tint_title', dependencies: ['shaders/effects/tint.frag'] })],
  ['composition/effects/blend.json', encodeJson({ name: 'ui_editor_effect_blend_title', dependencies: ['shaders/effects/blend.frag'] })],
  ['composition/effects/transform.json', encodeJson({ name: 'ui_editor_effect_transform_title', dependencies: ['shaders/effects/transform.vert'] })],
  ['composition/effects/fisheye.json', encodeJson({ name: 'ui_editor_effect_fisheye_title', dependencies: ['shaders/effects/fisheye.frag'] })],
  ['composition/effects/opacity.json', encodeJson({ replacementkey: 'opacity' })],
]);
const compositionGraph = wallpaperEngineGraph.parseWallpaperEngineResourceGraph(compositionEntries);
assert.equal(compositionGraph.scenes[0].compositionLayers.length, 1);
const compositionGraphLayer = compositionGraph.scenes[0].compositionLayers[0];
assert.deepEqual(Array.from(compositionGraphLayer.effects).map((effect) => effect.kind), ['tint', 'blend', 'transform', 'fisheye', 'opacity']);
assert.equal(compositionGraphLayer.effects[1].texturePath, 'composition/materials/base.png');
assert.equal(compositionGraphLayer.effects[1].maskPath, 'composition/materials/mask.png');
assert.equal(compositionGraphLayer.hasEffects, true);

const wallpaperEngineCapabilities = loadTsModule('features/theme/utils/wallpaperEngineCapabilityAnalyzer.ts', {
  TextDecoder,
});
const wrappedCapabilityReport = wallpaperEngineCapabilities.analyzeWallpaperEngineCapabilities(
  wrappedPropertyEntries,
  wrappedPropertyGraph,
);
assert.equal(wrappedCapabilityReport.totals.sceneCount, 1);
assert.equal(wrappedCapabilityReport.totals.layerKinds.image, 1);
assert.equal(wrappedCapabilityReport.totals.scripts.total, 2);
assert.equal(wrappedCapabilityReport.totals.layerBlendModes.length, 1);
assert.equal(wrappedCapabilityReport.totals.layerBlendModes[0].mode, 4);
assert.equal(wrappedCapabilityReport.totals.layerBlendModes[0].support, 'unsupported');
assert.equal(wrappedCapabilityReport.totals.layerBlendModes[0].count, 1);

const waterWavesCapabilityReport = wallpaperEngineCapabilities.analyzeWallpaperEngineCapabilities(
  waterWavesEffectEntries,
  waterWavesEffectGraph,
);
const waterWavesCapability = waterWavesCapabilityReport.totals.effects.find((effect) => effect.key === 'waterwaves');
assert.equal(waterWavesCapability?.support, 'partial');
assert.equal(waterWavesCapability?.effectCount, 1);
assert.equal(waterWavesCapability?.passCount, 1);
assert.equal(waterWavesCapability?.supportedPassCount, 1);
assert.equal(waterWavesCapability?.unsupportedPassCount, 0);

const scrollCapabilityReport = wallpaperEngineCapabilities.analyzeWallpaperEngineCapabilities(
  scrollEffectEntries,
  scrollEffectGraph,
);
const scrollCapability = scrollCapabilityReport.totals.effects.find((effect) => effect.key === 'scroll');
assert.equal(scrollCapability?.support, 'supported');
assert.equal(scrollCapability?.effectCount, 2);
assert.equal(scrollCapability?.passCount, 2);
assert.equal(scrollCapability?.supportedPassCount, 2);
assert.equal(scrollCapability?.unsupportedPassCount, 0);

const transformCapabilityReport = wallpaperEngineCapabilities.analyzeWallpaperEngineCapabilities(
  transformEffectEntries,
  transformEffectGraph,
);
const transformCapability = transformCapabilityReport.totals.effects.find((effect) => effect.key === 'transform');
assert.equal(transformCapability?.support, 'partial');
assert.equal(transformCapability?.effectCount, 2);
assert.equal(transformCapability?.passCount, 2);
assert.equal(transformCapability?.supportedPassCount, 1);
assert.equal(transformCapability?.unsupportedPassCount, 1);

const spinCapabilityReport = wallpaperEngineCapabilities.analyzeWallpaperEngineCapabilities(
  spinEffectEntries,
  spinEffectGraph,
);
const spinCapability = spinCapabilityReport.totals.effects.find((effect) => effect.key === 'spin');
assert.equal(spinCapability?.support, 'partial');
assert.equal(spinCapability?.effectCount, 2);
assert.equal(spinCapability?.passCount, 2);
assert.equal(spinCapability?.supportedPassCount, 1);
assert.equal(spinCapability?.unsupportedPassCount, 1);
const legacySpinCapabilityReport = wallpaperEngineCapabilities.analyzeWallpaperEngineCapabilities(
  legacySpinEffectEntries,
  legacySpinEffectGraph,
);
const legacySpinCapability = legacySpinCapabilityReport.totals.effects.find((effect) => effect.key === 'spin');
assert.equal(legacySpinCapability?.support, 'partial');
assert.equal(legacySpinCapability?.supportedPassCount, 1);
assert.equal(legacySpinCapability?.unsupportedPassCount, 0);

const perspectiveCapabilityReport = wallpaperEngineCapabilities.analyzeWallpaperEngineCapabilities(
  perspectiveEffectEntries,
  perspectiveEffectGraph,
);
const perspectiveCapability = perspectiveCapabilityReport.totals.effects.find((effect) => effect.key === 'perspective');
assert.equal(perspectiveCapability?.support, 'partial');
assert.equal(perspectiveCapability?.effectCount, 1);
assert.equal(perspectiveCapability?.passCount, 1);
assert.equal(perspectiveCapability?.supportedPassCount, 1);
assert.equal(perspectiveCapability?.unsupportedPassCount, 0);

const foliageSwayCapabilityReport = wallpaperEngineCapabilities.analyzeWallpaperEngineCapabilities(
  foliageSwayEffectEntries,
  foliageSwayEffectGraph,
);
const foliageSwayCapability = foliageSwayCapabilityReport.totals.effects.find((effect) => effect.key === 'foliagesway');
assert.equal(foliageSwayCapability?.support, 'partial');
assert.equal(foliageSwayCapability?.effectCount, 3);
assert.equal(foliageSwayCapability?.passCount, 3);
assert.equal(foliageSwayCapability?.supportedPassCount, 2);
assert.equal(foliageSwayCapability?.unsupportedPassCount, 1);


const waterFlowCapabilityReport = wallpaperEngineCapabilities.analyzeWallpaperEngineCapabilities(
  waterFlowEffectEntries,
  waterFlowEffectGraph,
);
const waterFlowCapability = waterFlowCapabilityReport.totals.effects.find((effect) => effect.key === 'waterflow');
assert.equal(waterFlowCapability?.support, 'partial');
assert.equal(waterFlowCapability?.effectCount, 3);
assert.equal(waterFlowCapability?.passCount, 3);
assert.equal(waterFlowCapability?.supportedPassCount, 3);
assert.equal(waterFlowCapability?.unsupportedPassCount, 0);

const shakeCapabilityReport = wallpaperEngineCapabilities.analyzeWallpaperEngineCapabilities(
  shakeEffectEntries,
  shakeEffectGraph,
);
const shakeCapability = shakeCapabilityReport.totals.effects.find((effect) => effect.key === 'shake');
assert.equal(shakeCapability?.support, 'partial');
assert.equal(shakeCapability?.effectCount, 3);
assert.equal(shakeCapability?.passCount, 3);
assert.equal(shakeCapability?.supportedPassCount, 2);
assert.equal(shakeCapability?.unsupportedPassCount, 1);

const blurPreciseCapabilityReport = wallpaperEngineCapabilities.analyzeWallpaperEngineCapabilities(
  blurPreciseEffectEntries,
  blurPreciseEffectGraph,
);
const blurPreciseCapability = blurPreciseCapabilityReport.totals.effects.find((effect) => effect.key === 'blurprecise');
assert.equal(blurPreciseCapability?.support, 'partial');
assert.equal(blurPreciseCapability?.effectCount, 2);
assert.equal(blurPreciseCapability?.passCount, 4);
assert.equal(blurPreciseCapability?.supportedPassCount, 2);
assert.equal(blurPreciseCapability?.unsupportedPassCount, 2);

const shineCapabilityReport = wallpaperEngineCapabilities.analyzeWallpaperEngineCapabilities(
  shineEffectEntries,
  shineEffectGraph,
);
const shineCapability = shineCapabilityReport.totals.effects.find((effect) => effect.key === 'shine');
assert.equal(shineCapability?.support, 'partial');
assert.equal(shineCapability?.effectCount, 2);
assert.equal(shineCapability?.passCount, 10);
assert.equal(shineCapability?.supportedPassCount, 9);
assert.equal(shineCapability?.unsupportedPassCount, 1);

const textShineCapabilityReport = wallpaperEngineCapabilities.analyzeWallpaperEngineCapabilities(
  textShineEffectEntries,
  textShineEffectGraph,
);
const textShineCapability = textShineCapabilityReport.totals.effects.find((effect) => effect.key === 'shine');
assert.equal(textShineCapability?.support, 'partial');
assert.equal(textShineCapability?.effectCount, 1);
assert.equal(textShineCapability?.passCount, 5);
assert.equal(textShineCapability?.supportedPassCount, 5);
assert.equal(textShineCapability?.unsupportedPassCount, 0);

const godRaysCapabilityReport = wallpaperEngineCapabilities.analyzeWallpaperEngineCapabilities(
  godRaysEffectEntries,
  godRaysEffectGraph,
);
const godRaysCapability = godRaysCapabilityReport.totals.effects.find((effect) => effect.key === 'godrays');
assert.equal(godRaysCapability?.support, 'partial');
assert.equal(godRaysCapability?.effectCount, 3);
assert.equal(godRaysCapability?.passCount, 15);
assert.equal(godRaysCapability?.supportedPassCount, 14);
assert.equal(godRaysCapability?.unsupportedPassCount, 1);

const waterRippleCapabilityReport = wallpaperEngineCapabilities.analyzeWallpaperEngineCapabilities(
  waterRippleEffectEntries,
  waterRippleEffectGraph,
);
const waterRippleCapability = waterRippleCapabilityReport.totals.effects.find((effect) => effect.key === 'waterripple');
assert.equal(waterRippleCapability?.support, 'partial');
assert.equal(waterRippleCapability?.effectCount, 3);
assert.equal(waterRippleCapability?.passCount, 3);
assert.equal(waterRippleCapability?.supportedPassCount, 2);
assert.equal(waterRippleCapability?.unsupportedPassCount, 1);

const genericEffectCapabilityReport = wallpaperEngineCapabilities.analyzeWallpaperEngineCapabilities(
  genericEffectIrEntries,
  genericEffectIrGraph,
);
assert.equal(genericEffectCapabilityReport.totals.effects[0].key, 'foliagesway');
assert.equal(genericEffectCapabilityReport.totals.effects[0].support, 'partial');
assert.equal(genericEffectCapabilityReport.totals.effects[0].supportedPassCount, 0);
assert.equal(genericEffectCapabilityReport.totals.effects[0].unsupportedPassCount, 1);

const compositionCapabilityReport = wallpaperEngineCapabilities.analyzeWallpaperEngineCapabilities(
  compositionEntries,
  compositionGraph,
);
const compositionCapabilities = new Map(compositionCapabilityReport.totals.effects.map((effect) => [effect.key, effect]));
assert.equal(compositionCapabilities.get('tint')?.support, 'partial');
assert.equal(compositionCapabilities.get('blend')?.effectCount, 2);
assert.equal(compositionCapabilities.get('blend')?.supportedPassCount, 1);
assert.equal(compositionCapabilities.get('blend')?.unsupportedPassCount, 1);
assert.equal(compositionCapabilities.get('transform')?.support, 'partial');
assert.equal(compositionCapabilities.get('fisheye')?.support, 'supported');
assert.equal(compositionCapabilities.get('opacity')?.support, 'supported');
assert.match(
  wallpaperEngineCapabilities.formatWallpaperEngineCapabilityReport(compositionCapabilityReport),
  /effects:/,
);

const parentTransformEntries = new Map([
  ['parent/scene.json', encodeJson({
    general: { orthogonalprojection: { width: 2000, height: 1200 } },
    objects: [
      {
        id: 100,
        origin: '1000 600 0',
        scale: '2 3 1',
        angles: `0 0 ${Math.PI / 2}`,
        alpha: 0.5,
        visible: true,
        parallaxDepth: '0.1 0.2',
      },
      {
        id: 101,
        parent: 100,
        image: 'models/child.json',
        origin: '100 50 0',
        scale: '0.5 0.25 1',
        angles: '0 0 0.25',
        alpha: 0.4,
        visible: true,
        parallaxDepth: '0.05 -0.1',
      },
    ],
  })],
  ['parent/models/child.json', encodeJson({ material: 'materials/child.json' })],
  ['parent/materials/child.json', encodeJson({ passes: [{ textures: ['child'] }] })],
  ['parent/materials/child.png', Uint8Array.of(1)],
]);
const parentTransformGraph = wallpaperEngineGraph.parseWallpaperEngineResourceGraph(parentTransformEntries);
const parentedLayer = parentTransformGraph.scenes[0].imageLayers[0];
// Reflect WE's Y-up transform into the browser's Y-down stage: local Y and Z rotation both reverse.
assert.ok(Math.abs(parentedLayer.transform.origin[0] - 850) < 1e-9);
assert.ok(Math.abs(parentedLayer.transform.origin[1] - 400) < 1e-9);
assert.deepEqual(Array.from(parentedLayer.transform.scale), [1, 0.75, 1]);
assert.ok(Math.abs(parentedLayer.transform.angles[2] - (-Math.PI / 2 - 0.25)) < 1e-9);
assert.ok(Math.abs(parentedLayer.transform.opacity - 0.2) < 1e-9);
assert.deepEqual(Array.from(parentedLayer.transform.parallaxDepth), [0.15000000000000002, 0.1]);

const alignmentEntries = new Map([
  ['alignment/scene.json', encodeJson({
    general: { orthogonalprojection: { width: 3440, height: 1440 } },
    objects: [
      {
        id: 301,
        image: 'models/top.json',
        origin: '1720 1440 0',
        size: '3108 1024',
        alignment: 'top',
      },
      {
        id: 302,
        image: 'models/bottom-left.json',
        origin: '0 0 0',
        size: '800 800',
        scale: '4.31 2.5 1',
        alignment: 'bottomleft',
      },
    ],
  })],
  ['alignment/models/top.json', encodeJson({ material: 'materials/top.json' })],
  ['alignment/materials/top.json', encodeJson({ passes: [{ textures: ['top'] }] })],
  ['alignment/materials/top.png', Uint8Array.of(1)],
  ['alignment/models/bottom-left.json', encodeJson({ material: 'materials/bottom-left.json' })],
  ['alignment/materials/bottom-left.json', encodeJson({ passes: [{ textures: ['bottom-left'] }] })],
  ['alignment/materials/bottom-left.png', Uint8Array.of(2)],
]);
const alignmentGraph = wallpaperEngineGraph.parseWallpaperEngineResourceGraph(alignmentEntries);
assert.equal(alignmentGraph.scenes[0].imageLayers[0].transform.alignment, 'top');
assert.equal(alignmentGraph.scenes[0].imageLayers[1].transform.alignment, 'bottomleft');
assert.deepEqual(Array.from(alignmentGraph.scenes[0].imageLayers[0].transform.origin), [1720, 0, 0]);
assert.deepEqual(Array.from(alignmentGraph.scenes[0].imageLayers[1].transform.origin), [0, 1440, 0]);

const propertyAnimationEntries = new Map([
  ['property-animation/scene.json', encodeJson({
    general: { orthogonalprojection: { width: 2000, height: 1200 } },
    objects: [
      {
        id: 200,
        origin: {
          value: '1000 600 0',
          animation: {
            relative: true,
            options: { fps: 10, length: 20, mode: 'loop' },
            c0: [{ frame: 0, value: 0 }, { frame: 20, value: 40 }],
            c1: [{ frame: 0, value: 0 }, { frame: 20, value: -20 }],
          },
        },
        scale: '2 3 1',
        angles: `0 0 ${Math.PI / 2}`,
      },
      {
        id: 201,
        parent: 200,
        image: 'models/child.json',
        origin: {
          value: '100 50 0',
          animation: {
            relative: true,
            options: { fps: 10, length: 10, mode: 'single' },
            c0: [{ frame: 0, value: 10 }, { frame: 10, value: 20 }],
            c1: [{ frame: 0, value: 20 }, { frame: 10, value: 40 }],
          },
        },
        size: '100 100',
      },
    ],
  })],
  ['property-animation/models/child.json', encodeJson({ material: 'materials/child.json' })],
  ['property-animation/materials/child.json', encodeJson({ passes: [{ textures: ['child'] }] })],
  ['property-animation/materials/child.png', Uint8Array.of(1)],
]);
const propertyAnimationGraph = wallpaperEngineGraph.parseWallpaperEngineResourceGraph(propertyAnimationEntries);
const animatedGraphLayer = propertyAnimationGraph.scenes[0].imageLayers[0];
assert.equal(animatedGraphLayer.centerAnimations.length, 2);
assert.deepEqual(
  Array.from(animatedGraphLayer.centerAnimations, (animation) => animation.mode),
  ['loop', 'single'],
);
assert.deepEqual(
  Array.from(animatedGraphLayer.centerAnimations[0].x, (keyframe) => keyframe.value),
  [0, 40],
);
// Root/world origin animation Y uses WE's Y-up axis and must be converted to browser Y-down.
assert.deepEqual(
  Array.from(animatedGraphLayer.centerAnimations[0].y, (keyframe) => keyframe.value),
  [0, 20],
);
// Child-local animation offsets use the same inverted-Y parent transform.
assert.ok(Math.abs(animatedGraphLayer.centerAnimations[1].x[0].value - (-60)) < 1e-9);
assert.ok(Math.abs(animatedGraphLayer.centerAnimations[1].y[0].value - (-20)) < 1e-9);
assert.ok(Math.abs(animatedGraphLayer.centerAnimations[1].x[1].value - (-120)) < 1e-9);
assert.ok(Math.abs(animatedGraphLayer.centerAnimations[1].y[1].value - (-40)) < 1e-9);

const wallpaperEngineConverter = loadTsModule('features/theme/utils/wallpaperEngineSceneConverter.ts', {
  TextDecoder,
  DataView,
});
const makePngHeader = (width, height) => {
  const bytes = new Uint8Array(24);
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
  const view = new DataView(bytes.buffer);
  view.setUint32(16, width, false);
  view.setUint32(20, height, false);
  return bytes;
};
const screenBlendEntries = new Map([
  ['screen-blend/scene.json', encodeJson({
    general: { orthogonalprojection: { width: 100, height: 100 } },
    objects: [{
      id: 77,
      name: 'opaque black glow atlas',
      image: 'models/glow.json',
      origin: '50 50 0',
      size: '100 100',
      colorBlendMode: 7,
    }],
  })],
  ['screen-blend/models/glow.json', encodeJson({ material: 'materials/glow.json' })],
  ['screen-blend/materials/glow.json', encodeJson({ passes: [{ textures: ['glow'] }] })],
  ['screen-blend/materials/glow.png', makePngHeader(100, 100)],
]);
const screenBlendGraph = wallpaperEngineGraph.parseWallpaperEngineResourceGraph(screenBlendEntries);
const screenBlendArchive = wallpaperEngineConverter.convertWallpaperEngineResourceGraph(screenBlendEntries, screenBlendGraph);
assert.equal(screenBlendArchive.scenes[0].layers[0].blendMode, 'screen');

const makePuppetMdl = () => {
  const vertexCount = 3;
  const vertexStride = 80;
  const markerOffset = 16;
  const vertexBytes = vertexCount * vertexStride;
  const indexBytes = 6;
  const bytes = new Uint8Array(markerOffset + 8 + vertexBytes + 4 + indexBytes);
  bytes.set(new TextEncoder().encode('MDLV0023'), 0);
  const view = new DataView(bytes.buffer);
  view.setUint32(markerOffset, 0x0180000f, true);
  view.setUint32(markerOffset + 4, vertexBytes, true);
  const vertices = [
    [-10, -5, 0, 1],
    [10, -5, 1, 1],
    [0, 15, 0.5, 0],
  ];
  vertices.forEach(([x, y, u, v], index) => {
    const offset = markerOffset + 8 + index * vertexStride;
    view.setFloat32(offset, x, true);
    view.setFloat32(offset + 4, y, true);
    view.setFloat32(offset + 72, u, true);
    view.setFloat32(offset + 76, v, true);
  });
  const indexLengthOffset = markerOffset + 8 + vertexBytes;
  view.setUint32(indexLengthOffset, indexBytes, true);
  view.setUint16(indexLengthOffset + 4, 0, true);
  view.setUint16(indexLengthOffset + 6, 1, true);
  view.setUint16(indexLengthOffset + 8, 2, true);
  return bytes;
};

const makeAnimatedPuppetMdl = () => {
  const vertexCount = 3;
  const vertexStride = 80;
  const markerOffset = 16;
  const vertexBytes = vertexCount * vertexStride;
  const indexBytes = 6;
  const geometryEnd = markerOffset + 8 + vertexBytes + 4 + indexBytes;
  const skeletonBytes = 9 + 8 + (1 + 4 + 4 + 4 + 64 + 1);
  const animationOffset = geometryEnd + skeletonBytes;
  const animationRecordBytes = 8 + 5 + 5 + 16 + 8 + 72 + 35;
  const animationEnd = animationOffset + 9 + 8 + animationRecordBytes;
  const bytes = new Uint8Array(animationEnd);
  const encoder = new TextEncoder();
  bytes.set(encoder.encode('MDLV0023'), 0);
  const view = new DataView(bytes.buffer);
  view.setUint32(markerOffset, 0x0180000f, true);
  view.setUint32(markerOffset + 4, vertexBytes, true);
  const vertices = [
    [-10, -5, 0, 1],
    [10, -5, 1, 1],
    [0, 15, 0.5, 0],
  ];
  vertices.forEach(([x, y, u, v], index) => {
    const offset = markerOffset + 8 + index * vertexStride;
    view.setFloat32(offset, x, true);
    view.setFloat32(offset + 4, y, true);
    view.setUint32(offset + 40, 0, true);
    view.setFloat32(offset + 56, 1, true);
    view.setFloat32(offset + 72, u, true);
    view.setFloat32(offset + 76, v, true);
  });
  const indexLengthOffset = markerOffset + 8 + vertexBytes;
  view.setUint32(indexLengthOffset, indexBytes, true);
  view.setUint16(indexLengthOffset + 4, 0, true);
  view.setUint16(indexLengthOffset + 6, 1, true);
  view.setUint16(indexLengthOffset + 8, 2, true);

  let cursor = geometryEnd;
  bytes.set(encoder.encode('MDLS0004\0'), cursor);
  cursor += 9;
  view.setUint32(cursor, animationOffset, true);
  cursor += 4;
  view.setUint32(cursor, 1, true);
  cursor += 4;
  bytes[cursor] = 0;
  cursor += 1;
  view.setUint32(cursor, 1, true);
  cursor += 4;
  view.setUint32(cursor, 0xffffffff, true);
  cursor += 4;
  view.setUint32(cursor, 64, true);
  cursor += 4;
  const identity = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
  identity.forEach((value, index) => view.setFloat32(cursor + index * 4, value, true));
  cursor += 64;
  bytes[cursor] = 0;
  cursor += 1;
  assert.equal(cursor, animationOffset);

  bytes.set(encoder.encode('MDLA0006\0'), cursor);
  cursor += 9;
  view.setUint32(cursor, animationEnd, true);
  cursor += 4;
  view.setUint32(cursor, 1, true);
  cursor += 4;
  view.setUint32(cursor, 77, true);
  cursor += 4;
  view.setUint32(cursor, 0, true);
  cursor += 4;
  bytes.set(encoder.encode('move\0'), cursor);
  cursor += 5;
  bytes.set(encoder.encode('loop\0'), cursor);
  cursor += 5;
  view.setFloat32(cursor, 1, true);
  cursor += 4;
  view.setUint32(cursor, 1, true);
  cursor += 4;
  view.setUint32(cursor, 0, true);
  cursor += 4;
  view.setUint32(cursor, 1, true);
  cursor += 4;
  view.setUint32(cursor, 0, true);
  cursor += 4;
  view.setUint32(cursor, 72, true);
  cursor += 4;
  const samples = [
    0, 0, 0, 0, 0, 0, 1, 1, 1,
    10, 0, 0, 0, 0, 0, 1, 1, 1,
  ];
  samples.forEach((value, index) => view.setFloat32(cursor + index * 4, value, true));
  cursor += 72;
  cursor += 35;
  assert.equal(cursor, animationEnd);
  return bytes;
};

const makeMdatWrappedAnimatedPuppetMdl = () => {
  const source = makeAnimatedPuppetMdl();
  const encoder = new TextEncoder();
  const mdlaMagic = encoder.encode('MDLA0006\0');
  let mdlaOffset = -1;
  for (let offset = 0; offset <= source.length - mdlaMagic.length; offset += 1) {
    let matches = true;
    for (let index = 0; index < mdlaMagic.length; index += 1) {
      if (source[offset + index] !== mdlaMagic[index]) {
        matches = false;
        break;
      }
    }
    if (matches) {
      mdlaOffset = offset;
      break;
    }
  }
  assert.ok(mdlaOffset > 0);

  // MDAT0001: tag + nested offset + u16 count +
  // {u16 bone, C-string name, column-major mat4}.
  const attachmentName = encoder.encode('slot\0');
  const wrapperBytes = 9 + 4 + 2 + 2 + attachmentName.length + 64;
  const bytes = new Uint8Array(source.length + wrapperBytes);
  bytes.set(source.subarray(0, mdlaOffset), 0);
  bytes.set(encoder.encode('MDAT0001\0'), mdlaOffset);
  bytes.set(source.subarray(mdlaOffset), mdlaOffset + wrapperBytes);
  const view = new DataView(bytes.buffer);
  const nestedMdlaOffset = mdlaOffset + wrapperBytes;
  let cursor = mdlaOffset + 9;
  view.setUint32(cursor, nestedMdlaOffset, true);
  cursor += 4;
  view.setUint16(cursor, 1, true);
  cursor += 2;
  view.setUint16(cursor, 0, true);
  cursor += 2;
  bytes.set(attachmentName, cursor);
  cursor += attachmentName.length;
  const attachmentMatrix = [
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    2, 3, 0, 1,
  ];
  attachmentMatrix.forEach((value, index) => view.setFloat32(cursor + index * 4, value, true));
  cursor += 64;
  assert.equal(cursor, nestedMdlaOffset);

  const skeletonOffset = (() => {
    const magic = encoder.encode('MDLS0004\0');
    for (let offset = 0; offset <= bytes.length - magic.length; offset += 1) {
      let matches = true;
      for (let index = 0; index < magic.length; index += 1) {
        if (bytes[offset + index] !== magic[index]) {
          matches = false;
          break;
        }
      }
      if (matches) return offset;
    }
    return -1;
  })();
  assert.ok(skeletonOffset > 0);
  view.setUint32(skeletonOffset + 9, mdlaOffset, true);
  const oldAnimationEnd = new DataView(source.buffer, source.byteOffset, source.byteLength)
    .getUint32(mdlaOffset + 9, true);
  view.setUint32(nestedMdlaOffset + 9, oldAnimationEnd + wrapperBytes, true);
  return bytes;
};

const wallpaperEnginePuppetModel = loadTsModule('features/theme/utils/wallpaperEnginePuppetModel.ts');
const syntheticPuppetMesh = wallpaperEnginePuppetModel.parseWallpaperEnginePuppetMesh(makePuppetMdl());
assert.ok(syntheticPuppetMesh);
assert.deepEqual(Array.from(syntheticPuppetMesh.positions), [-10, -5, 10, -5, 0, 15]);
assert.deepEqual(Array.from(syntheticPuppetMesh.positions3d), [-10, -5, 0, 10, -5, 0, 0, 15, 0]);
assert.deepEqual(Array.from(syntheticPuppetMesh.indices), [0, 1, 2]);
assert.deepEqual({ ...syntheticPuppetMesh.bounds }, { minX: -10, minY: -5, maxX: 10, maxY: 15 });

const wallpaperEnginePuppetAnimation = loadTsModule('features/theme/utils/wallpaperEnginePuppetAnimation.ts');
const syntheticAnimatedPuppet = wallpaperEnginePuppetModel.parseWallpaperEnginePuppetModel(makeAnimatedPuppetMdl());
assert.ok(syntheticAnimatedPuppet);
const syntheticMdatWrappedPuppet = wallpaperEnginePuppetModel.parseWallpaperEnginePuppetModel(
  makeMdatWrappedAnimatedPuppetMdl(),
);
assert.ok(syntheticMdatWrappedPuppet);
assert.deepEqual(Array.from(syntheticMdatWrappedPuppet.animations, (animation) => animation.id), [77]);
assert.equal(syntheticMdatWrappedPuppet.attachments.length, 1);
assert.equal(syntheticMdatWrappedPuppet.attachments[0].name, 'slot');
assert.equal(syntheticMdatWrappedPuppet.attachments[0].boneIndex, 0);
assert.equal(syntheticMdatWrappedPuppet.attachments[0].localMatrix[12], 2);
assert.equal(syntheticMdatWrappedPuppet.attachments[0].localMatrix[13], 3);
assert.equal(syntheticAnimatedPuppet.bones.length, 1);
assert.deepEqual(Array.from(syntheticAnimatedPuppet.animations, (animation) => animation.id), [77]);
assert.deepEqual(Array.from(syntheticAnimatedPuppet.boneIndices.slice(0, 4)), [0, 0, 0, 0]);
assert.deepEqual(Array.from(syntheticAnimatedPuppet.boneWeights.slice(0, 4)), [1, 0, 0, 0]);
const syntheticAnimationLayer = {
  animationId: 77,
  additive: false,
  blend: 1,
  blendIn: false,
  blendOut: false,
  rate: 1,
  visible: true,
};
const syntheticSkinning = wallpaperEnginePuppetAnimation.createWallpaperEnginePuppet2dSkinningState(
  syntheticAnimatedPuppet,
  [syntheticAnimationLayer],
);
assert.ok(syntheticSkinning);
const syntheticHalfFrame = wallpaperEnginePuppetAnimation.sampleWallpaperEnginePuppet2dPositions(
  syntheticSkinning,
  500,
);
assert.ok(syntheticHalfFrame);
assert.ok(Math.abs(syntheticHalfFrame[0] - -5) < 0.0001);
assert.ok(Math.abs(syntheticHalfFrame[2] - 15) < 0.0001);
const syntheticAttachmentBind = wallpaperEnginePuppetAnimation.getWallpaperEnginePuppetAttachmentBindTransform2d(
  syntheticMdatWrappedPuppet,
  syntheticMdatWrappedPuppet.attachments[0],
);
assert.ok(syntheticAttachmentBind);
assert.ok(Math.abs(syntheticAttachmentBind.tx - 2) < 0.0001);
assert.ok(Math.abs(syntheticAttachmentBind.ty - 3) < 0.0001);
const syntheticAttachmentSkinning = wallpaperEnginePuppetAnimation.createWallpaperEnginePuppet2dSkinningState(
  syntheticMdatWrappedPuppet,
  [syntheticAnimationLayer],
);
assert.ok(syntheticAttachmentSkinning);
const syntheticAttachmentHalf = wallpaperEnginePuppetAnimation.sampleWallpaperEnginePuppetAttachmentTransform2d(
  syntheticAttachmentSkinning,
  syntheticMdatWrappedPuppet.attachments[0],
  500,
);
assert.ok(syntheticAttachmentHalf);
assert.ok(Math.abs(syntheticAttachmentHalf.tx - 7) < 0.0001);
assert.ok(Math.abs(syntheticAttachmentHalf.ty - 3) < 0.0001);
const syntheticAttachmentBrowser = wallpaperEnginePuppetAnimation.convertWallpaperEnginePuppetAttachmentTransformToBrowser(
  syntheticAttachmentHalf,
);
assert.ok(Math.abs(syntheticAttachmentBrowser.tx - 7) < 0.0001);
assert.ok(Math.abs(syntheticAttachmentBrowser.ty + 3) < 0.0001);
assert.equal(
  wallpaperEnginePuppetAnimation.classifyWallpaperEnginePuppetAnimation(
    syntheticAnimatedPuppet,
    [{ ...syntheticAnimationLayer, additive: true }],
  ).supported,
  true,
);

const syntheticDepthOnlyAnimation = {
  ...syntheticAnimatedPuppet.animations[0],
  id: 155,
  tracks: [{
    values: new Float32Array([
      0, 0, 3, 0, 0, 0, 1, 1, 1,
      10, 0, 7, 0, 0, 0, 1, 1, 1,
    ]),
  }],
};
const syntheticDepthOnlyPuppet = {
  ...syntheticAnimatedPuppet,
  animations: [syntheticDepthOnlyAnimation],
};
const syntheticDepthOnlyLayer = { ...syntheticAnimationLayer, animationId: 155 };
const syntheticDepthOnlySupport = wallpaperEnginePuppetAnimation.classifyWallpaperEnginePuppetAnimation(
  syntheticDepthOnlyPuppet,
  [syntheticDepthOnlyLayer],
);
assert.equal(syntheticDepthOnlySupport.supported, true);
assert.equal(syntheticDepthOnlySupport.mode, '2d');
const syntheticDepthOnlySkinning = wallpaperEnginePuppetAnimation.createWallpaperEnginePuppet2dSkinningState(
  syntheticDepthOnlyPuppet,
  [syntheticDepthOnlyLayer],
);
assert.ok(syntheticDepthOnlySkinning);
const syntheticDepthOnlyHalfFrame = wallpaperEnginePuppetAnimation.sampleWallpaperEnginePuppet2dPositions(
  syntheticDepthOnlySkinning,
  500,
);
assert.ok(syntheticDepthOnlyHalfFrame);
assert.ok(Math.abs(syntheticDepthOnlyHalfFrame[0] - -5) < 0.0001);
assert.ok(Math.abs(syntheticDepthOnlyHalfFrame[2] - 15) < 0.0001);

const synthetic3dAnimation = {
  ...syntheticAnimatedPuppet.animations[0],
  id: 177,
  tracks: [{
    values: new Float32Array([
      0, 0, 0, Math.PI / 2, Math.PI / 2, 0, 1, 1, 1,
      0, 0, 0, Math.PI / 2, Math.PI / 2, 0, 1, 1, 1,
    ]),
  }],
};
const synthetic3dPuppet = {
  ...syntheticAnimatedPuppet,
  animations: [synthetic3dAnimation],
};
const synthetic3dLayer = { ...syntheticAnimationLayer, animationId: 177 };
const synthetic3dSupport = wallpaperEnginePuppetAnimation.classifyWallpaperEnginePuppetAnimation(
  synthetic3dPuppet,
  [synthetic3dLayer],
);
assert.equal(synthetic3dSupport.supported, true);
assert.equal(synthetic3dSupport.mode, 'orthographic3d');
const synthetic3dSkinning = wallpaperEnginePuppetAnimation.createWallpaperEnginePuppet3dSkinningState(
  synthetic3dPuppet,
  [synthetic3dLayer],
);
assert.ok(synthetic3dSkinning);
const synthetic3dFrame = wallpaperEnginePuppetAnimation.sampleWallpaperEnginePuppet3dPositions(
  synthetic3dSkinning,
  0,
);
assert.ok(synthetic3dFrame);
// T * Rz * Ry * Rx projects the original (0, 15, 0) top vertex onto +X.
assert.ok(Math.abs(synthetic3dFrame[6] - 15) < 0.0001);
assert.ok(Math.abs(synthetic3dFrame[7]) < 0.0001);
const synthetic3dBounds = wallpaperEnginePuppetAnimation.getWallpaperEnginePuppetOrthographicBounds(synthetic3dPuppet);
assert.ok(synthetic3dBounds);
assert.ok((synthetic3dBounds.maxX - synthetic3dBounds.minX) > 20);
assert.equal(
  wallpaperEnginePuppetAnimation.classifyWallpaperEnginePuppetAnimation(
    synthetic3dPuppet,
    [synthetic3dLayer, { ...synthetic3dLayer, additive: true }],
  ).supported,
  false,
);

// Non-identity 3D bind regression: if the authored animation pose exactly
// matches the reference bind transform, worldPose * inverse(worldBind) must
// reduce to identity. This exercises the full 4x4 bind-inverse path used by
// sample 11's tilted three-bone wind puppet rather than only an identity bind.
const bindAngle = Math.PI / 6;
const bindCos = Math.cos(bindAngle);
const bindSin = Math.sin(bindAngle);
const syntheticTiltedBindPuppet = {
  ...syntheticAnimatedPuppet,
  bones: [{
    ...syntheticAnimatedPuppet.bones[0],
    bindMatrix: [
      bindCos, 0, -bindSin, 0,
      0, 1, 0, 0,
      bindSin, 0, bindCos, 0,
      0, 0, 0, 1,
    ],
  }],
  animations: [{
    ...syntheticAnimatedPuppet.animations[0],
    id: 277,
    tracks: [{
      values: new Float32Array([
        0, 0, 0, 0, bindAngle, 0, 1, 1, 1,
        0, 0, 0, 0, bindAngle, 0, 1, 1, 1,
      ]),
    }],
  }],
};
const syntheticTiltedLayer = { ...syntheticAnimationLayer, animationId: 277 };
const syntheticTiltedSkinning = wallpaperEnginePuppetAnimation.createWallpaperEnginePuppet3dSkinningState(
  syntheticTiltedBindPuppet,
  [syntheticTiltedLayer],
);
assert.ok(syntheticTiltedSkinning);
const syntheticTiltedFrame = wallpaperEnginePuppetAnimation.sampleWallpaperEnginePuppet3dPositions(
  syntheticTiltedSkinning,
  0,
);
assert.ok(syntheticTiltedFrame);
assert.equal(syntheticTiltedFrame.length, syntheticTiltedBindPuppet.positions3d.length);
for (let index = 0; index < syntheticTiltedFrame.length; index += 1) {
  assert.ok(Math.abs(syntheticTiltedFrame[index] - syntheticTiltedBindPuppet.positions3d[index]) < 0.0001);
}

const makeSyntheticAnimation = (id, endX, loopMode = 'loop') => ({
  ...syntheticAnimatedPuppet.animations[0],
  id,
  loopMode,
  tracks: [{
    values: new Float32Array([
      0, 0, 0, 0, 0, 0, 1, 1, 1,
      endX, 0, 0, 0, 0, 0, 1, 1, 1,
    ]),
  }],
});
const syntheticLayeredPuppet = {
  ...syntheticAnimatedPuppet,
  animations: [
    makeSyntheticAnimation(77, 10),
    makeSyntheticAnimation(88, 4),
    makeSyntheticAnimation(99, 10, 'single'),
  ],
};
const syntheticLayeredSkinning = wallpaperEnginePuppetAnimation.createWallpaperEnginePuppet2dSkinningState(
  syntheticLayeredPuppet,
  [
    syntheticAnimationLayer,
    { ...syntheticAnimationLayer, animationId: 88, additive: true },
  ],
);
assert.ok(syntheticLayeredSkinning);
const syntheticLayeredHalfFrame = wallpaperEnginePuppetAnimation.sampleWallpaperEnginePuppet2dPositions(
  syntheticLayeredSkinning,
  500,
);
assert.ok(syntheticLayeredHalfFrame);
// Ordinary translation = 5, additive delta from bind = +2, total = +7.
assert.ok(Math.abs(syntheticLayeredHalfFrame[0] - -3) < 0.0001);
assert.ok(Math.abs(syntheticLayeredHalfFrame[2] - 17) < 0.0001);

const syntheticSingleSkinning = wallpaperEnginePuppetAnimation.createWallpaperEnginePuppet2dSkinningState(
  syntheticLayeredPuppet,
  [{ ...syntheticAnimationLayer, animationId: 99 }],
);
assert.ok(syntheticSingleSkinning);
const syntheticSingleAfterEnd = wallpaperEnginePuppetAnimation.sampleWallpaperEnginePuppet2dPositions(
  syntheticSingleSkinning,
  2000,
);
assert.ok(syntheticSingleAfterEnd);
// `single` clamps at the authored endpoint instead of wrapping to frame zero.
assert.ok(Math.abs(syntheticSingleAfterEnd[0] - 0) < 0.0001);
assert.ok(Math.abs(syntheticSingleAfterEnd[2] - 20) < 0.0001);

assert.equal(
  wallpaperEnginePuppetAnimation.classifyWallpaperEnginePuppetAnimation(
    syntheticLayeredPuppet,
    [syntheticAnimationLayer, { ...syntheticAnimationLayer, animationId: 88 }],
  ).supported,
  false,
);
assert.equal(
  wallpaperEnginePuppetAnimation.classifyWallpaperEnginePuppetAnimation(
    syntheticLayeredPuppet,
    [{ ...syntheticAnimationLayer, blend: 0.5 }],
  ).supported,
  false,
);

const puppetEntries = new Map([
  ['puppet/scene.json', encodeJson({
    camera: { center: '0 0 -1' },
    general: { orthogonalprojection: { width: 100, height: 100 } },
    objects: [{
      id: 42,
      name: 'puppet',
      image: 'models/puppet.json',
      origin: '50 50 0',
      size: '64 64',
      effects: [{
        file: 'effects/shake.json',
        visible: true,
        passes: [{ constantshadervalues: { speed: 1, strength: 0.1 }, textures: [null, 'masks/puppet_shake'] }],
      }],
    }],
  })],
  ['puppet/models/puppet.json', encodeJson({ material: 'materials/puppet.json', puppet: 'models/puppet.mdl' })],
  ['puppet/models/puppet.mdl', makePuppetMdl()],
  ['puppet/materials/puppet.json', encodeJson({ passes: [{ textures: ['puppet'] }] })],
  ['puppet/materials/puppet.png', makePngHeader(64, 64)],
  ['puppet/materials/masks/puppet_shake.png', makePngHeader(32, 32)],
  ['puppet/effects/shake.json', encodeJson({ replacementkey: 'shake', version: 1 })],
]);
const puppetGraph = wallpaperEngineGraph.parseWallpaperEngineResourceGraph(puppetEntries);
assert.equal(puppetGraph.scenes[0].imageLayers[0].puppetPath, 'puppet/models/puppet.mdl');
const animatedPuppetEntries = new Map(puppetEntries);
animatedPuppetEntries.set('puppet/models/puppet.mdl', makeAnimatedPuppetMdl());
animatedPuppetEntries.set('puppet/scene.json', encodeJson({
  camera: { center: '0 0 -1' },
  general: { orthogonalprojection: { width: 100, height: 100 } },
  objects: [{
    id: 44,
    name: 'animated-puppet',
    image: 'models/puppet.json',
    origin: '50 50 0',
    size: '64 64',
    animationlayers: [{
      id: 99,
      name: 'move',
      animation: 77,
      additive: false,
      blend: 1,
      blendin: false,
      blendout: false,
      blendtime: 0.5,
      rate: 1,
      visible: true,
    }],
  }],
}));
const animatedPuppetGraph = wallpaperEngineGraph.parseWallpaperEngineResourceGraph(animatedPuppetEntries);
assert.equal(animatedPuppetGraph.scenes[0].imageLayers[0].puppetAnimationLayers.length, 1);
assert.equal(animatedPuppetGraph.scenes[0].imageLayers[0].puppetAnimationLayers[0].animationId, 77);
const animatedPuppetArchive = wallpaperEngineConverter.convertWallpaperEngineResourceGraph(
  animatedPuppetEntries,
  animatedPuppetGraph,
);
const animatedPuppetLayer = animatedPuppetArchive.scenes[0].layers[0];
assert.equal(animatedPuppetLayer.source.kind, 'puppetMesh');
assert.equal(animatedPuppetLayer.source.modelPath, 'puppet/models/puppet.mdl');
assert.equal(animatedPuppetLayer.source.animationLayers?.[0].animationId, 77);
assert.equal(animatedPuppetLayer.source.animationMode, '2d');
assert.equal(
  animatedPuppetArchive.scenes[0].diagnostics.some((diagnostic) => diagnostic.code === 'UNSUPPORTED_PUPPET_ANIMATION'),
  false,
);

const attachedPuppetEntries = new Map(animatedPuppetEntries);
attachedPuppetEntries.set('puppet/models/puppet.mdl', makeMdatWrappedAnimatedPuppetMdl());
attachedPuppetEntries.set('puppet/models/child.json', encodeJson({ material: 'materials/child.json' }));
attachedPuppetEntries.set('puppet/materials/child.json', encodeJson({ passes: [{ textures: ['child'] }] }));
attachedPuppetEntries.set('puppet/materials/child.png', makePngHeader(10, 12));
attachedPuppetEntries.set('puppet/scene.json', encodeJson({
  camera: { center: '0 0 -1' },
  general: { orthogonalprojection: { width: 100, height: 100 } },
  objects: [
    {
      id: 44,
      name: 'attachment-parent',
      image: 'models/puppet.json',
      origin: '50 50 0',
      size: '64 64',
      animationlayers: [{
        id: 99,
        name: 'move',
        animation: 77,
        additive: false,
        blend: 1,
        blendin: false,
        blendout: false,
        blendtime: 0.5,
        rate: 1,
        visible: true,
      }],
    },
    {
      id: 46,
      name: 'attachment-child',
      image: 'models/child.json',
      parent: 44,
      attachment: 'slot',
      origin: '4 6 0',
      size: '10 12',
    },
  ],
}));
const attachedPuppetGraph = wallpaperEngineGraph.parseWallpaperEngineResourceGraph(attachedPuppetEntries);
const attachedResolvedChild = attachedPuppetGraph.scenes[0].imageLayers.find((layer) => layer.id === '46');
assert.ok(attachedResolvedChild);
assert.equal(attachedResolvedChild.parentId, '44');
assert.equal(attachedResolvedChild.attachmentName, 'slot');
assert.deepEqual(Array.from(attachedResolvedChild.localTransform.origin), [4, 6, 0]);
const attachedPuppetArchive = wallpaperEngineConverter.convertWallpaperEngineResourceGraph(
  attachedPuppetEntries,
  attachedPuppetGraph,
);
const attachedPuppetRuntime = loadTsModule('features/theme/utils/wallpaperEngineSceneRuntime.ts');
assert.equal(attachedPuppetRuntime.isImportedWeScene(attachedPuppetArchive.scenes[0]), true);
const attachedChildLayer = attachedPuppetArchive.scenes[0].layers.find((layer) => layer.id === '46');
assert.ok(attachedChildLayer?.puppetAttachment);
assert.equal(attachedChildLayer.puppetAttachment.name, 'slot');
assert.equal(attachedChildLayer.puppetAttachment.parentLayerId, '44');
assert.equal(attachedChildLayer.puppetAttachment.parentModelPath, 'puppet/models/puppet.mdl');
assert.equal(attachedChildLayer.puppetAttachment.parentAnimationMode, '2d');
assert.equal(attachedChildLayer.puppetAttachment.boneIndex, 0);
assert.ok(Math.abs(attachedChildLayer.puppetAttachment.bindTransform.tx - 2) < 0.0001);
assert.ok(Math.abs(attachedChildLayer.puppetAttachment.bindTransform.ty + 3) < 0.0001);
assert.deepEqual({ ...attachedChildLayer.puppetAttachment.localCenter }, { x: 4, y: -6 });
const attachedAnimationRenderer = loadTsModule('features/theme/utils/wallpaperEngineAnimationRenderer.ts');
const attachedPlan = attachedAnimationRenderer.createWeAnimationRenderPlan(attachedPuppetArchive.scenes[0]);
assert.ok(attachedPlan);
assert.equal(attachedPlan.layers.find((layer) => layer.id === '46')?.puppetAttachment?.name, 'slot');
assert.equal(attachedPlan.staticResourcePaths.includes('puppet/models/puppet.mdl'), true);

const additivePuppetEntries = new Map(animatedPuppetEntries);
additivePuppetEntries.set('puppet/scene.json', encodeJson({
  camera: { center: '0 0 -1' },
  general: { orthogonalprojection: { width: 100, height: 100 } },
  objects: [{
    id: 45,
    name: 'layered-additive-puppet',
    image: 'models/puppet.json',
    origin: '50 50 0',
    size: '64 64',
    animationlayers: [
      {
        id: 100,
        name: 'add-a',
        animation: 77,
        additive: true,
        blend: 1,
        blendin: false,
        blendout: false,
        blendtime: 0.5,
        rate: 1,
        visible: true,
      },
      {
        id: 101,
        name: 'add-b',
        animation: 77,
        additive: true,
        blend: 1,
        blendin: false,
        blendout: false,
        blendtime: 0.5,
        rate: 0.5,
        visible: true,
      },
    ],
  }],
}));
const additivePuppetGraph = wallpaperEngineGraph.parseWallpaperEngineResourceGraph(additivePuppetEntries);
const additivePuppetArchive = wallpaperEngineConverter.convertWallpaperEngineResourceGraph(
  additivePuppetEntries,
  additivePuppetGraph,
);
const additivePuppetLayer = additivePuppetArchive.scenes[0].layers[0];
assert.equal(additivePuppetLayer.source.kind, 'puppetMesh');
assert.equal(additivePuppetLayer.source.modelPath, 'puppet/models/puppet.mdl');
assert.deepEqual(
  Array.from(additivePuppetLayer.source.animationLayers ?? [], (layer) => [layer.animationId, layer.additive, layer.rate]),
  [[77, true, 1], [77, true, 0.5]],
);
assert.equal(
  additivePuppetArchive.scenes[0].diagnostics.some((diagnostic) => diagnostic.code === 'UNSUPPORTED_PUPPET_ANIMATION'),
  false,
);

const puppetArchive = wallpaperEngineConverter.convertWallpaperEngineResourceGraph(puppetEntries, puppetGraph);
const puppetLayer = puppetArchive.scenes[0].layers[0];
assert.equal(puppetLayer.source.kind, 'puppetMesh');
assert.equal(puppetLayer.textureEffects?.length, 1);
assert.equal(puppetLayer.textureEffects?.[0].kind, 'shake');
assert.equal(puppetLayer.compatibility.ignoredEffects, false);
assert.equal(puppetLayer.size.width, 20);
assert.equal(puppetLayer.size.height, 20);
assert.equal(puppetLayer.center.x, 50);
assert.equal(puppetLayer.center.y, 45);
const puppetCapabilityReport = wallpaperEngineCapabilities.analyzeWallpaperEngineCapabilities(
  puppetEntries,
  puppetGraph,
);
const puppetShakeCapability = puppetCapabilityReport.totals.effects.find((effect) => effect.key === 'shake');
assert.deepEqual(Array.from(puppetShakeCapability?.contexts ?? []), ['puppet']);
assert.equal(puppetShakeCapability?.support, 'partial');
assert.equal(puppetShakeCapability?.supportedPassCount, 1);
assert.equal(puppetShakeCapability?.unsupportedPassCount, 0);

// Step 15 retains Opacity in the exact same ordered atlas surface chain as
// displacement/ray passes. A puppet can therefore execute Shake -> Opacity
// before MDL UV sampling without moving the mask to a legacy side-list boundary.
const puppetOpacityEntries = new Map(puppetEntries);
puppetOpacityEntries.set('puppet/scene.json', encodeJson({
  camera: { center: '0 0 -1' },
  general: { orthogonalprojection: { width: 100, height: 100 } },
  objects: [{
    id: 43,
    name: 'puppet-with-opacity-barrier',
    image: 'models/puppet.json',
    origin: '50 50 0',
    size: '64 64',
    effects: [
      {
        file: 'effects/shake.json',
        visible: true,
        passes: [{ constantshadervalues: { speed: 1, strength: 0.1 }, textures: [null, 'masks/puppet_shake'] }],
      },
      {
        file: 'effects/opacity.json',
        visible: true,
        passes: [{ constantshadervalues: { alpha: 0.8 }, textures: [null, 'masks/puppet_opacity'] }],
      },
      {
        file: 'effects/scroll.json',
        visible: true,
        passes: [{ constantshadervalues: { speedx: 0.1, speedy: -0.2, repeat: '1 1' } }],
      },
    ],
  }],
}));
puppetOpacityEntries.set('puppet/materials/masks/puppet_opacity.png', makePngHeader(32, 32));
puppetOpacityEntries.set('puppet/effects/opacity.json', encodeJson({ replacementkey: 'opacity', version: 1 }));
puppetOpacityEntries.set('puppet/effects/scroll.json', encodeJson({ replacementkey: 'scroll', version: 1 }));
const puppetOpacityGraph = wallpaperEngineGraph.parseWallpaperEngineResourceGraph(puppetOpacityEntries);
const puppetOpacityArchive = wallpaperEngineConverter.convertWallpaperEngineResourceGraph(
  puppetOpacityEntries,
  puppetOpacityGraph,
);
const puppetOpacityLayer = puppetOpacityArchive.scenes[0].layers[0];
assert.equal(puppetOpacityLayer.source.kind, 'puppetMesh');
assert.deepEqual(Array.from(puppetOpacityLayer.textureEffects, (effect) => effect.kind), ['shake', 'opacity', 'scroll']);
assert.equal(puppetOpacityLayer.textureEffects[1].maskPath, 'puppet/materials/masks/puppet_opacity.png');
assert.equal(puppetOpacityLayer.textureEffects[1].alpha, 0.8);
assert.equal(puppetOpacityLayer.opacityEffects.length, 0);
assert.equal(puppetOpacityLayer.compatibility.ignoredEffects, false);
const puppetOpacityCapabilityReport = wallpaperEngineCapabilities.analyzeWallpaperEngineCapabilities(
  puppetOpacityEntries,
  puppetOpacityGraph,
);
const puppetOpacityCapability = puppetOpacityCapabilityReport.totals.effects.find((effect) => effect.key === 'opacity');
assert.deepEqual(Array.from(puppetOpacityCapability?.contexts ?? []), ['puppet']);
assert.equal(puppetOpacityCapability?.support, 'partial');
assert.equal(puppetOpacityCapability?.supportedPassCount, 1);
assert.equal(puppetOpacityCapability?.unsupportedPassCount, 0);

opacityEffectEntries.set('opacity/materials/layer.png', makePngHeader(400, 300));
opacityEffectEntries.set('opacity/materials/masks/fade_mask.png', makePngHeader(200, 150));
const opacityEffectArchive = wallpaperEngineConverter.convertWallpaperEngineResourceGraph(
  opacityEffectEntries,
  opacityEffectGraph,
);
assert.equal(opacityEffectArchive.scenes[0].layers[0].opacityEffects.length, 0);
assert.equal(opacityEffectArchive.scenes[0].layers[0].textureEffects[0].kind, 'opacity');
assert.equal(opacityEffectArchive.scenes[0].layers[0].textureEffects[0].maskPath, 'opacity/materials/masks/fade_mask.png');
assert.equal(opacityEffectArchive.scenes[0].layers[0].textureEffects[0].alpha, 0.5);

waterWavesEffectEntries.set('waterwaves/materials/layer.png', makePngHeader(400, 300));
waterWavesEffectEntries.set('waterwaves/materials/masks/wave_mask.png', makePngHeader(400, 300));
waterWavesEffectEntries.set('waterwaves/materials/masks/time_offset.png', makePngHeader(400, 300));
const waterWavesEffectArchive = wallpaperEngineConverter.convertWallpaperEngineResourceGraph(
  waterWavesEffectEntries,
  waterWavesEffectGraph,
);
assert.equal(waterWavesEffectArchive.scenes[0].layers[0].waterWavesEffects.length, 1);
assert.equal(waterWavesEffectArchive.scenes[0].layers[0].waterWavesEffects[0].maskPath, 'waterwaves/materials/masks/wave_mask.png');
assert.equal(waterWavesEffectArchive.scenes[0].layers[0].waterWavesEffects[0].timeOffsetPath, 'waterwaves/materials/masks/time_offset.png');
assert.equal(waterWavesEffectArchive.scenes[0].layers[0].textureEffects, undefined);

scrollEffectEntries.set('scroll/materials/layer.png', makePngHeader(400, 300));
const scrollEffectArchive = wallpaperEngineConverter.convertWallpaperEngineResourceGraph(
  scrollEffectEntries,
  scrollEffectGraph,
);
assert.equal(scrollEffectArchive.scenes[0].layers.length, 2);
assert.equal(scrollEffectArchive.scenes[0].layers[0].textureEffects[0].kind, 'scroll');
assert.deepEqual({ ...scrollEffectArchive.scenes[0].layers[0].textureEffects[0].repeat }, { x: 1, y: 1 });
assert.deepEqual({ ...scrollEffectArchive.scenes[0].layers[1].textureEffects[0].repeat }, { x: 2, y: 3 });
assert.equal(scrollEffectArchive.scenes[0].layers[0].compatibility.ignoredEffects, false);

transformEffectEntries.set('transform/materials/layer.png', makePngHeader(400, 300));
const transformEffectArchive = wallpaperEngineConverter.convertWallpaperEngineResourceGraph(
  transformEffectEntries,
  transformEffectGraph,
);
assert.equal(transformEffectArchive.scenes[0].layers.length, 2);
assert.equal(transformEffectArchive.scenes[0].layers[0].textureEffects[0].kind, 'transform');
assert.deepEqual({ ...transformEffectArchive.scenes[0].layers[0].textureEffects[0].offset }, { x: 0.1, y: -0.2 });
assert.deepEqual({ ...transformEffectArchive.scenes[0].layers[0].textureEffects[0].scale }, { x: 1.5, y: 0.75 });
assert.equal(transformEffectArchive.scenes[0].layers[0].textureEffects[0].angle, 0.3);
assert.equal(transformEffectArchive.scenes[0].layers[0].textureEffects[0].repeat, false);
assert.equal(transformEffectArchive.scenes[0].layers[0].compatibility.ignoredEffects, false);
assert.equal(transformEffectArchive.scenes[0].layers[1].textureEffects, undefined);
assert.equal(transformEffectArchive.scenes[0].layers[1].compatibility.ignoredEffects, true);

spinEffectEntries.set('spin/materials/layer.png', makePngHeader(400, 300));
const spinEffectArchive = wallpaperEngineConverter.convertWallpaperEngineResourceGraph(
  spinEffectEntries,
  spinEffectGraph,
);
assert.equal(spinEffectArchive.scenes[0].layers.length, 2);
assert.equal(spinEffectArchive.scenes[0].layers[0].textureEffects[0].kind, 'spin');
assert.deepEqual({ ...spinEffectArchive.scenes[0].layers[0].textureEffects[0].center }, { x: 0.25, y: 0.75 });
assert.equal(spinEffectArchive.scenes[0].layers[0].compatibility.ignoredEffects, false);
assert.equal(spinEffectArchive.scenes[0].layers[1].compatibility.ignoredEffects, true);
legacySpinEffectEntries.set('spin-v1/materials/layer.png', makePngHeader(400, 300));
const legacySpinEffectArchive = wallpaperEngineConverter.convertWallpaperEngineResourceGraph(
  legacySpinEffectEntries,
  legacySpinEffectGraph,
);
assert.equal(legacySpinEffectArchive.scenes[0].layers[0].textureEffects[0].kind, 'spin');
assert.equal(legacySpinEffectArchive.scenes[0].layers[0].textureEffects[0].softMask, false);
assert.equal(legacySpinEffectArchive.scenes[0].layers[0].textureEffects[0].aspectCorrect, false);

perspectiveEffectEntries.set('perspective/materials/layer.png', makePngHeader(400, 300));
const perspectiveEffectArchive = wallpaperEngineConverter.convertWallpaperEngineResourceGraph(
  perspectiveEffectEntries,
  perspectiveEffectGraph,
);
assert.equal(perspectiveEffectArchive.scenes[0].layers[0].textureEffects[0].kind, 'perspective');
assert.deepEqual(
  Array.from(perspectiveEffectArchive.scenes[0].layers[0].textureEffects[0].points, (point) => ({ ...point })),
  [
    { x: 0.1, y: 0.11 },
    { x: 0.9, y: 0.11 },
    { x: 0.8, y: 0.4 },
    { x: 0.2, y: 0.4 },
  ],
);
assert.equal(perspectiveEffectArchive.scenes[0].layers[0].compatibility.ignoredEffects, false);

foliageSwayEffectEntries.set('foliage/materials/layer.png', makePngHeader(400, 300));
foliageSwayEffectEntries.set('foliage/materials/masks/leaf_mask.png', makePngHeader(400, 300));
foliageSwayEffectEntries.set('foliage/materials/noise/custom_noise.png', makePngHeader(256, 256));
const foliageSwayEffectArchive = wallpaperEngineConverter.convertWallpaperEngineResourceGraph(
  foliageSwayEffectEntries,
  foliageSwayEffectGraph,
);
assert.equal(foliageSwayEffectArchive.scenes[0].layers.length, 3);
const importedFoliageSway = foliageSwayEffectArchive.scenes[0].layers[0].textureEffects[0];
assert.equal(importedFoliageSway.kind, 'foliageSway');
assert.equal(importedFoliageSway.maskPath, 'foliage/materials/masks/leaf_mask.png');
assert.equal(importedFoliageSway.noisePath, null);
assert.equal(importedFoliageSway.strength, 0.48);
assert.equal(foliageSwayEffectArchive.scenes[0].layers[0].compatibility.ignoredEffects, false);
assert.equal(foliageSwayEffectArchive.scenes[0].layers[1].textureEffects[0].noisePath, 'foliage/materials/noise/custom_noise.png');
assert.equal(foliageSwayEffectArchive.scenes[0].layers[2].textureEffects, undefined);
assert.equal(foliageSwayEffectArchive.scenes[0].layers[2].compatibility.ignoredEffects, true);


waterFlowEffectEntries.set('waterflow/materials/layer.png', makePngHeader(400, 300));
waterFlowEffectEntries.set('waterflow/materials/masks/flow_legacy.png', makePngHeader(200, 150));
waterFlowEffectEntries.set('waterflow/materials/masks/flow_feather.png', makePngHeader(200, 150));
waterFlowEffectEntries.set('waterflow/materials/effects/waterflowphase.png', makePngHeader(32, 32));
const waterFlowEffectArchive = wallpaperEngineConverter.convertWallpaperEngineResourceGraph(
  waterFlowEffectEntries,
  waterFlowEffectGraph,
);
assert.equal(waterFlowEffectArchive.scenes[0].layers.length, 3);
const importedWaterFlow = waterFlowEffectArchive.scenes[0].layers[0].textureEffects[0];
assert.equal(importedWaterFlow.kind, 'waterFlow');
assert.equal(importedWaterFlow.phaseMode, 'legacy');
assert.equal(importedWaterFlow.phasePath, 'waterflow/materials/effects/waterflowphase.png');
assert.equal(waterFlowEffectArchive.scenes[0].layers[0].compatibility.ignoredEffects, false);
assert.equal(waterFlowEffectArchive.scenes[0].layers[1].textureEffects[0].flowMapPath, null);
assert.equal(waterFlowEffectArchive.scenes[0].layers[2].textureEffects[0].feather, 0.4);

shakeEffectEntries.set('shake/materials/layer.png', makePngHeader(400, 300));
shakeEffectEntries.set('shake/materials/masks/shake_direction.png', makePngHeader(200, 150));
const shakeEffectArchive = wallpaperEngineConverter.convertWallpaperEngineResourceGraph(
  shakeEffectEntries,
  shakeEffectGraph,
);
assert.equal(shakeEffectArchive.scenes[0].layers.length, 3);
const importedShake = shakeEffectArchive.scenes[0].layers[0].textureEffects[0];
assert.equal(importedShake.kind, 'shake');
assert.equal(importedShake.directionMapPath, 'shake/materials/masks/shake_direction.png');
assert.deepEqual({ ...importedShake.friction }, { x: 1.5, y: 2 });
assert.deepEqual({ ...importedShake.bounds }, { x: 0.1, y: 0.9 });
assert.equal(importedShake.directionMode, 0);
assert.equal(shakeEffectArchive.scenes[0].layers[0].compatibility.ignoredEffects, false);
assert.equal(shakeEffectArchive.scenes[0].layers[1].textureEffects[0].directionMapPath, null);
assert.equal(shakeEffectArchive.scenes[0].layers[1].textureEffects[0].directionMode, 1);
assert.equal(shakeEffectArchive.scenes[0].layers[1].compatibility.ignoredEffects, false);
assert.equal(shakeEffectArchive.scenes[0].layers[2].textureEffects, undefined);
assert.equal(shakeEffectArchive.scenes[0].layers[2].compatibility.ignoredEffects, true);

blurPreciseEffectEntries.set('blurprecise/materials/layer.png', makePngHeader(400, 300));
blurPreciseEffectEntries.set('blurprecise/materials/masks/blur_mask.png', makePngHeader(400, 300));
const blurPreciseEffectArchive = wallpaperEngineConverter.convertWallpaperEngineResourceGraph(
  blurPreciseEffectEntries,
  blurPreciseEffectGraph,
);
assert.equal(blurPreciseEffectArchive.scenes[0].layers.length, 2);
const importedBlurPrecise = blurPreciseEffectArchive.scenes[0].layers[0].textureEffects[0];
assert.equal(importedBlurPrecise.kind, 'blurPrecise');
assert.equal(importedBlurPrecise.maskPath, 'blurprecise/materials/masks/blur_mask.png');
assert.deepEqual({ ...importedBlurPrecise.scale }, { x: 1.17, y: 1.17 });
assert.equal(importedBlurPrecise.horizontalKernel, 0);
assert.equal(importedBlurPrecise.verticalKernel, 0);
assert.equal(importedBlurPrecise.blurAlpha, false);
assert.equal(blurPreciseEffectArchive.scenes[0].layers[0].compatibility.ignoredEffects, false);
assert.equal(blurPreciseEffectArchive.scenes[0].layers[1].textureEffects, undefined);
assert.equal(blurPreciseEffectArchive.scenes[0].layers[1].compatibility.ignoredEffects, true);

shineEffectEntries.set('shine/materials/layer.png', makePngHeader(400, 300));
shineEffectEntries.set('shine/materials/masks/shine_mask.png', makePngHeader(400, 300));
shineEffectEntries.set('shine/materials/noise/custom_clouds.png', makePngHeader(256, 256));
const shineEffectArchive = wallpaperEngineConverter.convertWallpaperEngineResourceGraph(
  shineEffectEntries,
  shineEffectGraph,
);
assert.equal(shineEffectArchive.scenes[0].layers.length, 2);
const importedShine = shineEffectArchive.scenes[0].layers[0].textureEffects[0];
assert.equal(importedShine.kind, 'shine');
assert.equal(importedShine.maskPath, 'shine/materials/masks/shine_mask.png');
assert.equal(importedShine.noisePath, 'shine/materials/noise/custom_clouds.png');
assert.deepEqual({ ...importedShine.rayColor }, { r: 0.2, g: 0.8, b: 1 });
assert.deepEqual({ ...importedShine.blurScale }, { x: 1.2, y: 1.2 });
assert.equal(importedShine.edges, 3);
assert.equal(importedShine.sampleMode, 2);
assert.equal(importedShine.blendMode, 9);
assert.equal(importedShine.copyBackground, false);
assert.equal(shineEffectArchive.scenes[0].layers[0].compatibility.ignoredEffects, false);
assert.equal(shineEffectArchive.scenes[0].layers[1].textureEffects, undefined);
assert.equal(shineEffectArchive.scenes[0].layers[1].compatibility.ignoredEffects, true);

const textShineEffectArchive = wallpaperEngineConverter.convertWallpaperEngineResourceGraph(
  textShineEffectEntries,
  textShineEffectGraph,
);
assert.equal(textShineEffectArchive.scenes[0].layers.length, 1);
assert.equal(textShineEffectArchive.scenes[0].layers[0].source.kind, 'text');
assert.equal(textShineEffectArchive.scenes[0].layers[0].textureEffects.length, 1);
assert.equal(textShineEffectArchive.scenes[0].layers[0].textureEffects[0].kind, 'shine');
assert.equal(textShineEffectArchive.scenes[0].layers[0].textureEffects[0].blendMode, 22);
assert.equal(textShineEffectArchive.scenes[0].layers[0].compatibility.ignoredEffects, false);

godRaysEffectEntries.set('godrays/materials/layer.png', makePngHeader(400, 300));
godRaysEffectEntries.set('godrays/materials/masks/rays_mask.png', makePngHeader(400, 300));
const godRaysEffectArchive = wallpaperEngineConverter.convertWallpaperEngineResourceGraph(
  godRaysEffectEntries,
  godRaysEffectGraph,
);
assert.equal(godRaysEffectArchive.scenes[0].layers.length, 3);
const importedRadialGodRays = godRaysEffectArchive.scenes[0].layers[0].textureEffects[0];
assert.equal(importedRadialGodRays.kind, 'godRays');
assert.equal(importedRadialGodRays.maskPath, null);
assert.equal(importedRadialGodRays.caster.mode, 'radial');
assert.deepEqual(
  { ...importedRadialGodRays.caster.center },
  { x: 0.6407873630523682, y: 0.2960065007209778 },
);
assert.deepEqual(
  { ...importedRadialGodRays.colorStart },
  { r: 0.30196078431372547, g: 0.054901960784313725, b: 0.054901960784313725 },
);
assert.deepEqual(
  { ...importedRadialGodRays.colorEnd },
  { r: 0.6745098039215687, g: 0.36470588235294116, b: 0.07450980392156863 },
);
assert.deepEqual({ ...importedRadialGodRays.blurScale }, { x: 1.72, y: 1.72 });
assert.equal(importedRadialGodRays.kernel, 1);
assert.equal(godRaysEffectArchive.scenes[0].layers[0].compatibility.ignoredEffects, false);
const importedDirectionalGodRays = godRaysEffectArchive.scenes[0].layers[1].textureEffects[0];
assert.equal(importedDirectionalGodRays.kind, 'godRays');
assert.equal(importedDirectionalGodRays.caster.mode, 'directional');
assert.equal(importedDirectionalGodRays.caster.direction, 0.6);
assert.equal(importedDirectionalGodRays.maskPath, 'godrays/materials/masks/rays_mask.png');
assert.equal(godRaysEffectArchive.scenes[0].layers[1].compatibility.ignoredEffects, false);
assert.equal(godRaysEffectArchive.scenes[0].layers[2].textureEffects, undefined);
assert.equal(godRaysEffectArchive.scenes[0].layers[2].compatibility.ignoredEffects, true);

waterRippleEffectEntries.set('waterripple/materials/layer.png', makePngHeader(400, 300));
waterRippleEffectEntries.set('waterripple/materials/masks/ripple_mask.png', makePngHeader(400, 300));
waterRippleEffectEntries.set('waterripple/materials/effects/waterripplenormal.png', makePngHeader(256, 256));
const waterRippleEffectArchive = wallpaperEngineConverter.convertWallpaperEngineResourceGraph(
  waterRippleEffectEntries,
  waterRippleEffectGraph,
);
assert.equal(waterRippleEffectArchive.scenes[0].layers.length, 3);
const importedWaterRipple = waterRippleEffectArchive.scenes[0].layers[0].textureEffects[0];
assert.equal(importedWaterRipple.kind, 'waterRipple');
assert.equal(importedWaterRipple.normalPath, 'waterripple/materials/effects/waterripplenormal.png');
assert.equal(importedWaterRipple.direction, 0.4);
assert.equal(waterRippleEffectArchive.scenes[0].layers[0].compatibility.ignoredEffects, false);
assert.equal(
  waterRippleEffectArchive.scenes[0].layers[1].textureEffects[0].maskPath,
  'waterripple/materials/masks/ripple_mask.png',
);
assert.equal(waterRippleEffectArchive.scenes[0].layers[1].compatibility.ignoredEffects, false);
assert.equal(waterRippleEffectArchive.scenes[0].layers[2].textureEffects, undefined);
assert.equal(waterRippleEffectArchive.scenes[0].layers[2].compatibility.ignoredEffects, true);

compositionEntries.set('composition/materials/base.png', makePngHeader(400, 200));
compositionEntries.set('composition/materials/mask.png', makePngHeader(200, 200));
const compositionArchive = wallpaperEngineConverter.convertWallpaperEngineResourceGraph(
  compositionEntries,
  compositionGraph,
);
const compositionLayer = compositionArchive.scenes[0].layers.find((layer) => layer.id === '23');
assert.ok(compositionLayer);
assert.equal(compositionLayer.source.kind, 'composition');
assert.deepEqual(Array.from(compositionLayer.source.effects).map((effect) => effect.kind), ['tint', 'blend', 'transform', 'fisheye', 'opacity']);
assert.equal(compositionLayer.size.width, 200);
assert.equal(compositionLayer.size.height, 200);
assert.equal(compositionLayer.center.x, 400);
assert.equal(compositionLayer.center.y, 300);
assert.equal(compositionLayer.compatibility.ignoredEffects, true);

alignmentEntries.set('alignment/materials/top.png', makePngHeader(3108, 1024));
alignmentEntries.set('alignment/materials/bottom-left.png', makePngHeader(800, 800));
const alignmentArchive = wallpaperEngineConverter.convertWallpaperEngineResourceGraph(
  alignmentEntries,
  alignmentGraph,
);
const topAlignedLayer = alignmentArchive.scenes[0].layers.find((layer) => layer.id === '301');
const bottomLeftAlignedLayer = alignmentArchive.scenes[0].layers.find((layer) => layer.id === '302');
assert.ok(topAlignedLayer);
assert.ok(bottomLeftAlignedLayer);
assert.ok(Math.abs(topAlignedLayer.center.x - 1720) < 1e-9);
assert.ok(Math.abs(topAlignedLayer.center.y - 512) < 1e-9);
assert.ok(Math.abs(bottomLeftAlignedLayer.center.x - 1724) < 1e-9);
assert.ok(Math.abs(bottomLeftAlignedLayer.center.y - 440) < 1e-9);

const autoEntries = new Map([
  ['auto/custom-gifscene.json', encodeJson({
    camera: { center: '0 0 -1' },
    general: {
      orthogonalprojection: { auto: true },
      cameraparallax: true,
      cameraparallaxamount: 0.5,
      cameraparallaxdelay: 0.1,
      cameraparallaxmouseinfluence: 0.2,
    },
    objects: [{
      id: 1,
      image: 'models/background.json',
      origin: '240 150 0',
      scale: '1 1 1',
      angles: '0 0 0',
    }],
  })],
  ['auto/models/background.json', encodeJson({ material: 'materials/background.json', autosize: true })],
  ['auto/materials/background.json', encodeJson({
    passes: [{ textures: ['background'], combos: { spritesheet: 1 } }],
  })],
  ['auto/materials/background_0.png', makePngHeader(480, 300)],
  ['auto/materials/background_1.png', makePngHeader(480, 300)],
]);
const autoGraph = wallpaperEngineGraph.parseWallpaperEngineResourceGraph(autoEntries);
const autoArchive = wallpaperEngineConverter.convertWallpaperEngineResourceGraph(autoEntries, autoGraph);
assert.equal(autoArchive.scenes.length, 1);
assert.equal(autoArchive.scenes[0].canvas.sizing, 'inferred');
const propertyAnimationArchive = wallpaperEngineConverter.convertWallpaperEngineResourceGraph(
  propertyAnimationEntries,
  propertyAnimationGraph,
);
assert.equal(propertyAnimationArchive.scenes[0].layers[0].centerAnimations.length, 2);
assert.equal(propertyAnimationArchive.scenes[0].layers[0].centerAnimations[0].fps, 10);
assert.equal(propertyAnimationArchive.scenes[0].layers[0].centerAnimations[1].lengthFrames, 10);
assert.equal(autoArchive.scenes[0].canvas.width, 480);
assert.equal(autoArchive.scenes[0].canvas.height, 300);
assert.equal(autoArchive.scenes[0].layers[0].source.kind, 'frameAnimation');
assert.equal(autoArchive.scenes[0].layers[0].source.frames.length, 2);
assert.deepEqual({ ...autoArchive.scenes[0].layers[0].center }, { x: 240, y: 150 });
assert.equal(autoArchive.scenes[0].unsupported.particleCount, 0);
assert.deepEqual({ ...autoArchive.scenes[0].cameraParallax }, {
  enabled: true,
  amount: 0.5,
  delay: 0.1,
  mouseInfluence: 0.2,
});

const solidEntries = new Map([
  ['solid/scene.json', encodeJson({
    general: { orthogonalprojection: { width: 1920, height: 1080 } },
    objects: [
      {
        id: 1,
        image: 'models/util/solidlayer.json',
        color: { value: '0.1 0.5 1.2' },
        origin: '960 540 0',
        size: '1920 1080',
        alpha: 0.75,
      },
      {
        id: 2,
        image: 'models/foreground.json',
        origin: '960 540 0',
        size: '100 100',
      },
      {
        id: 3,
        image: 'models/util/composelayer.json',
        origin: '960 540 0',
        size: '1920 1080',
      },
    ],
  })],
  ['solid/models/foreground.json', encodeJson({ material: 'materials/foreground.json' })],
  ['solid/materials/foreground.json', encodeJson({ passes: [{ textures: ['foreground'] }] })],
  ['solid/materials/foreground.png', makePngHeader(100, 100)],
]);
const solidGraph = wallpaperEngineGraph.parseWallpaperEngineResourceGraph(solidEntries);
assert.equal(solidGraph.scenes[0].solidLayers.length, 1);
assert.deepEqual(Array.from(solidGraph.scenes[0].solidLayers[0].color), [0.1, 0.5, 1]);
assert.equal(solidGraph.scenes[0].diagnostics.some((item) => item.code === 'UNSUPPORTED_BUILTIN_LAYER'), true);
const solidArchive = wallpaperEngineConverter.convertWallpaperEngineResourceGraph(solidEntries, solidGraph);
assert.equal(solidArchive.scenes[0].layers.length, 2);
assert.equal(solidArchive.scenes[0].layers[0].source.kind, 'solidColor');
assert.deepEqual({ ...solidArchive.scenes[0].layers[0].source.color }, { r: 0.1, g: 0.5, b: 1 });
assert.equal(solidArchive.scenes[0].layers[0].opacity, 0.75);

const textEntries = new Map([
  ['text/scene.json', encodeJson({
    general: { orthogonalprojection: { width: 800, height: 600 } },
    objects: [{
      id: 9,
      name: 'Clock',
      text: { script: 'export function update(value) { return value; }', value: '12:34' },
      font: 'fonts/Clock Font.ttf',
      pointsize: 18,
      color: '0.2 0.4 0.6',
      origin: { value: '400 300 0' },
      size: '240 60',
      horizontalalign: 'center',
      verticalalign: 'bottom',
      padding: 6,
      visible: { value: true },
    }],
  })],
  ['text/fonts/Clock Font.ttf', Uint8Array.of(0, 1, 2, 3)],
]);
const textGraph = wallpaperEngineGraph.parseWallpaperEngineResourceGraph(textEntries);
assert.equal(textGraph.scenes[0].textLayers.length, 1);
assert.equal(textGraph.scenes[0].skippedObjects.length, 0);
assert.equal(textGraph.scenes[0].textLayers[0].text, '12:34');
assert.equal(textGraph.scenes[0].textLayers[0].fontPath, 'text/fonts/Clock Font.ttf');
assert.equal(textGraph.scenes[0].textLayers[0].pointSize, 18);
assert.deepEqual(Array.from(textGraph.scenes[0].textLayers[0].color), [0.2, 0.4, 0.6]);
assert.equal(textGraph.scenes[0].textLayers[0].horizontalAlign, 'center');
assert.equal(textGraph.scenes[0].textLayers[0].verticalAlign, 'bottom');
assert.equal(textGraph.scenes[0].textLayers[0].padding, 6);
assert.equal(textGraph.scenes[0].diagnostics.some((item) => item.code === 'TEXT_SCRIPT_BASE_VALUE_ONLY'), true);
const textArchive = wallpaperEngineConverter.convertWallpaperEngineResourceGraph(textEntries, textGraph);
assert.equal(textArchive.scenes[0].layers.length, 1);
assert.equal(textArchive.scenes[0].layers[0].source.kind, 'text');
assert.equal(textArchive.scenes[0].layers[0].source.text, '12:34');
assert.equal(textArchive.scenes[0].layers[0].source.fontPath, 'text/fonts/Clock Font.ttf');
assert.deepEqual({ ...textArchive.scenes[0].layers[0].source.color }, { r: 0.2, g: 0.4, b: 0.6 });
assert.equal(textArchive.scenes[0].layers[0].compatibility.ignoredEffects, true);

const wallpaperEngineBuiltinFonts = loadTsModule('features/theme/utils/wallpaperEngineBuiltinFonts.ts');
assert.equal(
  wallpaperEngineBuiltinFonts.getWallpaperEngineBuiltinFontFile('fonts/Monofur-PK7og.ttf'),
  'Monofur-PK7og.ttf',
);
assert.equal(
  wallpaperEngineBuiltinFonts.getWallpaperEngineBuiltinFontFile('.\\fonts\\monofur-pk7OG.TTF'),
  'Monofur-PK7og.ttf',
);
assert.equal(
  wallpaperEngineBuiltinFonts.getWallpaperEngineBuiltinFontPublicPath('fonts/Monofur-PK7og.ttf'),
  'wallpaper-engine/fonts/Monofur-PK7og.ttf',
);
assert.equal(
  wallpaperEngineBuiltinFonts.getWallpaperEngineBuiltinFontFile('fonts/workshop/123/Monofur-PK7og.ttf'),
  null,
);
assert.equal(
  wallpaperEngineBuiltinFonts.getWallpaperEngineBuiltinFontFile('fonts/NotAWeBuiltin.ttf'),
  null,
);

const builtinFontTextEntries = new Map([
  ['builtin-font/scene.json', encodeJson({
    general: { orthogonalprojection: { width: 800, height: 600 } },
    objects: [{
      id: 11,
      name: 'Built-in clock font',
      text: '12:34',
      font: 'fonts/Monofur-PK7og.ttf',
      pointsize: 16,
      color: '1 1 1',
      origin: '400 300 0',
      size: '240 60',
    }],
  })],
]);
const builtinFontTextGraph = wallpaperEngineGraph.parseWallpaperEngineResourceGraph(builtinFontTextEntries);
assert.equal(builtinFontTextGraph.scenes[0].textLayers.length, 1);
assert.equal(builtinFontTextGraph.scenes[0].textLayers[0].fontReference, 'fonts/Monofur-PK7og.ttf');
assert.equal(builtinFontTextGraph.scenes[0].textLayers[0].fontPath, undefined);
assert.equal(
  builtinFontTextGraph.scenes[0].diagnostics.some((item) => item.code === 'MISSING_FONT_ASSET'),
  false,
);
const builtinFontTextArchive = wallpaperEngineConverter.convertWallpaperEngineResourceGraph(
  builtinFontTextEntries,
  builtinFontTextGraph,
);
assert.equal(builtinFontTextArchive.scenes[0].layers[0].source.kind, 'text');
assert.equal(builtinFontTextArchive.scenes[0].layers[0].source.fontReference, 'fonts/Monofur-PK7og.ttf');
assert.equal(builtinFontTextArchive.scenes[0].layers[0].source.fontPath, null);

const dynamicTextEntries = new Map([
  ['dynamic-text/scene.json', encodeJson({
    general: { orthogonalprojection: { width: 800, height: 600 } },
    objects: [{
      id: 10,
      name: 'Dynamic clock',
      text: {
        value: '12:34 AM',
        scriptproperties: {
          delimiter: ':',
          showSeconds: { user: 'seconds', value: true },
          use24hFormat: { user: 'clock24', value: false },
        },
        script: `'use strict';
export function update(value) {
  let time = new Date();
  var hours = time.getHours();
  let ampm = '';
  if (!scriptProperties.use24hFormat) {
    ampm = hours >= 12 ? ' PM' : ' AM';
    hours %= 12;
    if (hours === 0) hours = 12;
  }
  hours = ("00" + hours).slice(-2);
  let minutes = ("00" + time.getMinutes()).slice(-2);
  value = hours + scriptProperties.delimiter + minutes;
  if (scriptProperties.showSeconds) {
    let seconds = ("00" + time.getSeconds()).slice(-2);
    value += scriptProperties.delimiter + seconds;
  }
  if (!scriptProperties.use24hFormat) value += ampm;
  return value;
}`,
      },
      pointsize: 18,
      color: '1 1 1',
      origin: '400 250 0',
      size: '260 60',
    }, {
      id: 11,
      name: 'Dynamic date',
      text: {
        value: 'JUL 05',
        scriptproperties: {
          addDelimiter: '',
          alignVertical: false,
          dayFormat: '1',
          monthFormat: '2',
          showDay: false,
          useDelimiter: false,
        },
        script: `'use strict';
export function update(value) {
  if (scriptProperties.useDelimiter == true) { delimiterValue = scriptProperties.addDelimiter; }
  if (scriptProperties.useDelimiter == false) { delimiterValue = [' ']; }
  if (scriptProperties.alignVertical == true) { newLine = ['\\n']; }
  if (scriptProperties.alignVertical == false) { newLine = ['']; }
  if (scriptProperties.monthFormat == 2) { months = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC']; }
  if (scriptProperties.dayFormat == 1) { day = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']; }
  let date = new Date();
  var currentDate = date.getDate();
  if (currentDate < 10) currentDate = "0" + new String(currentDate);
  if (scriptProperties.showDay == true) { return date.getFullYear() + delimiterValue + months[date.getMonth()] + delimiterValue + date.getDate() + newLine + ' ' + day[date.getDay()]; }
  if (scriptProperties.showDay == false) { return months[date.getMonth()] + delimiterValue + currentDate; }
}`,
      },
      pointsize: 14,
      color: '1 1 1',
      origin: '400 350 0',
      size: '260 60',
    }],
  })],
]);
const dynamicTextGraph = wallpaperEngineGraph.parseWallpaperEngineResourceGraph(dynamicTextEntries);
assert.equal(dynamicTextGraph.scenes[0].textLayers.length, 2);
assert.equal(dynamicTextGraph.scenes[0].textLayers.every((layer) => Boolean(layer.dynamicText)), true);
assert.equal(dynamicTextGraph.scenes[0].diagnostics.some((item) => item.code === 'TEXT_SCRIPT_BASE_VALUE_ONLY'), false);
const dynamicTextArchive = wallpaperEngineConverter.convertWallpaperEngineResourceGraph(dynamicTextEntries, dynamicTextGraph);
assert.equal(dynamicTextArchive.scenes[0].layers.length, 2);
assert.equal(dynamicTextArchive.scenes[0].layers[0].source.kind, 'text');
assert.equal(dynamicTextArchive.scenes[0].layers[0].source.dynamicText.refresh, 'second');
assert.equal(dynamicTextArchive.scenes[0].layers[0].compatibility.ignoredEffects, false);
assert.equal(dynamicTextArchive.scenes[0].layers[1].source.dynamicText.refresh, 'day');

const wallpaperEngineDynamicText = loadTsModule('features/theme/utils/wallpaperEngineDynamicText.ts');
const fixedDynamicDate = new Date(2026, 7, 19, 20, 36, 5);
assert.equal(
  wallpaperEngineDynamicText.formatWallpaperEngineDynamicText(
    dynamicTextArchive.scenes[0].layers[0].source.dynamicText,
    fixedDynamicDate,
  ),
  '08:36:05 PM',
);
assert.equal(
  wallpaperEngineDynamicText.formatWallpaperEngineDynamicText(
    dynamicTextArchive.scenes[0].layers[1].source.dynamicText,
    fixedDynamicDate,
  ),
  'AUG 19',
);

const wallpaperEngineSceneStorage = loadTsModule('features/theme/utils/wallpaperEngineSceneStorage.ts', { Blob });
assert.deepEqual(
  Array.from(wallpaperEngineSceneStorage.collectWallpaperEngineSceneResourcePaths(animatedPuppetArchive.scenes[0])),
  ['puppet/materials/puppet.png', 'puppet/models/puppet.mdl'],
);
assert.deepEqual(
  Array.from(wallpaperEngineSceneStorage.collectWallpaperEngineSceneResourcePaths(solidArchive.scenes[0])),
  ['solid/materials/foreground.png'],
);
assert.equal(
  wallpaperEngineSceneStorage.getWallpaperEngineScenePreviewPath(solidArchive.scenes[0]),
  'solid/materials/foreground.png',
);
assert.deepEqual(
  Array.from(wallpaperEngineSceneStorage.collectWallpaperEngineSceneResourcePaths(textArchive.scenes[0])),
  ['text/fonts/Clock Font.ttf'],
);
assert.deepEqual(
  Array.from(wallpaperEngineSceneStorage.collectWallpaperEngineSceneResourcePaths(builtinFontTextArchive.scenes[0])),
  [],
);
assert.equal(wallpaperEngineSceneStorage.getWallpaperEngineScenePreviewPath(textArchive.scenes[0]), null);
assert.equal(wallpaperEngineSceneStorage.wallpaperEngineResourceMimeType('font.ttf'), 'font/ttf');
assert.deepEqual(
  Array.from(wallpaperEngineSceneStorage.collectWallpaperEngineSceneResourcePaths(opacityEffectArchive.scenes[0])),
  ['opacity/materials/layer.png', 'opacity/materials/masks/fade_mask.png'],
);
assert.deepEqual(
  Array.from(wallpaperEngineSceneStorage.collectWallpaperEngineSceneResourcePaths(waterWavesEffectArchive.scenes[0])),
  [
    'waterwaves/materials/layer.png',
    'waterwaves/materials/masks/wave_mask.png',
    'waterwaves/materials/masks/time_offset.png',
  ],
);
assert.deepEqual(
  Array.from(wallpaperEngineSceneStorage.collectWallpaperEngineSceneResourcePaths(transformEffectArchive.scenes[0])),
  ['transform/materials/layer.png'],
);
assert.deepEqual(
  Array.from(wallpaperEngineSceneStorage.collectWallpaperEngineSceneResourcePaths(foliageSwayEffectArchive.scenes[0])),
  [
    'foliage/materials/layer.png',
    'foliage/materials/masks/leaf_mask.png',
    'foliage/materials/noise/custom_noise.png',
  ],
);

assert.deepEqual(
  Array.from(wallpaperEngineSceneStorage.collectWallpaperEngineSceneResourcePaths(waterFlowEffectArchive.scenes[0])),
  [
    'waterflow/materials/layer.png',
    'waterflow/materials/masks/flow_legacy.png',
    'waterflow/materials/effects/waterflowphase.png',
    'waterflow/materials/masks/flow_feather.png',
  ],
);
assert.deepEqual(
  Array.from(wallpaperEngineSceneStorage.collectWallpaperEngineSceneResourcePaths(shakeEffectArchive.scenes[0])),
  ['shake/materials/layer.png', 'shake/materials/masks/shake_direction.png'],
);

assert.deepEqual(
  Array.from(wallpaperEngineSceneStorage.collectWallpaperEngineSceneResourcePaths(blurPreciseEffectArchive.scenes[0])),
  ['blurprecise/materials/layer.png', 'blurprecise/materials/masks/blur_mask.png'],
);

assert.deepEqual(
  Array.from(wallpaperEngineSceneStorage.collectWallpaperEngineSceneResourcePaths(shineEffectArchive.scenes[0])),
  [
    'shine/materials/layer.png',
    'shine/materials/masks/shine_mask.png',
    'shine/materials/noise/custom_clouds.png',
  ],
);

assert.deepEqual(
  Array.from(wallpaperEngineSceneStorage.collectWallpaperEngineSceneResourcePaths(textShineEffectArchive.scenes[0])),
  [
    'shine/materials/masks/shine_mask.png',
    'shine/materials/noise/custom_clouds.png',
  ],
);

assert.deepEqual(
  Array.from(wallpaperEngineSceneStorage.collectWallpaperEngineSceneResourcePaths(godRaysEffectArchive.scenes[0])),
  ['godrays/materials/layer.png', 'godrays/materials/masks/rays_mask.png'],
);

assert.deepEqual(
  Array.from(wallpaperEngineSceneStorage.collectWallpaperEngineSceneResourcePaths(waterRippleEffectArchive.scenes[0])),
  [
    'waterripple/materials/layer.png',
    'waterripple/materials/effects/waterripplenormal.png',
    'waterripple/materials/masks/ripple_mask.png',
  ],
);
assert.deepEqual(
  Array.from(wallpaperEngineSceneStorage.collectWallpaperEngineSceneResourcePaths(compositionArchive.scenes[0])),
  ['composition/materials/base.png', 'composition/materials/mask.png'],
);
assert.equal(wallpaperEngineSceneStorage.getWallpaperEngineScenePreviewPath(compositionArchive.scenes[0]), null);

assert.deepEqual(
  Array.from(wallpaperEngineSceneStorage.collectWallpaperEngineSceneResourcePaths(autoArchive.scenes[0])),
  [
    'auto/materials/background_0.png',
    'auto/materials/background_1.png',
  ],
);
assert.equal(
  wallpaperEngineSceneStorage.getWallpaperEngineScenePreviewPath(autoArchive.scenes[0]),
  'auto/materials/background_0.png',
);
const storedSceneResources = wallpaperEngineSceneStorage.buildWallpaperEngineSceneResources(
  'we_scene_test',
  autoArchive.scenes[0],
  autoEntries,
);
assert.equal(storedSceneResources.resources.length, 2);
assert.equal(storedSceneResources.resources[0].key, 'we_scene_test::auto/materials/background_0.png');
assert.equal(storedSceneResources.resources[0].mimeType, 'image/png');
assert.equal(storedSceneResources.resources[0].data instanceof Blob, true);
assert.equal(storedSceneResources.totalResourceBytes, 48);

const wallpaperEnginePerspectiveRenderer = loadTsModule('features/theme/utils/wallpaperEnginePerspectiveRenderer.ts');
const identityPerspectiveQuad = [
  { x: 0, y: 0 },
  { x: 1, y: 0 },
  { x: 1, y: 1 },
  { x: 0, y: 1 },
];
assert.deepEqual(
  Array.from(wallpaperEnginePerspectiveRenderer.convertWePerspectiveQuadToRenderer(identityPerspectiveQuad), (point) => ({ ...point })),
  identityPerspectiveQuad,
);
assert.deepEqual(
  Array.from(
    wallpaperEnginePerspectiveRenderer.createPerspectiveQuadToSquareMatrix(identityPerspectiveQuad),
    (value) => Object.is(value, -0) ? 0 : value,
  ),
  [1, 0, 0, 0, 1, 0, 0, 0, 1],
);

const wallpaperEngineStaticRenderer = loadTsModule('features/theme/utils/wallpaperEngineStaticRenderer.ts');
assert.equal(wallpaperEngineStaticRenderer.isImportedWeScene(puppetArchive.scenes[0]), true);
const staticPlan = wallpaperEngineStaticRenderer.createWeStaticRenderPlan(autoArchive.scenes[0]);
assert.equal(staticPlan.layers.length, 1);
assert.equal(staticPlan.layers[0].frozenAnimation, true);
assert.equal(staticPlan.layers[0].sourcePath, 'auto/materials/background_0.png');
assert.deepEqual(Array.from(staticPlan.resourcePaths), ['auto/materials/background_0.png']);
assert.equal(staticPlan.frozenAnimationLayerCount, 1);
const solidStaticPlan = wallpaperEngineStaticRenderer.createWeStaticRenderPlan(solidArchive.scenes[0]);
assert.equal(solidStaticPlan.layers.length, 2);
const textStaticPlan = wallpaperEngineStaticRenderer.createWeStaticRenderPlan(textArchive.scenes[0]);
assert.equal(textStaticPlan.layers.length, 1);
assert.equal(textStaticPlan.layers[0].sourcePath, null);
assert.equal(textStaticPlan.layers[0].solidColor, null);
assert.equal(textStaticPlan.layers[0].text.text, '12:34');
assert.deepEqual(Array.from(textStaticPlan.resourcePaths), ['text/fonts/Clock Font.ttf']);
const opacityStaticPlan = wallpaperEngineStaticRenderer.createWeStaticRenderPlan(opacityEffectArchive.scenes[0]);
assert.deepEqual(Array.from(opacityStaticPlan.layers[0].opacityMaskPaths), []);
assert.ok(Math.abs(opacityStaticPlan.layers[0].opacity - 0.8) < 1e-9);
assert.equal(opacityStaticPlan.layers[0].textureEffects[0].kind, 'opacity');
assert.equal(opacityStaticPlan.layers[0].textureEffects[0].alpha, 0.5);
assert.deepEqual(
  Array.from(opacityStaticPlan.resourcePaths),
  ['opacity/materials/layer.png', 'opacity/materials/masks/fade_mask.png'],
);
// Persisted pre-Step-15 scenes still use the side-list and must remain valid.
const legacyOpacityScene = structuredClone(opacityEffectArchive.scenes[0]);
legacyOpacityScene.layers[0].opacityEffects = [{ maskPath: 'opacity/materials/masks/fade_mask.png', alpha: 0.5 }];
delete legacyOpacityScene.layers[0].textureEffects;
const legacyOpacityStaticPlan = wallpaperEngineStaticRenderer.createWeStaticRenderPlan(legacyOpacityScene);
assert.deepEqual(Array.from(legacyOpacityStaticPlan.layers[0].opacityMaskPaths), ['opacity/materials/masks/fade_mask.png']);
assert.ok(Math.abs(legacyOpacityStaticPlan.layers[0].opacity - 0.4) < 1e-9);
const waterWavesStaticPlan = wallpaperEngineStaticRenderer.createWeStaticRenderPlan(waterWavesEffectArchive.scenes[0]);
assert.equal(waterWavesStaticPlan.layers[0].waterWavesEffects.length, 1);
assert.equal(waterWavesStaticPlan.layers[0].textureEffects[0].kind, 'waterWaves');
const scrollStaticPlan = wallpaperEngineStaticRenderer.createWeStaticRenderPlan(scrollEffectArchive.scenes[0]);
assert.equal(scrollStaticPlan.layers.length, 2);
assert.equal(scrollStaticPlan.layers[0].textureEffects[0].kind, 'scroll');
assert.equal(scrollStaticPlan.layers[0].textureEffects[0].speedX, -0.19);
assert.equal(scrollStaticPlan.layers[0].textureEffects[0].speedY, -0.24);
assert.equal(scrollStaticPlan.layers[1].textureEffects[0].speedY, 0.5);
assert.deepEqual({ ...scrollStaticPlan.layers[1].textureEffects[0].repeat }, { x: 2, y: 3 });
assert.deepEqual(Array.from(scrollStaticPlan.resourcePaths), ['scroll/materials/layer.png']);
const transformStaticPlan = wallpaperEngineStaticRenderer.createWeStaticRenderPlan(transformEffectArchive.scenes[0]);
assert.equal(transformStaticPlan.layers[0].textureEffects[0].kind, 'transform');
assert.deepEqual({ ...transformStaticPlan.layers[0].textureEffects[0].offset }, { x: 0.1, y: 0.2 });
assert.deepEqual({ ...transformStaticPlan.layers[0].textureEffects[0].scale }, { x: 1.5, y: 0.75 });
assert.equal(transformStaticPlan.layers[0].textureEffects[0].angle, 0.3);
assert.equal(transformStaticPlan.layers[0].textureEffects[0].repeat, false);
assert.deepEqual(Array.from(transformStaticPlan.resourcePaths), ['transform/materials/layer.png']);
const malformedTextureTransformScene = JSON.parse(JSON.stringify(transformEffectArchive.scenes[0]));
malformedTextureTransformScene.layers[0].textureEffects[0].repeat = 'yes';
assert.equal(wallpaperEngineStaticRenderer.isImportedWeScene(malformedTextureTransformScene), false);

const spinStaticPlan = wallpaperEngineStaticRenderer.createWeStaticRenderPlan(spinEffectArchive.scenes[0]);
assert.equal(spinStaticPlan.layers[0].textureEffects[0].kind, 'spin');
assert.deepEqual({ ...spinStaticPlan.layers[0].textureEffects[0].center }, { x: 0.25, y: 0.25 });
assert.equal(spinStaticPlan.layers[0].textureEffects[0].speed, -2);
assert.equal(spinStaticPlan.layers[0].textureEffects[0].axis, -0.4);
assert.equal(spinStaticPlan.layers[0].textureEffects[0].phase, -0.125);
assert.equal(spinStaticPlan.layers[0].textureEffects[0].ratio, -1.5);
assert.equal(spinStaticPlan.layers[0].textureEffects[0].repeat, false);
assert.deepEqual(Array.from(spinStaticPlan.resourcePaths), ['spin/materials/layer.png']);
const perspectiveStaticPlan = wallpaperEngineStaticRenderer.createWeStaticRenderPlan(perspectiveEffectArchive.scenes[0]);
assert.equal(perspectiveStaticPlan.layers[0].textureEffects[0].kind, 'perspective');
assert.deepEqual(
  Array.from(perspectiveStaticPlan.layers[0].textureEffects[0].points, (point) => ({ ...point })),
  [
    { x: 0.2, y: 0.6 },
    { x: 0.8, y: 0.6 },
    { x: 0.9, y: 0.89 },
    { x: 0.1, y: 0.89 },
  ],
);
assert.deepEqual(Array.from(perspectiveStaticPlan.resourcePaths), ['perspective/materials/layer.png']);
const foliageSwayStaticPlan = wallpaperEngineStaticRenderer.createWeStaticRenderPlan(foliageSwayEffectArchive.scenes[0]);
assert.equal(foliageSwayStaticPlan.layers[0].textureEffects[0].kind, 'foliageSway');
assert.equal(foliageSwayStaticPlan.layers[0].textureEffects[0].direction, -0.45);
assert.equal(foliageSwayStaticPlan.layers[0].textureEffects[0].maskPath, 'foliage/materials/masks/leaf_mask.png');
assert.equal(foliageSwayStaticPlan.layers[0].textureEffects[0].noisePath, null);
assert.equal(foliageSwayStaticPlan.layers[1].textureEffects[0].noisePath, 'foliage/materials/noise/custom_noise.png');
assert.deepEqual(
  Array.from(foliageSwayStaticPlan.resourcePaths),
  [
    'foliage/materials/layer.png',
    'foliage/materials/masks/leaf_mask.png',
    'foliage/materials/noise/custom_noise.png',
  ],
);

const waterFlowStaticPlan = wallpaperEngineStaticRenderer.createWeStaticRenderPlan(waterFlowEffectArchive.scenes[0]);
assert.equal(waterFlowStaticPlan.layers[0].textureEffects[0].kind, 'waterFlow');
assert.equal(waterFlowStaticPlan.layers[0].textureEffects[0].phaseMode, 'legacy');
assert.equal(waterFlowStaticPlan.layers[1].textureEffects[0].flowMapPath, null);
assert.equal(waterFlowStaticPlan.layers[2].textureEffects[0].feather, 0.4);
assert.deepEqual(
  Array.from(waterFlowStaticPlan.resourcePaths),
  [
    'waterflow/materials/layer.png',
    'waterflow/materials/masks/flow_legacy.png',
    'waterflow/materials/effects/waterflowphase.png',
    'waterflow/materials/masks/flow_feather.png',
  ],
);
const malformedWaterFlowScene = JSON.parse(JSON.stringify(waterFlowEffectArchive.scenes[0]));
malformedWaterFlowScene.layers[0].textureEffects[0].phaseScale = 0;
assert.equal(wallpaperEngineStaticRenderer.isImportedWeScene(malformedWaterFlowScene), false);

const shakeStaticPlan = wallpaperEngineStaticRenderer.createWeStaticRenderPlan(shakeEffectArchive.scenes[0]);
assert.equal(shakeStaticPlan.layers[0].textureEffects[0].kind, 'shake');
assert.deepEqual({ ...shakeStaticPlan.layers[0].textureEffects[0].friction }, { x: 1.5, y: 2 });
assert.deepEqual({ ...shakeStaticPlan.layers[0].textureEffects[0].bounds }, { x: 0.1, y: 0.9 });
assert.equal(shakeStaticPlan.layers[1].textureEffects[0].directionMode, 1);
assert.deepEqual(
  Array.from(shakeStaticPlan.resourcePaths),
  ['shake/materials/layer.png', 'shake/materials/masks/shake_direction.png'],
);
const malformedShakeScene = JSON.parse(JSON.stringify(shakeEffectArchive.scenes[0]));
malformedShakeScene.layers[0].textureEffects[0].bounds = { x: 1, y: 1 };
assert.equal(wallpaperEngineStaticRenderer.createWeStaticRenderPlan(malformedShakeScene), null);

const blurPreciseStaticPlan = wallpaperEngineStaticRenderer.createWeStaticRenderPlan(blurPreciseEffectArchive.scenes[0]);
assert.equal(blurPreciseStaticPlan.layers[0].textureEffects[0].kind, 'blurPrecise');
assert.deepEqual({ ...blurPreciseStaticPlan.layers[0].textureEffects[0].scale }, { x: 1.17, y: 1.17 });
assert.equal(blurPreciseStaticPlan.layers[0].textureEffects[0].blurAlpha, false);
assert.deepEqual(
  Array.from(blurPreciseStaticPlan.resourcePaths),
  ['blurprecise/materials/layer.png', 'blurprecise/materials/masks/blur_mask.png'],
);
const malformedBlurPreciseScene = JSON.parse(JSON.stringify(blurPreciseEffectArchive.scenes[0]));
malformedBlurPreciseScene.layers[0].textureEffects[0].scale.x = 0;
assert.equal(wallpaperEngineStaticRenderer.isImportedWeScene(malformedBlurPreciseScene), false);

const shineStaticPlan = wallpaperEngineStaticRenderer.createWeStaticRenderPlan(shineEffectArchive.scenes[0]);
assert.equal(shineStaticPlan.layers[0].textureEffects[0].kind, 'shine');
assert.equal(shineStaticPlan.layers[0].textureEffects[0].rayDirection, -0.75);
assert.equal(shineStaticPlan.layers[0].textureEffects[0].raySpeed, -0.3);
assert.deepEqual({ ...shineStaticPlan.layers[0].textureEffects[0].rayColor }, { r: 0.2, g: 0.8, b: 1 });
assert.deepEqual({ ...shineStaticPlan.layers[0].textureEffects[0].blurScale }, { x: 1.2, y: 1.2 });
assert.deepEqual(
  Array.from(shineStaticPlan.resourcePaths),
  [
    'shine/materials/layer.png',
    'shine/materials/masks/shine_mask.png',
    'shine/materials/noise/custom_clouds.png',
  ],
);
const glowShineScene = JSON.parse(JSON.stringify(shineEffectArchive.scenes[0]));
glowShineScene.layers[0].textureEffects[0].blendMode = 22;
assert.equal(wallpaperEngineStaticRenderer.isImportedWeScene(glowShineScene), true);
const malformedShineScene = JSON.parse(JSON.stringify(shineEffectArchive.scenes[0]));
malformedShineScene.layers[0].textureEffects[0].blendMode = 33;
assert.equal(wallpaperEngineStaticRenderer.isImportedWeScene(malformedShineScene), false);

const godRaysStaticPlan = wallpaperEngineStaticRenderer.createWeStaticRenderPlan(godRaysEffectArchive.scenes[0]);
assert.equal(godRaysStaticPlan.layers[0].textureEffects[0].kind, 'godRays');
assert.equal(godRaysStaticPlan.layers[0].textureEffects[0].caster.mode, 'radial');
assert.deepEqual(
  { ...godRaysStaticPlan.layers[0].textureEffects[0].caster.center },
  { x: 0.6407873630523682, y: 1 - 0.2960065007209778 },
);
assert.deepEqual({ ...godRaysStaticPlan.layers[0].textureEffects[0].blurScale }, { x: 1.72, y: 1.72 });
assert.equal(godRaysStaticPlan.layers[1].textureEffects[0].caster.mode, 'directional');
assert.equal(godRaysStaticPlan.layers[1].textureEffects[0].caster.direction, -0.6);
assert.deepEqual(
  Array.from(godRaysStaticPlan.resourcePaths),
  ['godrays/materials/layer.png', 'godrays/materials/masks/rays_mask.png'],
);
const malformedGodRaysScene = JSON.parse(JSON.stringify(godRaysEffectArchive.scenes[0]));
malformedGodRaysScene.layers[0].textureEffects[0].caster.center.y = 'bad';
assert.equal(wallpaperEngineStaticRenderer.isImportedWeScene(malformedGodRaysScene), false);

const waterRippleStaticPlan = wallpaperEngineStaticRenderer.createWeStaticRenderPlan(waterRippleEffectArchive.scenes[0]);
assert.equal(waterRippleStaticPlan.layers[0].textureEffects[0].kind, 'waterRipple');
assert.equal(waterRippleStaticPlan.layers[0].textureEffects[0].direction, -0.4);
assert.equal(waterRippleStaticPlan.layers[1].textureEffects[0].maskPath, 'waterripple/materials/masks/ripple_mask.png');
assert.deepEqual(
  Array.from(waterRippleStaticPlan.resourcePaths),
  [
    'waterripple/materials/layer.png',
    'waterripple/materials/effects/waterripplenormal.png',
    'waterripple/materials/masks/ripple_mask.png',
  ],
);
const malformedWaterRippleScene = JSON.parse(JSON.stringify(waterRippleEffectArchive.scenes[0]));
malformedWaterRippleScene.layers[0].textureEffects[0].normalPath = '';
assert.equal(wallpaperEngineStaticRenderer.isImportedWeScene(malformedWaterRippleScene), false);

const malformedFoliageSwayScene = JSON.parse(JSON.stringify(foliageSwayEffectArchive.scenes[0]));
malformedFoliageSwayScene.layers[0].textureEffects[0].ratio = 0;
assert.equal(wallpaperEngineStaticRenderer.isImportedWeScene(malformedFoliageSwayScene), false);

const malformedPerspectiveScene = JSON.parse(JSON.stringify(perspectiveEffectArchive.scenes[0]));
malformedPerspectiveScene.layers[0].textureEffects[0].points.pop();
assert.equal(wallpaperEngineStaticRenderer.isImportedWeScene(malformedPerspectiveScene), false);

const malformedSpinScene = JSON.parse(JSON.stringify(spinEffectArchive.scenes[0]));
malformedSpinScene.layers[0].textureEffects[0].ratio = 0;
assert.equal(wallpaperEngineStaticRenderer.isImportedWeScene(malformedSpinScene), false);
const legacySpinStaticPlan = wallpaperEngineStaticRenderer.createWeStaticRenderPlan(legacySpinEffectArchive.scenes[0]);
assert.deepEqual({ ...legacySpinStaticPlan.layers[0].textureEffects[0].center }, { x: 0.4, y: 0.4 });
assert.equal(legacySpinStaticPlan.layers[0].textureEffects[0].speed, -0.3);
assert.equal(legacySpinStaticPlan.layers[0].textureEffects[0].softMask, false);
assert.equal(legacySpinStaticPlan.layers[0].textureEffects[0].aspectCorrect, false);
assert.deepEqual(
  Array.from(waterWavesStaticPlan.resourcePaths),
  [
    'waterwaves/materials/layer.png',
    'waterwaves/materials/masks/wave_mask.png',
    'waterwaves/materials/masks/time_offset.png',
  ],
);
const compositionStaticPlan = wallpaperEngineStaticRenderer.createWeStaticRenderPlan(compositionArchive.scenes[0]);
assert.equal(compositionStaticPlan.layers.length, 1);
assert.equal(compositionStaticPlan.layers[0].sourcePath, null);
assert.deepEqual(Array.from(compositionStaticPlan.layers[0].compositionEffects).map((effect) => effect.kind), ['tint', 'blend', 'transform', 'fisheye', 'opacity']);
assert.deepEqual(
  Array.from(compositionStaticPlan.resourcePaths),
  ['composition/materials/base.png', 'composition/materials/mask.png'],
);
assert.equal(solidStaticPlan.layers[0].sourcePath, null);
assert.deepEqual({ ...solidStaticPlan.layers[0].solidColor }, { r: 0.1, g: 0.5, b: 1 });
assert.deepEqual(Array.from(solidStaticPlan.resourcePaths), ['solid/materials/foreground.png']);
assert.equal(wallpaperEngineStaticRenderer.isImportedWeScene(solidArchive.scenes[0]), true);
const malformedSolidScene = JSON.parse(JSON.stringify(solidArchive.scenes[0]));
malformedSolidScene.layers[0].source.color.r = 2;
assert.equal(wallpaperEngineStaticRenderer.isImportedWeScene(malformedSolidScene), false);
assert.equal(wallpaperEngineStaticRenderer.isImportedWeScene(textArchive.scenes[0]), true);
const malformedTextScene = JSON.parse(JSON.stringify(textArchive.scenes[0]));
malformedTextScene.layers[0].source.horizontalAlign = 'diagonal';
assert.equal(wallpaperEngineStaticRenderer.isImportedWeScene(malformedTextScene), false);
const malformedTextFontScene = JSON.parse(JSON.stringify(textArchive.scenes[0]));
malformedTextFontScene.layers[0].source.fontPath = '';
assert.equal(wallpaperEngineStaticRenderer.isImportedWeScene(malformedTextFontScene), false);
assert.equal(wallpaperEngineStaticRenderer.isImportedWeScene(dynamicTextArchive.scenes[0]), true);
const malformedDynamicTextScene = JSON.parse(JSON.stringify(dynamicTextArchive.scenes[0]));
malformedDynamicTextScene.layers[0].source.dynamicText.parts[0].kind = 'javascript';
assert.equal(wallpaperEngineStaticRenderer.isImportedWeScene(malformedDynamicTextScene), false);

assert.equal(
  wallpaperEngineStaticRenderer.getWeSceneCoverScale({ width: 1920, height: 1080 }, { width: 1280, height: 720 }),
  2 / 3,
);
assert.equal(
  wallpaperEngineStaticRenderer.getWeSceneCoverScale({ width: 1920, height: 1080 }, { width: 1000, height: 1000 }),
  1000 / 1080,
);
assert.equal(wallpaperEngineStaticRenderer.isImportedWeScene(autoArchive.scenes[0]), true);
assert.equal(wallpaperEngineStaticRenderer.isImportedWeScene({ format: 'tablab-we-scene', version: 1 }), false);

// Persisted WE metadata is an untrusted runtime boundary. The guard must validate
// nested layer/source shapes so stale/corrupt IndexedDB records cannot crash the renderer.
const malformedSourceScene = JSON.parse(JSON.stringify(autoArchive.scenes[0]));
malformedSourceScene.layers[0].source = null;
assert.equal(wallpaperEngineStaticRenderer.isImportedWeScene(malformedSourceScene), false);
assert.equal(wallpaperEngineStaticRenderer.createWeStaticRenderPlan(malformedSourceScene), null);

const malformedFrameScene = JSON.parse(JSON.stringify(autoArchive.scenes[0]));
malformedFrameScene.layers[0].source.frames = [malformedFrameScene.layers[0].source.frames[0], null];
assert.equal(wallpaperEngineStaticRenderer.isImportedWeScene(malformedFrameScene), false);
assert.equal(wallpaperEngineStaticRenderer.createWeStaticRenderPlan(malformedFrameScene), null);

const malformedTransformScene = JSON.parse(JSON.stringify(autoArchive.scenes[0]));
delete malformedTransformScene.layers[0].center.x;
assert.equal(wallpaperEngineStaticRenderer.isImportedWeScene(malformedTransformScene), false);
assert.equal(wallpaperEngineStaticRenderer.createWeStaticRenderPlan(malformedTransformScene), null);

const malformedCompatibilityScene = JSON.parse(JSON.stringify(autoArchive.scenes[0]));
delete malformedCompatibilityScene.layers[0].compatibility.weMaterialPath;
assert.equal(wallpaperEngineStaticRenderer.isImportedWeScene(malformedCompatibilityScene), false);

const staleTopLevelScene = JSON.parse(JSON.stringify(autoArchive.scenes[0]));
delete staleTopLevelScene.unsupported;
assert.equal(wallpaperEngineStaticRenderer.isImportedWeScene(staleTopLevelScene), false);
assert.equal(wallpaperEngineStaticRenderer.createWeStaticRenderPlan(staleTopLevelScene), null);

const malformedParallaxScene = JSON.parse(JSON.stringify(autoArchive.scenes[0]));
malformedParallaxScene.cameraParallax.delay = 'slow';
assert.equal(wallpaperEngineStaticRenderer.isImportedWeScene(malformedParallaxScene), false);

assert.equal(wallpaperEngineStaticRenderer.isImportedWeScene(propertyAnimationArchive.scenes[0]), true);
const malformedPropertyAnimationScene = JSON.parse(JSON.stringify(propertyAnimationArchive.scenes[0]));
malformedPropertyAnimationScene.layers[0].centerAnimations[0].mode = 'random';
assert.equal(wallpaperEngineStaticRenderer.isImportedWeScene(malformedPropertyAnimationScene), false);
const malformedPropertyKeyframeScene = JSON.parse(JSON.stringify(propertyAnimationArchive.scenes[0]));
malformedPropertyKeyframeScene.layers[0].centerAnimations[0].x[0].value = 'bad';
assert.equal(wallpaperEngineStaticRenderer.isImportedWeScene(malformedPropertyKeyframeScene), false);

const legacySceneWithoutParallax = JSON.parse(JSON.stringify(autoArchive.scenes[0]));
delete legacySceneWithoutParallax.cameraParallax;
assert.equal(wallpaperEngineStaticRenderer.isImportedWeScene(legacySceneWithoutParallax), true);


const wallpaperEngineAnimationRenderer = loadTsModule('features/theme/utils/wallpaperEngineAnimationRenderer.ts');
const animatedPuppetPlan = wallpaperEngineAnimationRenderer.createWeAnimationRenderPlan(animatedPuppetArchive.scenes[0]);
assert.equal(animatedPuppetPlan.layers[0].source.kind, 'puppetMesh');
assert.equal(animatedPuppetPlan.layers[0].source.modelPath, 'puppet/models/puppet.mdl');
assert.equal(animatedPuppetPlan.layers[0].source.animationLayers[0].animationId, 77);
assert.equal(animatedPuppetPlan.staticResourcePaths.includes('puppet/models/puppet.mdl'), true);
const screenBlendAnimationPlan = wallpaperEngineAnimationRenderer.createWeAnimationRenderPlan(screenBlendArchive.scenes[0]);
assert.equal(screenBlendAnimationPlan.layers[0].blendMode, 'screen');
// Backward compatibility: scenes imported before the renderer-facing screen
// mapping existed still retain the raw WE colorBlendMode in compatibility.
const staleScreenBlendScene = JSON.parse(JSON.stringify(screenBlendArchive.scenes[0]));
staleScreenBlendScene.layers[0].blendMode = null;
const staleScreenBlendPlan = wallpaperEngineAnimationRenderer.createWeAnimationRenderPlan(staleScreenBlendScene);
assert.equal(staleScreenBlendPlan.layers[0].blendMode, 'screen');
const opacityAnimationPlan = wallpaperEngineAnimationRenderer.createWeAnimationRenderPlan(opacityEffectArchive.scenes[0]);
assert.deepEqual(Array.from(opacityAnimationPlan.layers[0].opacityMaskPaths), []);
assert.ok(Math.abs(opacityAnimationPlan.layers[0].opacity - 0.8) < 1e-9);
assert.equal(opacityAnimationPlan.layers[0].textureEffects[0].kind, 'opacity');
assert.equal(opacityAnimationPlan.layers[0].textureEffects[0].alpha, 0.5);
assert.equal(opacityAnimationPlan.staticResourcePaths.includes('opacity/materials/masks/fade_mask.png'), true);
const legacyOpacityAnimationPlan = wallpaperEngineAnimationRenderer.createWeAnimationRenderPlan(legacyOpacityScene);
assert.deepEqual(Array.from(legacyOpacityAnimationPlan.layers[0].opacityMaskPaths), ['opacity/materials/masks/fade_mask.png']);
assert.ok(Math.abs(legacyOpacityAnimationPlan.layers[0].opacity - 0.4) < 1e-9);
const waterWavesAnimationPlan = wallpaperEngineAnimationRenderer.createWeAnimationRenderPlan(waterWavesEffectArchive.scenes[0]);
assert.equal(waterWavesAnimationPlan.layers[0].waterWavesEffects.length, 1);
assert.equal(waterWavesAnimationPlan.layers[0].textureEffects[0].kind, 'waterWaves');
const legacyWaterWavesScene = JSON.parse(JSON.stringify(waterWavesEffectArchive.scenes[0]));
delete legacyWaterWavesScene.layers[0].textureEffects;
const legacyWaterWavesPlan = wallpaperEngineAnimationRenderer.createWeAnimationRenderPlan(legacyWaterWavesScene);
assert.equal(legacyWaterWavesPlan.layers[0].textureEffects[0].kind, 'waterWaves');
const scrollAnimationPlan = wallpaperEngineAnimationRenderer.createWeAnimationRenderPlan(scrollEffectArchive.scenes[0]);
assert.equal(scrollAnimationPlan.layers.length, 2);
assert.equal(scrollAnimationPlan.layers[0].textureEffects[0].kind, 'scroll');
assert.equal(scrollAnimationPlan.layers[0].textureEffects[0].speedY, -0.24);
assert.equal(scrollAnimationPlan.layers[1].textureEffects[0].speedY, 0.5);
assert.deepEqual({ ...scrollAnimationPlan.layers[1].textureEffects[0].repeat }, { x: 2, y: 3 });
assert.deepEqual(Array.from(scrollAnimationPlan.staticResourcePaths), ['scroll/materials/layer.png']);
const transformAnimationPlan = wallpaperEngineAnimationRenderer.createWeAnimationRenderPlan(transformEffectArchive.scenes[0]);
assert.equal(transformAnimationPlan.layers[0].textureEffects[0].kind, 'transform');
assert.deepEqual({ ...transformAnimationPlan.layers[0].textureEffects[0].offset }, { x: 0.1, y: 0.2 });
assert.deepEqual({ ...transformAnimationPlan.layers[0].textureEffects[0].scale }, { x: 1.5, y: 0.75 });
assert.equal(transformAnimationPlan.layers[0].textureEffects[0].angle, 0.3);
assert.equal(transformAnimationPlan.layers[0].textureEffects[0].repeat, false);
assert.deepEqual(Array.from(transformAnimationPlan.staticResourcePaths), ['transform/materials/layer.png']);

const spinAnimationPlan = wallpaperEngineAnimationRenderer.createWeAnimationRenderPlan(spinEffectArchive.scenes[0]);
assert.equal(spinAnimationPlan.layers[0].textureEffects[0].kind, 'spin');
assert.deepEqual({ ...spinAnimationPlan.layers[0].textureEffects[0].center }, { x: 0.25, y: 0.25 });
assert.equal(spinAnimationPlan.layers[0].textureEffects[0].speed, -2);
assert.equal(spinAnimationPlan.layers[0].textureEffects[0].axis, -0.4);
assert.equal(spinAnimationPlan.layers[0].textureEffects[0].phase, -0.125);
assert.deepEqual(Array.from(spinAnimationPlan.staticResourcePaths), ['spin/materials/layer.png']);
const perspectiveAnimationPlan = wallpaperEngineAnimationRenderer.createWeAnimationRenderPlan(perspectiveEffectArchive.scenes[0]);
assert.equal(perspectiveAnimationPlan.layers[0].textureEffects[0].kind, 'perspective');
assert.deepEqual(
  Array.from(perspectiveAnimationPlan.layers[0].textureEffects[0].points, (point) => ({ ...point })),
  [
    { x: 0.2, y: 0.6 },
    { x: 0.8, y: 0.6 },
    { x: 0.9, y: 0.89 },
    { x: 0.1, y: 0.89 },
  ],
);
assert.deepEqual(Array.from(perspectiveAnimationPlan.staticResourcePaths), ['perspective/materials/layer.png']);

const foliageSwayAnimationPlan = wallpaperEngineAnimationRenderer.createWeAnimationRenderPlan(foliageSwayEffectArchive.scenes[0]);
assert.equal(foliageSwayAnimationPlan.layers[0].textureEffects[0].kind, 'foliageSway');
assert.equal(foliageSwayAnimationPlan.layers[0].textureEffects[0].direction, -0.45);
assert.equal(foliageSwayAnimationPlan.layers[0].textureEffects[0].maskPath, 'foliage/materials/masks/leaf_mask.png');
assert.equal(foliageSwayAnimationPlan.layers[1].textureEffects[0].noisePath, 'foliage/materials/noise/custom_noise.png');
assert.deepEqual(
  Array.from(foliageSwayAnimationPlan.staticResourcePaths),
  [
    'foliage/materials/layer.png',
    'foliage/materials/masks/leaf_mask.png',
    'foliage/materials/noise/custom_noise.png',
  ],
);


const waterFlowAnimationPlan = wallpaperEngineAnimationRenderer.createWeAnimationRenderPlan(waterFlowEffectArchive.scenes[0]);
assert.equal(waterFlowAnimationPlan.layers[0].textureEffects[0].kind, 'waterFlow');
assert.equal(waterFlowAnimationPlan.layers[0].textureEffects[0].phaseMode, 'legacy');
assert.equal(waterFlowAnimationPlan.layers[1].textureEffects[0].flowMapPath, null);
assert.equal(waterFlowAnimationPlan.layers[2].textureEffects[0].feather, 0.4);
assert.deepEqual(
  Array.from(waterFlowAnimationPlan.staticResourcePaths),
  [
    'waterflow/materials/layer.png',
    'waterflow/materials/masks/flow_legacy.png',
    'waterflow/materials/effects/waterflowphase.png',
    'waterflow/materials/masks/flow_feather.png',
  ],
);

const shakeAnimationPlan = wallpaperEngineAnimationRenderer.createWeAnimationRenderPlan(shakeEffectArchive.scenes[0]);
assert.equal(shakeAnimationPlan.layers[0].textureEffects[0].kind, 'shake');
assert.deepEqual({ ...shakeAnimationPlan.layers[0].textureEffects[0].friction }, { x: 1.5, y: 2 });
assert.deepEqual({ ...shakeAnimationPlan.layers[0].textureEffects[0].bounds }, { x: 0.1, y: 0.9 });
assert.equal(shakeAnimationPlan.layers[1].textureEffects[0].directionMode, 1);
assert.deepEqual(
  Array.from(shakeAnimationPlan.staticResourcePaths),
  ['shake/materials/layer.png', 'shake/materials/masks/shake_direction.png'],
);

const blurPreciseAnimationPlan = wallpaperEngineAnimationRenderer.createWeAnimationRenderPlan(blurPreciseEffectArchive.scenes[0]);
assert.equal(blurPreciseAnimationPlan.layers[0].textureEffects[0].kind, 'blurPrecise');
assert.deepEqual({ ...blurPreciseAnimationPlan.layers[0].textureEffects[0].scale }, { x: 1.17, y: 1.17 });
assert.equal(blurPreciseAnimationPlan.layers[0].textureEffects[0].blurAlpha, false);
assert.deepEqual(
  Array.from(blurPreciseAnimationPlan.staticResourcePaths),
  ['blurprecise/materials/layer.png', 'blurprecise/materials/masks/blur_mask.png'],
);

const shineAnimationPlan = wallpaperEngineAnimationRenderer.createWeAnimationRenderPlan(shineEffectArchive.scenes[0]);
assert.equal(shineAnimationPlan.layers[0].textureEffects[0].kind, 'shine');
assert.equal(shineAnimationPlan.layers[0].textureEffects[0].rayDirection, -0.75);
assert.equal(shineAnimationPlan.layers[0].textureEffects[0].raySpeed, -0.3);
assert.deepEqual({ ...shineAnimationPlan.layers[0].textureEffects[0].blurScale }, { x: 1.2, y: 1.2 });
assert.deepEqual(
  Array.from(shineAnimationPlan.staticResourcePaths),
  [
    'shine/materials/layer.png',
    'shine/materials/masks/shine_mask.png',
    'shine/materials/noise/custom_clouds.png',
  ],
);

const godRaysAnimationPlan = wallpaperEngineAnimationRenderer.createWeAnimationRenderPlan(godRaysEffectArchive.scenes[0]);
assert.equal(godRaysAnimationPlan.layers[0].textureEffects[0].kind, 'godRays');
assert.equal(godRaysAnimationPlan.layers[0].textureEffects[0].caster.mode, 'radial');
assert.deepEqual(
  { ...godRaysAnimationPlan.layers[0].textureEffects[0].caster.center },
  { x: 0.6407873630523682, y: 1 - 0.2960065007209778 },
);
assert.equal(godRaysAnimationPlan.layers[1].textureEffects[0].caster.direction, -0.6);
assert.deepEqual(
  Array.from(godRaysAnimationPlan.staticResourcePaths),
  ['godrays/materials/layer.png', 'godrays/materials/masks/rays_mask.png'],
);

// Step 13 renderer regression: God Rays reuses the Shine half-resolution pair,
// keeps the canonical radial center as a position semantic converted only at the
// renderer-plan boundary, and preserves the explicit 7-tap default Gaussian.
// Step 12.1 renderer regression: preserve WE's canonical shine noise swizzle
// (vertex writes .wz, fragment samples .zw) after WE -> browser Y reflection,
// and keep feature/tool renderer mirrors byte-identical.
const imageEffectRendererSource = fs.readFileSync(
  path.resolve(root, 'features/theme/components/Background/WeImageEffectLayer.tsx'),
  'utf8',
);
const imageEffectRendererToolSource = fs.readFileSync(
  path.resolve(root, 'tools/features/theme/components/Background/WeImageEffectLayer.tsx'),
  'utf8',
);
assert.equal(imageEffectRendererToolSource, imageEffectRendererSource);
assert.match(imageEffectRendererSource, /const OPACITY_FRAGMENT_SHADER/);
assert.match(imageEffectRendererSource, /gl_FragColor = color \* \(mask \* u_Alpha\)/);
assert.match(imageEffectRendererSource, /effect\.kind === 'opacity'/);
assert.match(imageEffectRendererSource, /frameCallbackRef/);
assert.match(imageEffectRendererSource, /gl!\.flush\(\);/);
assert.match(imageEffectRendererSource, /frameCallback\(canvas\);/);
assert.match(imageEffectRendererSource, /uniform int u_BlendMode/);
assert.match(imageEffectRendererSource, /if \(mode == 22\) return mix\(base, blendReflect\(blend, base\), opacity\)/);
assert.match(imageEffectRendererSource, /uniform1i\(rayCombineLocations\.blendMode, effect\.blendMode\)/);

const textEffectRendererSource = fs.readFileSync(
  path.resolve(root, 'features/theme/components/Background/WeTextEffectLayer.tsx'),
  'utf8',
);
const textEffectRendererToolSource = fs.readFileSync(
  path.resolve(root, 'tools/features/theme/components/Background/WeTextEffectLayer.tsx'),
  'utf8',
);
assert.equal(textEffectRendererToolSource, textEffectRendererSource);
assert.match(textEffectRendererSource, /document\.fonts\.load/);
assert.match(textEffectRendererSource, /rasterizeTextSurface/);
assert.match(textEffectRendererSource, /<WeImageEffectLayer/);

const sceneRendererSource = fs.readFileSync(
  path.resolve(root, 'features/theme/components/Background/WeSceneRenderer.tsx'),
  'utf8',
);
const sceneRendererToolSource = fs.readFileSync(
  path.resolve(root, 'tools/features/theme/components/Background/WeSceneRenderer.tsx'),
  'utf8',
);
assert.equal(sceneRendererToolSource, sceneRendererSource);
assert.match(sceneRendererSource, /<WeTextEffectLayer/);
assert.match(sceneRendererSource, /resolveRuntimeTextureEffects/);
const puppetMeshRendererSource = fs.readFileSync(
  path.resolve(root, 'features/theme/components/Background/WePuppetMeshLayer.tsx'),
  'utf8',
);
const puppetMeshRendererToolSource = fs.readFileSync(
  path.resolve(root, 'tools/features/theme/components/Background/WePuppetMeshLayer.tsx'),
  'utf8',
);
assert.equal(puppetMeshRendererToolSource, puppetMeshRendererSource);
assert.match(puppetMeshRendererSource, /updateTexture: \(source: TexImageSource\)/);
assert.match(puppetMeshRendererSource, /gl\.texImage2D\(gl\.TEXTURE_2D, 0, gl\.RGBA, gl\.RGBA, gl\.UNSIGNED_BYTE, source\)/);
assert.match(puppetMeshRendererSource, /parseWallpaperEnginePuppetModel/);
assert.match(puppetMeshRendererSource, /createWallpaperEnginePuppet2dSkinningState/);
assert.match(puppetMeshRendererSource, /renderWallpaperEngineSharedPuppetFrame/);
assert.match(puppetMeshRendererSource, /animationMode === 'orthographic3d'/);
assert.match(puppetMeshRendererSource, /canvas\.getContext\('2d'\)/);
assert.match(puppetMeshRendererSource, /gl\.bufferSubData\(gl\.ARRAY_BUFFER, 0, positions\)/);
const sharedPuppetRendererSource = fs.readFileSync(
  path.resolve(root, 'features/theme/utils/wallpaperEnginePuppetSharedRenderer.ts'),
  'utf8',
);
const sharedPuppetRendererToolSource = fs.readFileSync(
  path.resolve(root, 'tools/features/theme/utils/wallpaperEnginePuppetSharedRenderer.ts'),
  'utf8',
);
assert.equal(sharedPuppetRendererToolSource, sharedPuppetRendererSource);
assert.match(sharedPuppetRendererSource, /preserveDrawingBuffer: true/);
assert.match(sharedPuppetRendererSource, /targetContext\.drawImage\(canvas/);
assert.match(sharedPuppetRendererSource, /releaseWallpaperEngineSharedPuppetTexture/);
assert.match(sharedPuppetRendererSource, /webglcontextlost/);
const puppetTextureEffectSource = fs.readFileSync(
  path.resolve(root, 'features/theme/components/Background/WePuppetTextureEffectLayer.tsx'),
  'utf8',
);
const puppetTextureEffectToolSource = fs.readFileSync(
  path.resolve(root, 'tools/features/theme/components/Background/WePuppetTextureEffectLayer.tsx'),
  'utf8',
);
assert.equal(puppetTextureEffectToolSource, puppetTextureEffectSource);
assert.match(puppetTextureEffectSource, /run the ordinary image-effect chain on the atlas first/);
assert.match(puppetTextureEffectSource, /onFrame=\{handleAtlasFrame\}/);
assert.match(imageEffectRendererSource, /effect\.kind === 'shine' \|\| effect\.kind === 'godRays'/);
assert.match(imageEffectRendererSource, /const GOD_RAYS_DOWNSAMPLE_FRAGMENT_SHADER =/);
assert.match(imageEffectRendererSource, /const GOD_RAYS_CAST_FRAGMENT_SHADER =/);
assert.match(imageEffectRendererSource, /const RAY_GAUSSIAN_FRAGMENT_SHADER =/);
assert.match(imageEffectRendererSource, /if \(u_SampleMode == 0\) return 30\.0;/);
assert.match(imageEffectRendererSource, /if \(u_SampleMode == 1\) return 50\.0;/);
assert.match(imageEffectRendererSource, /return 70\.0;/);
assert.match(imageEffectRendererSource, /texture2D\(u_Source, uv\) \* 0\.214607/);
assert.match(imageEffectRendererSource, /raySample\.rgb \*= mix\(u_ColorEnd, u_ColorStart, progress\);/);
assert.ok(imageEffectRendererSource.includes(
  '(-v_TexCoord.x * 0.633 + drift * 0.5) * u_NoiseScale',
));
assert.ok(imageEffectRendererSource.includes(
  '1.0 - (((1.0 - v_TexCoord.y) * 0.633 - drift * 0.5) * u_NoiseScale)',
));
assert.ok(imageEffectRendererSource.includes('const fallBackToSource = (error: unknown) => {'));
assert.ok(imageEffectRendererSource.includes('const drawSafely = (now: number) => {'));
assert.ok(imageEffectRendererSource.includes('fallBackToSource(error);'));

const waterRippleAnimationPlan = wallpaperEngineAnimationRenderer.createWeAnimationRenderPlan(waterRippleEffectArchive.scenes[0]);
assert.equal(waterRippleAnimationPlan.layers[0].textureEffects[0].kind, 'waterRipple');
assert.equal(waterRippleAnimationPlan.layers[0].textureEffects[0].direction, -0.4);
assert.equal(waterRippleAnimationPlan.layers[1].textureEffects[0].maskPath, 'waterripple/materials/masks/ripple_mask.png');
assert.deepEqual(
  Array.from(waterRippleAnimationPlan.staticResourcePaths),
  [
    'waterripple/materials/layer.png',
    'waterripple/materials/effects/waterripplenormal.png',
    'waterripple/materials/masks/ripple_mask.png',
  ],
);

const legacySpinAnimationPlan = wallpaperEngineAnimationRenderer.createWeAnimationRenderPlan(legacySpinEffectArchive.scenes[0]);
assert.equal(legacySpinAnimationPlan.layers[0].textureEffects[0].softMask, false);
assert.equal(legacySpinAnimationPlan.layers[0].textureEffects[0].aspectCorrect, false);
assert.equal(legacySpinAnimationPlan.layers[0].textureEffects[0].speed, -0.3);
assert.equal(waterWavesAnimationPlan.staticResourcePaths.includes('waterwaves/materials/masks/wave_mask.png'), true);
assert.equal(waterWavesAnimationPlan.staticResourcePaths.includes('waterwaves/materials/masks/time_offset.png'), true);
const compositionAnimationPlan = wallpaperEngineAnimationRenderer.createWeAnimationRenderPlan(compositionArchive.scenes[0]);
assert.equal(compositionAnimationPlan.layers.length, 1);
assert.equal(compositionAnimationPlan.layers[0].source.kind, 'composition');
assert.equal(wallpaperEngineAnimationRenderer.getWeAnimationLayerSourcePath(compositionAnimationPlan.layers[0], 0), null);
assert.deepEqual(
  Array.from(compositionAnimationPlan.staticResourcePaths),
  ['composition/materials/base.png', 'composition/materials/mask.png'],
);
const animationPlan = wallpaperEngineAnimationRenderer.createWeAnimationRenderPlan(autoArchive.scenes[0]);
const solidAnimationPlan = wallpaperEngineAnimationRenderer.createWeAnimationRenderPlan(solidArchive.scenes[0]);
const textAnimationPlan = wallpaperEngineAnimationRenderer.createWeAnimationRenderPlan(textArchive.scenes[0]);
assert.equal(textAnimationPlan.layers[0].source.kind, 'text');
assert.equal(textAnimationPlan.layers[0].source.text, '12:34');
assert.equal(textAnimationPlan.layers[0].source.fontReference, 'fonts/Clock Font.ttf');
assert.deepEqual(Array.from(textAnimationPlan.staticResourcePaths), ['text/fonts/Clock Font.ttf']);
const builtinFontTextAnimationPlan = wallpaperEngineAnimationRenderer.createWeAnimationRenderPlan(
  builtinFontTextArchive.scenes[0],
);
assert.equal(builtinFontTextAnimationPlan.layers[0].source.kind, 'text');
assert.equal(builtinFontTextAnimationPlan.layers[0].source.fontReference, 'fonts/Monofur-PK7og.ttf');
assert.equal(builtinFontTextAnimationPlan.layers[0].source.fontPath, null);
assert.deepEqual(Array.from(builtinFontTextAnimationPlan.staticResourcePaths), []);
const legacyBuiltinFontScene = JSON.parse(JSON.stringify(builtinFontTextArchive.scenes[0]));
delete legacyBuiltinFontScene.layers[0].source.fontReference;
assert.equal(wallpaperEngineStaticRenderer.isImportedWeScene(legacyBuiltinFontScene), true);
const legacyBuiltinFontAnimationPlan = wallpaperEngineAnimationRenderer.createWeAnimationRenderPlan(
  legacyBuiltinFontScene,
);
assert.equal(
  legacyBuiltinFontAnimationPlan.layers[0].source.fontReference,
  'fonts/Monofur-PK7og.ttf',
);
assert.equal(wallpaperEngineAnimationRenderer.getWeAnimationLayerSourcePath(textAnimationPlan.layers[0], 0), null);
assert.deepEqual(
  Array.from(wallpaperEngineAnimationRenderer.getWeAnimationResourceWindow(textAnimationPlan, 0)),
  ['text/fonts/Clock Font.ttf'],
);
const dynamicTextAnimationPlan = wallpaperEngineAnimationRenderer.createWeAnimationRenderPlan(dynamicTextArchive.scenes[0]);
assert.equal(dynamicTextAnimationPlan.layers[0].source.kind, 'text');
assert.equal(dynamicTextAnimationPlan.layers[0].source.dynamicText.refresh, 'second');
assert.equal(dynamicTextAnimationPlan.layers[1].source.dynamicText.refresh, 'day');
assert.equal(solidAnimationPlan.layers[0].source.kind, 'solidColor');
assert.equal(wallpaperEngineAnimationRenderer.getWeAnimationLayerSourcePath(solidAnimationPlan.layers[0], 0), null);
assert.deepEqual(
  Array.from(wallpaperEngineAnimationRenderer.getWeAnimationResourceWindow(solidAnimationPlan, 0)),
  ['solid/materials/foreground.png'],
);

assert.equal(animationPlan.animationLayerCount, 1);
assert.equal(animationPlan.fallbackTimingLayerCount, 1);
const propertyAnimationPlan = wallpaperEngineAnimationRenderer.createWeAnimationRenderPlan(
  propertyAnimationArchive.scenes[0],
);
assert.equal(propertyAnimationPlan.propertyAnimationLayerCount, 1);
assert.equal(propertyAnimationPlan.layers[0].centerAnimations.length, 2);
const singleAnimation = {
  fps: 10,
  lengthFrames: 10,
  mode: 'single',
  x: [{ frame: 0, value: 0 }, { frame: 10, value: 100 }],
  y: [{ frame: 0, value: 0 }, { frame: 10, value: -50 }],
};
const loopAnimation = { ...singleAnimation, mode: 'loop' };
const mirrorAnimation = { ...singleAnimation, mode: 'mirror' };
assert.equal(wallpaperEngineAnimationRenderer.getWePointAnimationFramePosition(singleAnimation, 2000), 10);
assert.equal(wallpaperEngineAnimationRenderer.getWePointAnimationFramePosition(loopAnimation, 1250), 2.5);
assert.equal(wallpaperEngineAnimationRenderer.getWePointAnimationFramePosition(mirrorAnimation, 1250), 7.5);
assert.deepEqual(
  { ...wallpaperEngineAnimationRenderer.getWePointAnimationOffset(singleAnimation, 500) },
  { x: 50, y: -25 },
);
assert.deepEqual(
  { ...wallpaperEngineAnimationRenderer.getWePointAnimationOffset(loopAnimation, 1250) },
  { x: 25, y: -12.5 },
);
assert.deepEqual(
  { ...wallpaperEngineAnimationRenderer.getWePointAnimationOffset(mirrorAnimation, 1250) },
  { x: 75, y: -37.5 },
);
const propertyAnimatedCenter = wallpaperEngineAnimationRenderer.getWeAnimatedLayerCenter(
  propertyAnimationPlan.layers[0],
  500,
);
// At 500ms: inherited root offset=(10,+5); reflected -90° parent rotation maps the child offset to (-90,-30).
assert.ok(Math.abs(propertyAnimatedCenter.x - (propertyAnimationPlan.layers[0].center.x - 80)) < 1e-9);
assert.ok(Math.abs(propertyAnimatedCenter.y - (propertyAnimationPlan.layers[0].center.y - 25)) < 1e-9);
assert.equal(animationPlan.layers[0].source.kind, 'frameAnimation');
assert.equal(animationPlan.layers[0].source.fps, wallpaperEngineAnimationRenderer.DEFAULT_WE_FRAME_ANIMATION_FPS);
assert.equal(animationPlan.layers[0].source.timingSource, 'fallback');
assert.equal(wallpaperEngineAnimationRenderer.getWeAnimationFrameIndex(0, 30, 4), 0);
assert.equal(wallpaperEngineAnimationRenderer.getWeAnimationFrameIndex(34, 30, 4), 1);
assert.equal(wallpaperEngineAnimationRenderer.getWeAnimationFrameIndex(134, 30, 4), 0);
assert.equal(wallpaperEngineAnimationRenderer.getWeAnimationFrameIndex(Number.NaN, 30, 4), 0);

const retainedFrameScene = JSON.parse(JSON.stringify(autoArchive.scenes[0]));
retainedFrameScene.layers[0].source.frames = Array.from(
  { length: 12 },
  (_, index) => `auto/materials/background_${index}.png`,
);
const retainedFramePlan = wallpaperEngineAnimationRenderer.createWeAnimationRenderPlan(retainedFrameScene);
assert.deepEqual(
  Array.from(
    wallpaperEngineAnimationRenderer.getWeAnimationLayerSourceCandidates(
      retainedFramePlan.layers[0],
      300,
      'auto/materials/background_0.png',
    ),
  ),
  [
    'auto/materials/background_9.png',
    'auto/materials/background_8.png',
    'auto/materials/background_10.png',
    'auto/materials/background_0.png',
  ],
);

const fourFrameScene = JSON.parse(JSON.stringify(autoArchive.scenes[0]));
fourFrameScene.layers[0].source.frames = [
  'auto/materials/background_0.png',
  'auto/materials/background_1.png',
  'auto/materials/background_2.png',
  'auto/materials/background_3.png',
];
const fourFramePlan = wallpaperEngineAnimationRenderer.createWeAnimationRenderPlan(fourFrameScene);
assert.deepEqual(
  Array.from(wallpaperEngineAnimationRenderer.getWeAnimationResourceWindow(fourFramePlan, 0)),
  [
    'auto/materials/background_0.png',
    'auto/materials/background_1.png',
    'auto/materials/background_2.png',
    'auto/materials/background_3.png',
  ],
);
assert.deepEqual(
  Array.from(wallpaperEngineAnimationRenderer.getWeAnimationResourceWindow(fourFramePlan, 40)),
  [
    'auto/materials/background_1.png',
    'auto/materials/background_2.png',
    'auto/materials/background_3.png',
    'auto/materials/background_0.png',
  ],
);
const metadataFpsScene = JSON.parse(JSON.stringify(autoArchive.scenes[0]));
metadataFpsScene.layers[0].source.fps = 12;
const metadataFpsPlan = wallpaperEngineAnimationRenderer.createWeAnimationRenderPlan(metadataFpsScene);
assert.equal(metadataFpsPlan.layers[0].source.fps, 12);
assert.equal(metadataFpsPlan.layers[0].source.timingSource, 'metadata');
assert.equal(metadataFpsPlan.fallbackTimingLayerCount, 0);
assert.equal(wallpaperEngineAnimationRenderer.createWeAnimationRenderPlan(malformedSourceScene), null);
const legacyAnimationPlan = wallpaperEngineAnimationRenderer.createWeAnimationRenderPlan(legacySceneWithoutParallax);
assert.equal(legacyAnimationPlan.cameraParallax.enabled, false);

const wallpaperEngineParallaxRenderer = loadTsModule('features/theme/utils/wallpaperEngineParallaxRenderer.ts');
assert.deepEqual(
  { ...wallpaperEngineParallaxRenderer.getWeNormalizedPointer(1000, 0, { width: 1000, height: 500 }) },
  { x: 1, y: -1 },
);
const parallaxOffset = wallpaperEngineParallaxRenderer.getWeParallaxLayerOffset(
  { width: 1000, height: 500 },
  { enabled: true, amount: 0.5, delay: 0.1, mouseInfluence: 0.2 },
  { x: 1, y: -0.5 },
  { x: 1, y: -1 },
);
assert.deepEqual({ ...parallaxOffset }, { x: -50, y: -12.5 });
assert.deepEqual(
  { ...wallpaperEngineParallaxRenderer.getWeParallaxLayerOffset(
    { width: 1000, height: 500 },
    { enabled: false, amount: 0.5, delay: 0.1, mouseInfluence: 0.2 },
    { x: 1, y: 1 },
    { x: 1, y: 1 },
  ) },
  { x: 0, y: 0 },
);
assert.deepEqual(
  { ...wallpaperEngineParallaxRenderer.getWeParallaxLayerOffset(
    { width: 1000, height: 500 },
    { enabled: true, amount: 0.5, delay: 0.1, mouseInfluence: 0.2 },
    { x: 0, y: 0 },
    { x: 1, y: -1 },
    { cameraDepth: { x: 0.1, y: 0.05 }, relativeScale: 0.25, relativeDepthCap: 0.05 },
  ) },
  { x: 0, y: 0 },
);
assert.deepEqual(
  { ...wallpaperEngineParallaxRenderer.getWeParallaxLayerOffset(
    { width: 1000, height: 500 },
    { enabled: true, amount: 0.5, delay: 0.1, mouseInfluence: 0.2 },
    { x: 0.2, y: -0.1 },
    { x: 1, y: -1 },
    { cameraDepth: { x: 0.1, y: 0.05 }, relativeScale: 0.25, relativeDepthCap: 0.05 },
  ) },
  { x: -2.5, y: -0.625 },
);
assert.deepEqual(
  { ...wallpaperEngineParallaxRenderer.getWeParallaxCameraOffset(
    { width: 1000, height: 500 },
    { enabled: true, amount: 0.5, delay: 0.1, mouseInfluence: 0.2 },
    { cameraDepth: { x: 0.1, y: 0.05 }, relativeScale: 0.25, relativeDepthCap: 0.05 },
    { x: 1, y: -1 },
  ) },
  { x: -5, y: 1.25 },
);
assert.ok(wallpaperEngineParallaxRenderer.getWeParallaxCameraOverscan(
  { width: 1000, height: 500 },
  { enabled: true, amount: 0.5, delay: 0.1, mouseInfluence: 0.2 },
  { cameraDepth: { x: 0.1, y: 0.05 }, relativeScale: 0.25, relativeDepthCap: 0.05 },
) > 1);
const smoothedPointer = wallpaperEngineParallaxRenderer.stepWeParallaxPointer(
  { x: 0, y: 0 },
  { x: 1, y: -1 },
  0.1,
  100,
);
assert.ok(smoothedPointer.x > 0 && smoothedPointer.x < 1);
assert.ok(smoothedPointer.y < 0 && smoothedPointer.y > -1);
assert.deepEqual(
  { ...wallpaperEngineParallaxRenderer.stepWeParallaxPointer({ x: 0, y: 0 }, { x: 1, y: -1 }, 0, 16) },
  { x: 1, y: -1 },
);

const parallaxCameraScene = {
  ...legacySceneWithoutParallax,
  cameraParallax: { enabled: true, amount: 0.5, delay: 0.1, mouseInfluence: 0.2 },
  layers: [
    {
      ...legacySceneWithoutParallax.layers[0],
      id: 'bg',
      parallax: null,
      size: { width: 1000, height: 500 },
    },
    {
      ...legacySceneWithoutParallax.layers[0],
      id: 'fg1',
      center: { x: 10, y: 10 },
      parallax: { x: 0.06, y: 0.03 },
      size: { width: 300, height: 200 },
    },
    {
      ...legacySceneWithoutParallax.layers[0],
      id: 'fg2',
      center: { x: 20, y: 20 },
      parallax: { x: 0.12, y: 0.06 },
      size: { width: 250, height: 150 },
    },
  ],
};
const parallaxCameraPlan = wallpaperEngineAnimationRenderer.createWeAnimationRenderPlan(parallaxCameraScene);
assert.equal(parallaxCameraPlan.cameraParallaxSceneMotion.cameraDepth.x, 0.102);
assert.equal(parallaxCameraPlan.cameraParallaxSceneMotion.cameraDepth.y, 0.051);
assert.equal(parallaxCameraPlan.cameraParallaxSceneMotion.relativeScale, 0.25);
assert.equal(parallaxCameraPlan.cameraParallaxSceneMotion.relativeDepthCap, 0.05);

const wallpaperEnginePostProcessRenderer = loadTsModule('features/theme/utils/wallpaperEnginePostProcessRenderer.ts');
const chromaticOffsets = wallpaperEnginePostProcessRenderer.getWeChromaticAberrationChannelOffsets(
  { width: 1000, height: 500 },
  {
    kind: 'chromaticAberration',
    center: { x: 0.5, y: 0.5 },
    centerFalloff: 1,
    strength: 0.2,
    direction: Math.PI / 2,
    mode: 0,
    variation: 0,
  },
);
assert.equal(chromaticOffsets.red.x, 1);
assert.equal(chromaticOffsets.red.y, 0);
assert.equal(chromaticOffsets.green.x, 0);
assert.equal(chromaticOffsets.blue.x, -1);

const directionalChromaticOffsets = wallpaperEnginePostProcessRenderer.getWeChromaticAberrationChannelOffsets(
  { width: 1000, height: 500 },
  {
    kind: 'chromaticAberration',
    center: { x: 0.5, y: 0.5 },
    centerFalloff: 1,
    strength: 0.2,
    direction: 0,
    mode: 1,
    variation: 1,
  },
);
assert.equal(directionalChromaticOffsets.red.x, 0);
assert.equal(directionalChromaticOffsets.red.y, 0);
assert.equal(directionalChromaticOffsets.green.x, 0);
assert.equal(directionalChromaticOffsets.green.y, -2);
assert.equal(directionalChromaticOffsets.blue.x, 0);
assert.equal(directionalChromaticOffsets.blue.y, 2);

const postProcessScene = {
  ...legacySceneWithoutParallax,
  postProcessEffects: [{
    kind: 'chromaticAberration',
    center: { x: 0.5, y: 0.5 },
    centerFalloff: 1,
    strength: 0.2,
    direction: 0,
    mode: 0,
    variation: 0,
  }],
};
const postProcessPlan = wallpaperEngineAnimationRenderer.createWeAnimationRenderPlan(postProcessScene);
assert.equal(postProcessPlan.postProcessEffects.length, 1);
assert.equal(postProcessPlan.postProcessEffects[0].kind, 'chromaticAberration');
assert.equal(postProcessPlan.postProcessEffects[0].strength, 0.2);

const shimmerScene = JSON.parse(JSON.stringify(legacySceneWithoutParallax));
shimmerScene.layers[0].textureEffects = [{
  kind: 'shimmer',
  brightness: 0.75,
  color: { r: 1, g: 1, b: 1 },
  delay: 5,
  direction: -Math.PI / 2,
  granularity: 1,
  offset: 0,
  speed: 0.75,
}];
const shimmerPlan = wallpaperEngineAnimationRenderer.createWeAnimationRenderPlan(shimmerScene);
assert.ok(shimmerPlan);
assert.equal(shimmerPlan.layers[0].textureEffects.length, 1);
assert.equal(shimmerPlan.layers[0].textureEffects[0].kind, 'shimmer');
assert.equal(shimmerPlan.layers[0].textureEffects[0].brightness, 0.75);

const translationProviders = loadTsModule('features/translation/services/translationProviders.ts');
assert.equal(translationProviders.parseBaiduTranslation({ trans_result: [{ src: 'apple', dst: '苹果' }] }), '苹果');
assert.equal(translationProviders.parseBaiduTranslation({ error_code: '54001' }), '');
assert.equal(translationProviders.getTranslatorWebUrl('baidu', 'hello world', 'auto', 'zh-CN'), 'https://fanyi.baidu.com/#auto/zh/hello%20world');

const widgetFormatters = loadTsModule('features/widgets/utils/widgetFormatters.ts');
assert.equal(widgetFormatters.parseGoogleTranslation([[['你好'], ['世界']]]), '你好世界');
assert.equal(widgetFormatters.getLanguageLabel('ja'), '日语');
assert.equal(widgetFormatters.getWeatherText(63), '降雨');
assert.equal(widgetFormatters.getWindDirectionText(90), '东');
assert.equal(
  widgetFormatters.getCountdownDays(new Date(2026, 7, 8), new Date(2026, 7, 6)),
  2,
);

const stickerNavigation = loadTsModule('features/shelf/utils/stickerNavigation.ts');
assert.equal(stickerNavigation.normalizeStickerAnchorId('# 项目 开始 '), '项目-开始');
assert.equal(stickerNavigation.normalizeStickerAnchorId('<span id="demo-anchor">'), 'demo-anchor');
assert.equal(stickerNavigation.normalizeStickerLinkTarget('#demo-anchor'), '#demo-anchor');
assert.equal(stickerNavigation.normalizeStickerLinkTarget('page:3@420,260'), 'page:3@420,260');
assert.equal(stickerNavigation.normalizeStickerLinkTarget('page:previous'), 'page:prev');
assert.equal(stickerNavigation.normalizeStickerLinkTarget('page:下一页'), 'page:next');
assert.equal(stickerNavigation.parseStickerLinkTarget('page:3')?.kind, 'page');
assert.equal(stickerNavigation.parseStickerLinkTarget('page:prev')?.kind, 'previous');
assert.equal(stickerNavigation.parseStickerLinkTarget('page:next')?.kind, 'next');
assert.equal(stickerNavigation.normalizeStickerLinkTarget('page:3 else 1'), 'page:3 else 1');
assert.equal(stickerNavigation.normalizeStickerLinkTarget('page:3 else page:1'), 'page:3 else 1');
assert.equal(stickerNavigation.parseStickerLinkTarget('page:3 else 1')?.kind, 'conditional');
assert.equal(stickerNavigation.normalizeStickerLinkTarget('toggle:3,1'), 'page:3 else 1');
assert.equal(stickerNavigation.normalizeStickerLinkTarget('if page==3 then page:1 else next'), 'if page=3 then 1 else next');
assert.equal(stickerNavigation.normalizeStickerLinkTarget('如果 page!=3 则 3 否则 1'), 'if page!=3 then 3 else 1');
assert.equal(stickerNavigation.parseStickerLinkTarget('if page>=3 then prev else next')?.kind, 'condition');
const anchorRequest = stickerNavigation.resolveStickerNavigationRequest('#target', [
  { id: 'target-id', type: 'text', content: '目标', x: 120, y: 1600, pageId: 'page-1', anchorId: 'target' },
], { height: 800, scale: 1 });
assert.equal(anchorRequest?.pageIndex, 1);
assert.equal(anchorRequest?.focusStickerId, 'target-id');
assert.equal(anchorRequest?.scrollTop, 1296);
const coordinateRequest = stickerNavigation.resolveStickerNavigationRequest('page:4@300,220', [], { height: 800, scale: 1 });
assert.equal(coordinateRequest?.pageIndex, 1);
assert.equal(coordinateRequest?.scrollTop, 1600);
assert.equal(coordinateRequest?.coordinate?.x, 300);
const horizontalPageRequest = stickerNavigation.resolveStickerNavigationRequest('page:4', [], {
  height: 800, scale: 1, currentPageIndex: 1, layoutMode: 'horizontal',
});
assert.equal(horizontalPageRequest?.pageIndex, 3);
assert.equal(horizontalPageRequest?.scrollTop, 0);
const horizontalAnchorRequest = stickerNavigation.resolveStickerNavigationRequest('#far-right', [
  { id: 'far-right-id', type: 'text', content: '目标', x: 120, y: 320, pageId: 'page-4', anchorId: 'far-right' },
], { height: 800, scale: 1, currentPageIndex: 2, layoutMode: 'horizontal' });
assert.equal(horizontalAnchorRequest?.pageIndex, 4);
const horizontalNextRequest = stickerNavigation.resolveStickerNavigationRequest('page:next', [], {
  height: 800, scale: 1, currentPageIndex: 3, currentScrollTop: 0, layoutMode: 'horizontal',
});
assert.equal(horizontalNextRequest?.pageIndex, 4);
const horizontalPrevRequest = stickerNavigation.resolveStickerNavigationRequest('page:prev', [], {
  height: 800, scale: 1, currentPageIndex: 3, currentScrollTop: 0, layoutMode: 'horizontal',
});
assert.equal(horizontalPrevRequest?.pageIndex, 2);
const verticalNextRequest = stickerNavigation.resolveStickerNavigationRequest('page:next', [], {
  height: 800, scale: 1, currentPageIndex: 1, currentScrollTop: 800, layoutMode: 'vertical',
});
assert.equal(verticalNextRequest?.pageIndex, 1);
assert.equal(verticalNextRequest?.scrollTop, 1600);
const verticalPrevToHome = stickerNavigation.resolveStickerNavigationRequest('page:prev', [], {
  height: 800, scale: 1, currentPageIndex: 1, currentScrollTop: 0, layoutMode: 'vertical',
});
assert.equal(verticalPrevToHome?.pageIndex, 0);
assert.equal(verticalPrevToHome?.scrollTop, 0);
const conditionalToPrimary = stickerNavigation.resolveStickerNavigationRequest('page:3 else 1', [], {
  height: 800, scale: 1, currentPageIndex: 1, currentScrollTop: 0, layoutMode: 'vertical',
});
assert.equal(conditionalToPrimary?.pageIndex, 1);
assert.equal(conditionalToPrimary?.scrollTop, 800);
const conditionalToFallback = stickerNavigation.resolveStickerNavigationRequest('page:3 else 1', [], {
  height: 800, scale: 1, currentPageIndex: 1, currentScrollTop: 800, layoutMode: 'vertical',
});
assert.equal(conditionalToFallback?.pageIndex, 0);
assert.equal(conditionalToFallback?.scrollTop, 0);
const horizontalConditionalFallback = stickerNavigation.resolveStickerNavigationRequest('page:3 else page:1', [], {
  height: 800, scale: 1, currentPageIndex: 2, currentScrollTop: 0, layoutMode: 'horizontal',
});
assert.equal(horizontalConditionalFallback?.pageIndex, 0);
const advancedConditionTrue = stickerNavigation.resolveStickerNavigationRequest('if page=3 then 1 else 2', [], {
  height: 800, scale: 1, currentPageIndex: 1, currentScrollTop: 800, layoutMode: 'vertical',
});
assert.equal(advancedConditionTrue?.pageIndex, 0);
assert.equal(advancedConditionTrue?.scrollTop, 0);
const advancedConditionRelative = stickerNavigation.resolveStickerNavigationRequest('if page!=3 then 4 else next', [], {
  height: 800, scale: 1, currentPageIndex: 1, currentScrollTop: 800, layoutMode: 'vertical',
});
assert.equal(advancedConditionRelative?.pageIndex, 1);
assert.equal(advancedConditionRelative?.scrollTop, 1600);
const horizontalAdvancedCondition = stickerNavigation.resolveStickerNavigationRequest('if page>=4 then prev else next', [], {
  height: 800, scale: 1, currentPageIndex: 3, currentScrollTop: 0, layoutMode: 'horizontal',
});
assert.equal(horizontalAdvancedCondition?.pageIndex, 2);
assert.equal(horizontalAnchorRequest?.scrollTop, 0);


const sceneStacking = loadTsModule('shared/utils/sceneStacking.ts');
assert.equal(sceneStacking.normalizeScenePriority(1200.8), 999);
assert.equal(sceneStacking.normalizeScenePriority(-1200.8), -999);
assert.ok(sceneStacking.resolveSceneZIndex(-999, 0) > 0);
assert.ok(sceneStacking.resolveSceneZIndex(1, 0) > sceneStacking.resolveSceneZIndex(0, sceneStacking.SCENE_LOCAL_LAYER_MAX));
assert.ok(sceneStacking.SCENE_DRAGGING_Z_INDEX > sceneStacking.resolveSceneZIndex(999, sceneStacking.SCENE_LOCAL_LAYER_MAX));

const widgetStacking = loadTsModule('features/widgets/utils/widgetStacking.ts');
const stackingWidgets = [
  { id: 'blank', type: 'gtrend', pageId: 1, x: 0, y: 0, w: 100, h: 80, priority: 0 },
  { id: 'clock-above', type: 'clock', pageId: 1, x: 0, y: 0, w: 220, h: 140, priority: 0 },
  { id: 'high-priority', type: 'notes', pageId: 1, x: 0, y: 0, w: 240, h: 180, priority: 2 },
];
const raisedWidgets = widgetStacking.raiseWidgetAmongPriorityPeers(stackingWidgets, 'blank');
assert.equal(raisedWidgets.map((widget) => widget.id).join(','), 'clock-above,high-priority,blank');

const stickerVisibility = loadTsModule('features/shelf/utils/stickerVisibility.ts');
const visibilityInput = [
  { id: 'near', type: 'text', content: 'near', x: 0, y: 1500 },
  { id: 'far', type: 'text', content: 'far', x: 0, y: 9000 },
  { id: 'fixed', type: 'text', content: 'fixed', x: 0, y: 12000, positionMode: 'viewport' },
];
const visibleStickerIds = stickerVisibility.getRenderableStickers(visibilityInput, {
  pageIndex: 1, scrollY: 1200, viewportHeight: 800, viewportScale: 1,
}).map((sticker) => sticker.id);
assert.deepEqual(visibleStickerIds, ['near', 'fixed']);

const svgStickerPreview = loadTsModule('features/shelf/utils/svgStickerPreview.ts');
assert.equal(svgStickerPreview.getComplexSvgStickerPreviewSpec(
  '<svg width="256" height="256"><path d="M0 0L10 10Z" /></svg>',
), null);
const tracedSvg = `<svg width="9990" height="3669" desc="Created with imagetracer.js version 1.2.6">${'<path d="M0 0L1 1Z"/>'.repeat(900)}</svg>`;
const tracedPreview = svgStickerPreview.getComplexSvgStickerPreviewSpec(tracedSvg);
assert.equal(tracedPreview?.width, 1600);
assert.equal(tracedPreview?.height, 588);
assert.equal(tracedPreview?.pathCount, 900);

const pageHudVisibility = loadTsModule('features/widgets/utils/pageHudVisibility.ts');
const hudWidgets = [
  { id: 'page-3-widget', type: 'notes', pageId: 2, x: 10, y: 10, w: 240, h: 180 },
];
assert.equal(pageHudVisibility.shouldShowHorizontalEmptyPageHud([], 1), false);
assert.equal(pageHudVisibility.shouldShowHorizontalEmptyPageHud([], 2), true);
assert.equal(pageHudVisibility.shouldShowHorizontalEmptyPageHud(hudWidgets, 2), false);
assert.equal(pageHudVisibility.shouldShowHorizontalEmptyPageHud(hudWidgets, 3), true);
assert.equal(pageHudVisibility.shouldShowHorizontalEmptyPageHud([
  { id: 'fixed-global', type: 'clock', pageId: 0, positionMode: 'viewport', x: 0, y: 0, w: 220, h: 140 },
], 4), false);

const widgetPositionMode = loadTsModule('features/widgets/utils/widgetPositionMode.ts');
const fixedFromSecond = widgetPositionMode.getToggledWidgetPositionMode(
  { id: 'fixed-test', type: 'notes', pageId: 1, x: 100, y: 1450, w: 300, h: 220 },
  1,
  1200,
);
assert.equal(fixedFromSecond.positionMode, 'viewport');
assert.equal(fixedFromSecond.y, 250);
const restoredToSecond = widgetPositionMode.getToggledWidgetPositionMode(
  { id: 'fixed-test', type: 'notes', pageId: 1, positionMode: 'viewport', x: 100, y: 250, w: 300, h: 220 },
  1,
  1200,
);
assert.equal(restoredToSecond.positionMode, 'page');
assert.equal(restoredToSecond.y, 1450);
const fixedNegativeEdge = widgetPositionMode.getToggledWidgetPositionMode(
  { id: 'fixed-edge', type: 'notes', pageId: 0, x: 20, y: -40, w: 300, h: 220 },
  0,
  0,
);
assert.equal(fixedNegativeEdge.positionMode, 'viewport');
assert.equal(fixedNegativeEdge.y, -40);
const fixedBeyondOverflow = widgetPositionMode.getToggledWidgetPositionMode(
  { id: 'fixed-edge-limit', type: 'notes', pageId: 0, x: 20, y: -100, w: 300, h: 220 },
  0,
  0,
);
assert.equal(fixedBeyondOverflow.y, -55);

const widgetAnchors = loadTsModule('features/widgets/services/widgetAnchorService.ts');
assert.equal(widgetAnchors.findWidgetByAnchorId([
  { id: 'weather-target', type: 'weather', pageId: 1, x: 0, y: 900, w: 280, h: 176, anchorId: 'weather-main' },
], '#weather-main')?.id, 'weather-target');

const stickerPositioning = loadTsModule('features/shelf/utils/stickerPositioning.ts');
const baseStickerRect = { width: 100, height: 50 };
const clampedTextSticker = stickerPositioning.resolveStickerReleasePosition({
  stickerType: 'text', isPinned: false, proposedPosition: { x: -10, y: -5 }, stickerRect: baseStickerRect,
  viewportScale: 1, viewportWidth: 1000, viewportHeight: 800, effectiveScrollY: 0, infiniteY: false,
});
assert.equal(clampedTextSticker.x, -10);
assert.equal(clampedTextSticker.y, -5);
assert.equal(clampedTextSticker.adjusted, false);
const overflowClampedSticker = stickerPositioning.resolveStickerReleasePosition({
  stickerType: 'text', isPinned: false, proposedPosition: { x: -60, y: -40 }, stickerRect: baseStickerRect,
  viewportScale: 1, viewportWidth: 1000, viewportHeight: 800, effectiveScrollY: 0, infiniteY: false,
});
assert.equal(overflowClampedSticker.x, -25);
assert.equal(overflowClampedSticker.y, -12.5);
assert.equal(overflowClampedSticker.adjusted, true);
const freeDrawingSticker = stickerPositioning.resolveStickerReleasePosition({
  stickerType: 'drawing', isPinned: false, proposedPosition: { x: -10, y: -5 }, stickerRect: baseStickerRect,
  viewportScale: 1, viewportWidth: 1000, viewportHeight: 800, effectiveScrollY: 0, infiniteY: true,
});
assert.equal(freeDrawingSticker.x, -10);
assert.equal(freeDrawingSticker.y, -5);
assert.equal(freeDrawingSticker.adjusted, false);
const bottomZoneSticker = stickerPositioning.resolveStickerReleasePosition({
  stickerType: 'image', isPinned: false, proposedPosition: { x: 100, y: 680 }, stickerRect: baseStickerRect,
  viewportScale: 1, viewportWidth: 1000, viewportHeight: 800, effectiveScrollY: 0, infiniteY: false,
  bottomZoneRect: { left: 0, top: 700, right: 1000, bottom: 800 },
});
assert.equal(bottomZoneSticker.x, 100);
assert.equal(bottomZoneSticker.y, 630);
assert.equal(bottomZoneSticker.adjusted, true);

const advancedSearch = loadTsModule('features/search/constants/advancedSearch.ts');
assert.equal(
  advancedSearch.buildAdvancedSearch({
    query: 'react hooks',
    exactMatch: true,
    site: 'https://github.com/openai',
    exclude: 'class, legacy',
    fileType: 'pdf',
    target: 'engine',
  }).query,
  '"react hooks" site:github.com -class -legacy filetype:pdf',
);
assert.equal(
  advancedSearch.buildAdvancedSearch({
    query: 'Eclipin',
    exactMatch: false,
    site: '',
    exclude: '',
    fileType: '',
    target: 'github',
  }).url,
  'https://github.com/search?q=Eclipin',
);
assert.equal(
  advancedSearch.buildAdvancedSearch({
    query: 'react performance',
    exactMatch: false,
    site: 'developer.mozilla.org',
    exclude: 'legacy',
    fileType: '',
    anyWords: 'vite webpack',
    titleContains: 'web performance',
    urlContains: 'docs',
    afterDate: '2025-01-01',
    beforeDate: '2026-01-01',
    target: 'engine',
  }).query,
  'react performance site:developer.mozilla.org -legacy (vite OR webpack) intitle:"web performance" inurl:docs after:2025-01-01 before:2026-01-01',
);
assert.equal(
  advancedSearch.buildAdvancedSearchQuery({
    query: 'React Server Components',
    target: 'github',
    filters: {
      githubRepo: 'https://github.com/facebook/react',
      githubLanguage: 'TypeScript',
      githubStars: '>=1000',
      githubPath: 'packages/react',
    },
  }),
  'React Server Components repo:facebook/react language:TypeScript stars:>=1000 path:packages/react',
);
assert.equal(
  advancedSearch.buildAdvancedSearch({
    query: 'React Server Components',
    target: 'github',
    filters: { githubRepo: 'facebook/react', githubType: 'code' },
  }).url,
  'https://github.com/search?q=React%20Server%20Components%20repo%3Afacebook%2Freact&type=code',
);
assert.equal(
  advancedSearch.buildAdvancedSearchQuery({
    query: 'coffee',
    target: 'maps',
    filters: { mapsCategory: 'cafe', mapsNearby: 'The Bund', mapsLocation: 'Shanghai', mapsOpenNow: true },
  }),
  'coffee cafe near The Bund in Shanghai open now',
);
assert.equal(
  advancedSearch.buildAdvancedSearch({
    query: 'React',
    target: 'wikipedia',
    filters: { wikiLanguage: 'en', wikiNamespace: '0', wikiTitle: 'Server Components' },
  }).url,
  'https://en.wikipedia.org/w/index.php?search=React%20intitle%3A%22Server%20Components%22&ns0=1',
);


const svgPaint = loadTsModule('features/vector-icons/utils/svgPaint.ts');
const fakeSvgRoot = {
  tagName: 'svg',
  parentElement: null,
  getAttribute: (name) => name === 'fill' ? 'none' : null,
};
const fakeOutlinedPath = {
  tagName: 'path',
  parentElement: fakeSvgRoot,
  getAttribute: (name) => name === 'stroke' ? '#1C274C' : null,
};
assert.equal(svgPaint.resolveInheritedPaint(fakeOutlinedPath, 'fill'), 'none');
assert.equal(svgPaint.resolveInheritedPaint(fakeOutlinedPath, 'stroke'), '#1C274C');
assert.equal(svgPaint.hasVisiblePaint(fakeOutlinedPath, 'fill'), false);
assert.equal(svgPaint.hasVisiblePaint(fakeOutlinedPath, 'stroke'), true);

const vectorOperations = loadTsModule('features/vector-icons/utils/vectorCanvasOperations.ts');
const operationBaseItem = {
  type: 'shape', name: 'shape', svg: '<svg/>', viewBox: '0 0 100 100',
  y: 80, width: 120, height: 60, rotation: 0, opacity: 1, flipX: false, flipY: false, lockAspectRatio: true,
};
const operationItems = [
  { ...operationBaseItem, id: 'left', x: 100 },
  { ...operationBaseItem, id: 'right', x: 300 },
];
assert.equal(vectorOperations.alignCanvasItems(operationItems, ['left'], 'left')[0].x, 0);
assert.equal(vectorOperations.reorderCanvasItems(operationItems, ['left'], 'front').map(item => item.id).join(','), 'right,left');

const svgIconExport = loadTsModule('features/vector-icons/utils/svgIconExport.ts');
assert.equal(svgIconExport.normalizeVectorRotation(450), 90);
assert.equal(svgIconExport.normalizeVectorRotation(-270), 90);
assert.equal(svgIconExport.normalizeVectorRotation(270), -90);

const svgSanitizer = loadTsModule('features/vector-icons/utils/svgSanitizer.ts');
assert.equal(svgSanitizer.extractSvgBody('<svg><path d="M0 0"/></svg>'), '<path d="M0 0"/>');
assert.equal(
  svgSanitizer.extractSvgBody('<svg fill="none"><path d="M0 0" stroke="#1C274C"/></svg>'),
  '<g fill="none"><path d="M0 0" stroke="#1C274C"/></g>',
);
assert.equal(
  svgSanitizer.extractSvgBody('<svg><defs><linearGradient id="paint"><stop/></linearGradient></defs><path fill="url(#paint)"/></svg>', 'piece-1'),
  '<defs><linearGradient id="piece-1__paint"><stop/></linearGradient></defs><path fill="url(#piece-1__paint)"/>',
);

const vectorGeometry = loadTsModule('features/vector-icons/utils/vectorCanvasGeometry.ts');
assert.equal(vectorGeometry.getViewBoxAspectRatio('0 0 24 12'), 2);
assert.equal(vectorGeometry.getViewBoxAspectRatio('0 0 0 12'), 1);
const vectorItem = {
  id: 'shape', name: 'shape', svg: '<svg/>', viewBox: '0 0 100 100',
  x: 100, y: 80, width: 120, height: 60, rotation: 0, opacity: 1,
  flipX: false, flipY: false, lockAspectRatio: true,
};
const baseVectorBounds = vectorGeometry.getItemBounds(vectorItem);
assert.equal(baseVectorBounds.minX, 100);
assert.equal(baseVectorBounds.minY, 80);
assert.equal(baseVectorBounds.maxX, 220);
assert.equal(baseVectorBounds.maxY, 140);
const rotatedBounds = vectorGeometry.getItemBounds({ ...vectorItem, rotation: 90 });
assert.ok(Math.abs(rotatedBounds.minX - 130) < 0.0001);
assert.ok(Math.abs(rotatedBounds.maxX - 190) < 0.0001);
assert.ok(Math.abs(rotatedBounds.minY - 50) < 0.0001);
assert.ok(Math.abs(rotatedBounds.maxY - 170) < 0.0001);
assert.equal(vectorGeometry.snapToStep(23, 10), 20);
assert.equal(vectorGeometry.boundsOverlap({ minX: 0, minY: 0, maxX: 10, maxY: 10 }, { minX: 9, minY: 9, maxX: 20, maxY: 20 }), true);

// Wallpaper Engine flow masks logically carry an RG vector, but RePKG's RG88 PNG
// serialization stores it as (G, G, G, R). The runtime must recognize that packed
// representation and reconstruct WE RG as PNG .ar, while retaining .rg for direct
// RG maps (e.g. older sample/extractor output). Browser Y normalization must still
// not be applied a second time inside Water Flow.
const imageEffectLayerPath = path.resolve(root, 'features/theme/components/Background/WeImageEffectLayer.tsx');
const mirroredImageEffectLayerPath = path.resolve(root, 'tools/features/theme/components/Background/WeImageEffectLayer.tsx');
const imageEffectLayerSource = fs.readFileSync(imageEffectLayerPath, 'utf8');
const mirroredImageEffectLayerSource = fs.readFileSync(mirroredImageEffectLayerPath, 'utf8');
assert.equal(imageEffectLayerSource, mirroredImageEffectLayerSource);
assert.match(imageEffectLayerSource, /const usesPackedRg88FlowPngLayout =/);
assert.match(imageEffectLayerSource, /grayscaleRgbCount \/ sampleCount/);
assert.match(imageEffectLayerSource, /alphaDifferentPixelCount/);
assert.match(imageEffectLayerSource, /context\.imageSmoothingEnabled = false/);
assert.match(imageEffectLayerSource, /\? createTexture\(gl!, flowMapImage\)/);
assert.match(imageEffectLayerSource, /\? createTexture\(gl!, directionMapImage\)/);
const waterFlowShaderSource = imageEffectLayerSource.slice(
  imageEffectLayerSource.indexOf('const WATER_FLOW_FRAGMENT_SHADER ='),
  imageEffectLayerSource.indexOf('const SHAKE_FRAGMENT_SHADER ='),
);
assert.match(waterFlowShaderSource, /uniform bool u_FlowMapPackedRg88;/);
assert.match(
  waterFlowShaderSource,
  /vec2 flowColors = u_FlowMapPackedRg88 \? flowSample\.ar : flowSample\.rg;/,
);
assert.match(
  waterFlowShaderSource,
  /vec2 flowMask = \(flowColors - vec2\(0\.498, 0\.498\)\) \* 2\.0;/,
);
assert.doesNotMatch(waterFlowShaderSource, /flowMask\.y\s*=\s*-flowMask\.y/);
const shakeShaderSource = imageEffectLayerSource.slice(
  imageEffectLayerSource.indexOf('const SHAKE_FRAGMENT_SHADER ='),
  imageEffectLayerSource.indexOf('const BLUR_PRECISE_FRAGMENT_SHADER ='),
);
assert.match(shakeShaderSource, /uniform bool u_DirectionMapPackedRg88;/);
assert.match(
  shakeShaderSource,
  /vec2 directionColors = u_DirectionMapPackedRg88 \? directionSample\.ar : directionSample\.rg;/,
);
// Shake's coordinate-handedness rule is intentionally unchanged by this channel-layout fix.
assert.match(shakeShaderSource, /flowMask\.y\s*=\s*-flowMask\.y/);

console.log('Core utility tests passed.');
