import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const ignoredDirectories = new Set(['node_modules', 'dist', '.git']);
const sourceExtensions = new Set(['.ts', '.tsx']);
const maxSourceLines = 600;
const sourceFiles = [];

function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (ignoredDirectories.has(entry.name)) continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(absolute);
    else if (sourceExtensions.has(path.extname(entry.name)) && !entry.name.endsWith('.d.ts')) sourceFiles.push(absolute);
  }
}

walk(root);

const normalizedFiles = new Set(sourceFiles.map((file) => path.normalize(file)));
const importPattern = /(?:from\s+|import\s*\()['"]([^'"]+)['"]/g;
const graph = new Map(sourceFiles.map((file) => [path.normalize(file), []]));
const oversizedFiles = [];

function resolveLocalImport(fromFile, specifier) {
  if (!specifier.startsWith('.') && !specifier.startsWith('@/')) return null;
  const base = specifier.startsWith('@/')
    ? path.join(root, specifier.slice(2))
    : path.resolve(path.dirname(fromFile), specifier);
  const candidates = [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    path.join(base, 'index.ts'),
    path.join(base, 'index.tsx'),
  ];
  return candidates.map(path.normalize).find((candidate) => normalizedFiles.has(candidate)) ?? null;
}

for (const file of sourceFiles) {
  const source = fs.readFileSync(file, 'utf8');
  const lineCount = source.split(/\r?\n/).length;
  if (lineCount > maxSourceLines) {
    oversizedFiles.push(`${path.relative(root, file)} (${lineCount} lines, limit ${maxSourceLines})`);
  }

  for (const match of source.matchAll(importPattern)) {
    const target = resolveLocalImport(file, match[1]);
    if (target) graph.get(path.normalize(file)).push(target);
  }
}

const state = new Map();
const stack = [];
const cycleKeys = new Set();
const cycles = [];

function visit(file) {
  state.set(file, 1);
  stack.push(file);
  for (const target of graph.get(file) ?? []) {
    if (!state.has(target)) visit(target);
    else if (state.get(target) === 1) {
      const cycleStart = stack.indexOf(target);
      const cycle = [...stack.slice(cycleStart), target].map((entry) => path.relative(root, entry));
      const key = [...new Set(cycle.slice(0, -1))].sort().join('|');
      if (!cycleKeys.has(key)) {
        cycleKeys.add(key);
        cycles.push(cycle);
      }
    }
  }
  stack.pop();
  state.set(file, 2);
}

for (const file of graph.keys()) {
  if (!state.has(file)) visit(file);
}

console.log(`Architecture check: ${sourceFiles.length} TypeScript source files, max ${maxSourceLines} lines per file.`);
if (oversizedFiles.length || cycles.length) {
  if (oversizedFiles.length) console.error(`\nOversized source files:\n${oversizedFiles.join('\n')}`);
  if (cycles.length) console.error(`\nCircular imports:\n${cycles.map((cycle) => cycle.join(' -> ')).join('\n')}`);
  process.exit(1);
}
console.log('File-size guard and circular-import check passed.');
