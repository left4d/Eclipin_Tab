import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
let ts;
try {
  ts = require('typescript');
} catch {
  ts = require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js');
}
const root = process.cwd();
const sourceExtensions = new Set(['.ts', '.tsx']);
const ignoredDirs = new Set(['node_modules', 'dist', '.git']);
const files = [];

function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (ignoredDirs.has(entry.name)) continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(absolute);
    else if (sourceExtensions.has(path.extname(entry.name)) && !entry.name.endsWith('.d.ts')) files.push(absolute);
  }
}


function collectByExtension(directory, extension, result = []) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (ignoredDirs.has(entry.name)) continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) collectByExtension(absolute, extension, result);
    else if (path.extname(entry.name) === extension) result.push(absolute);
  }
  return result;
}

function hasBalancedCssBraces(source) {
  let depth = 0;
  let quote = '';
  let inComment = false;
  for (let index = 0; index < source.length; index += 1) {
    const current = source[index];
    const next = source[index + 1];
    if (inComment) {
      if (current === '*' && next === '/') { inComment = false; index += 1; }
      continue;
    }
    if (!quote && current === '/' && next === '*') { inComment = true; index += 1; continue; }
    if (quote) {
      if (current === '\\') { index += 1; continue; }
      if (current === quote) quote = '';
      continue;
    }
    if (current === '"' || current === "'") { quote = current; continue; }
    if (current === '{') depth += 1;
    if (current === '}') depth -= 1;
    if (depth < 0) return false;
  }
  return depth === 0 && !quote && !inComment;
}

function resolveLocalImport(fromFile, specifier) {
  const cleanSpecifier = specifier.split(/[?#]/, 1)[0];
  const base = cleanSpecifier.startsWith('@/')
    ? path.join(root, cleanSpecifier.slice(2))
    : path.resolve(path.dirname(fromFile), cleanSpecifier);
  const candidates = [
    base,
    ...['.ts', '.tsx', '.css', '.svg', '.png', '.json', '.mjs'].map(extension => `${base}${extension}`),
    ...['index.ts', 'index.tsx', 'index.css'].map(name => path.join(base, name)),
  ];
  return candidates.some(candidate => fs.existsSync(candidate));
}

walk(root);
const diagnostics = [];
const unresolved = [];
const policyErrors = [];
const assetErrors = [];
const importPattern = /(?:from\s+|import\s*\()['"]([^'"]+)['"]/g;

for (const file of files) {
  const source = fs.readFileSync(file, 'utf8');
  const result = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      jsx: ts.JsxEmit.ReactJSX,
      isolatedModules: true,
    },
    fileName: file,
    reportDiagnostics: true,
  });
  for (const diagnostic of result.diagnostics ?? []) {
    diagnostics.push(`${path.relative(root, file)}: ${ts.flattenDiagnosticMessageText(diagnostic.messageText, ' ')}`);
  }

  for (const match of source.matchAll(importPattern)) {
    const specifier = match[1];
    if ((specifier.startsWith('.') || specifier.startsWith('@/')) && !resolveLocalImport(file, specifier)) {
      unresolved.push(`${path.relative(root, file)} -> ${specifier}`);
    }
  }

  const relative = path.relative(root, file).replaceAll('\\', '/');
  if (source.includes('window.open(') && relative !== 'shared/utils/url.ts') {
    policyErrors.push(`${relative}: direct window.open bypasses safe navigation helper`);
  }
  if (source.includes('crypto.randomUUID()') && relative !== 'shared/utils/id.ts') {
    policyErrors.push(`${relative}: direct crypto.randomUUID bypasses compatibility helper`);
  }
  if (source.includes('@ts-ignore')) policyErrors.push(`${relative}: contains @ts-ignore`);
}

for (const cssFile of collectByExtension(root, '.css')) {
  if (!hasBalancedCssBraces(fs.readFileSync(cssFile, 'utf8'))) {
    assetErrors.push(`${path.relative(root, cssFile)}: unbalanced CSS braces or quotes`);
  }
}

for (const jsonFile of ['package.json', 'tsconfig.json', 'tsconfig.app.json', 'public/manifest.json']) {
  try {
    JSON.parse(fs.readFileSync(path.join(root, jsonFile), 'utf8'));
  } catch (error) {
    assetErrors.push(`${jsonFile}: invalid JSON (${error instanceof Error ? error.message : String(error)})`);
  }
}

console.log(`Checked ${files.length} TypeScript source files.`);
if (diagnostics.length || unresolved.length || policyErrors.length || assetErrors.length) {
  if (diagnostics.length) console.error('\nSyntax diagnostics:\n' + diagnostics.join('\n'));
  if (unresolved.length) console.error('\nUnresolved local imports:\n' + unresolved.join('\n'));
  if (policyErrors.length) console.error('\nProject policy errors:\n' + policyErrors.join('\n'));
  if (assetErrors.length) console.error('\nAsset/config errors:\n' + assetErrors.join('\n'));
  process.exit(1);
}
console.log('Syntax, local imports, styles, configs, and safety policies passed.');
