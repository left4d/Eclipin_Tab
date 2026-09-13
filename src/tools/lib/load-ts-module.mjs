/**
 * Minimal TypeScript module loader for the Node tooling in this directory.
 *
 * Mirrors the loader already used by `run-core-tests.mjs`: source files are
 * transpiled with the project's own `typescript` dependency and evaluated in a
 * `vm` context whose `require` understands both relative paths and the `@/`
 * alias. That keeps these tools dependency-free (no bundler step) while loading
 * the real application modules rather than a copy of them.
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

/** Resolve `typescript` from the project's node_modules. */
const loadTypescript = () => {
  try {
    return require('typescript');
  } catch {
    for (const candidate of [
      path.resolve(process.cwd(), 'node_modules/typescript/lib/typescript.js'),
      path.resolve(process.cwd(), '../node_modules/typescript/lib/typescript.js'),
    ]) {
      if (fs.existsSync(candidate)) return require(candidate);
    }
    throw new Error('typescript not found; run `npm install` first');
  }
};

/** The directory that `features/...` and `shared/...` resolve against. */
export const resolveSourceRoot = (baseDir = process.cwd()) => {
  const probe = 'features/theme/utils/wallpaperEnginePkgReader.ts';
  for (const candidate of [baseDir, path.join(baseDir, 'src')]) {
    if (fs.existsSync(path.join(candidate, probe))) return candidate;
  }
  throw new Error(`cannot locate the source root from ${baseDir} (expected ${probe})`);
};

/**
 * Build a loader bound to one source root.
 *
 * @param sourceRoot directory containing `features/`, `shared/`, ...
 */
export const createTsLoader = (sourceRoot) => {
  const ts = loadTypescript();
  const cache = new Map();

  const load = (relativePath, globals = {}) => {
    const filename = path.resolve(sourceRoot, relativePath);
    const cacheable = Object.keys(globals).length === 0;
    if (cacheable && cache.has(filename)) return cache.get(filename);

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

    const resolveProjectModule = (basePath) => {
      const candidates = [
        basePath,
        `${basePath}.ts`,
        `${basePath}.tsx`,
        path.join(basePath, 'index.ts'),
        path.join(basePath, 'index.tsx'),
      ];
      for (const candidate of candidates) {
        if (fs.existsSync(candidate)) return load(path.relative(sourceRoot, candidate));
      }
      throw new Error(`Unable to resolve local module: ${basePath}`);
    };

    const localRequire = (specifier) => {
      if (specifier.startsWith('@/')) return resolveProjectModule(path.join(sourceRoot, specifier.slice(2)));
      if (specifier.startsWith('.')) return resolveProjectModule(path.resolve(path.dirname(filename), specifier));
      return require(specifier);
    };

    const context = vm.createContext({
      module,
      exports: module.exports,
      require: localRequire,
      console,
      URL,
      setTimeout,
      clearTimeout,
      TextDecoder,
      TextEncoder,
      Blob,
      File,
      DecompressionStream,
      CompressionStream,
      DataView,
      ArrayBuffer,
      Uint8Array,
      Uint8ClampedArray,
      Uint16Array,
      Uint32Array,
      Float32Array,
      Int32Array,
      Promise,
      // Some modules touch `window` at import time; application code guards on
      // availability, so a minimal stub keeps the loader usable.
      window: { open: () => null, location: { assign: () => {} } },
      ...globals,
    });

    vm.runInContext(output, context, { filename });
    if (cacheable) cache.set(filename, module.exports);
    return module.exports;
  };

  return load;
};

/**
 * Minimal PNG encoder backed by node:zlib.
 *
 * The browser canvas is unavailable outside a browser, so tools that need to
 * exercise the "decoded pixels -> PNG" path stub `OffscreenCanvas` with this.
 * Output is a real PNG, so downstream header parsing sees correct dimensions.
 */
export const createPngEncoder = (deflateSync) => {
  const crcTable = (() => {
    const table = new Uint32Array(256);
    for (let n = 0; n < 256; n += 1) {
      let c = n;
      for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c >>> 0;
    }
    return table;
  })();

  const crc32 = (bytes) => {
    let c = 0xffffffff;
    for (let i = 0; i < bytes.length; i += 1) c = crcTable[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };

  const chunk = (type, payload) => {
    const out = new Uint8Array(12 + payload.length);
    const view = new DataView(out.buffer);
    view.setUint32(0, payload.length, false);
    out.set(new TextEncoder().encode(type), 4);
    out.set(payload, 8);
    view.setUint32(8 + payload.length, crc32(out.subarray(4, 8 + payload.length)), false);
    return out;
  };

  return (width, height, rgba) => {
    const stride = width * 4 + 1;
    const raw = new Uint8Array(stride * height);
    for (let y = 0; y < height; y += 1) {
      raw[y * stride] = 0; // filter: none
      raw.set(rgba.subarray(y * width * 4, (y + 1) * width * 4), y * stride + 1);
    }
    const ihdr = new Uint8Array(13);
    const view = new DataView(ihdr.buffer);
    view.setUint32(0, width, false);
    view.setUint32(4, height, false);
    ihdr[8] = 8;  // bit depth
    ihdr[9] = 6;  // RGBA
    const parts = [
      new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]),
      chunk('IHDR', ihdr),
      chunk('IDAT', new Uint8Array(deflateSync(raw))),
      chunk('IEND', new Uint8Array(0)),
    ];
    const total = parts.reduce((sum, p) => sum + p.length, 0);
    const out = new Uint8Array(total);
    let offset = 0;
    for (const part of parts) { out.set(part, offset); offset += part.length; }
    return out;
  };
};

/** Replace the DOM canvas surface with the zlib-backed encoder above. */
export const createCanvasStub = (encodePng, onEncode = () => {}) => ({
  ImageData: class ImageData {
    constructor(data, width, height) {
      this.data = data;
      this.width = width;
      this.height = height;
    }
  },
  OffscreenCanvas: class OffscreenCanvas {
    constructor(width, height) {
      this.width = width;
      this.height = height;
      this._imageData = null;
    }
    getContext(kind) {
      if (kind !== '2d') return null;
      return { putImageData: (imageData) => { this._imageData = imageData; } };
    }
    async convertToBlob(options) {
      if (options?.type !== 'image/png') throw new Error(`unexpected blob type: ${options?.type}`);
      onEncode();
      const { width, height, data } = this._imageData;
      return new Blob([encodePng(width, height, data)], { type: 'image/png' });
    }
  },
});
