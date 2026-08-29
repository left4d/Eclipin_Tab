type ZipEntryInput = {
  path: string;
  data: Uint8Array;
};

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const utf8FatalDecoder = new TextDecoder('utf-8', { fatal: true });
let gbkDecoder: TextDecoder | null = null;
try { gbkDecoder = new TextDecoder('gbk'); } catch { gbkDecoder = null; }

const toBlobPart = (data: Uint8Array): ArrayBuffer => {
  return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer;
};

const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc = crcTable[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}


const decodeZipEntryName = (rawName: Uint8Array, extra: Uint8Array, flags: number): string => {
  // Info-ZIP Unicode Path Extra Field (0x7075): version(1) + CRC32(raw name) + UTF-8 name.
  let cursor = 0;
  while (cursor + 4 <= extra.length) {
    const view = new DataView(extra.buffer, extra.byteOffset + cursor, extra.length - cursor);
    const headerId = view.getUint16(0, true);
    const size = view.getUint16(2, true);
    const dataStart = cursor + 4;
    const dataEnd = dataStart + size;
    if (dataEnd > extra.length) break;
    if (headerId === 0x7075 && size >= 5) {
      const version = extra[dataStart];
      const expectedCrc = new DataView(extra.buffer, extra.byteOffset + dataStart + 1, 4).getUint32(0, true);
      if (version === 1 && expectedCrc === crc32(rawName)) {
        return decoder.decode(extra.slice(dataStart + 5, dataEnd));
      }
    }
    cursor = dataEnd;
  }

  if (flags & 0x0800) return decoder.decode(rawName);
  try { return utf8FatalDecoder.decode(rawName); } catch {
    // Windows/Chinese ZIP tools often use GBK when the UTF-8 flag is absent.
    if (gbkDecoder) return gbkDecoder.decode(rawName);
    return decoder.decode(rawName);
  }
};

function writeU16(view: DataView, offset: number, value: number) {
  view.setUint16(offset, value, true);
}

function writeU32(view: DataView, offset: number, value: number) {
  view.setUint32(offset, value >>> 0, true);
}

function concat(parts: Uint8Array[]): Uint8Array {
  const length = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(length);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

export function createZip(entries: ZipEntryInput[]): Blob {
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;

  for (const entry of entries) {
    const name = encoder.encode(entry.path);
    const checksum = crc32(entry.data);

    const local = new Uint8Array(30 + name.length);
    const localView = new DataView(local.buffer);
    writeU32(localView, 0, 0x04034b50);
    writeU16(localView, 4, 20);
    writeU16(localView, 6, 0);
    writeU16(localView, 8, 0);
    writeU16(localView, 10, 0);
    writeU16(localView, 12, 0);
    writeU32(localView, 14, checksum);
    writeU32(localView, 18, entry.data.length);
    writeU32(localView, 22, entry.data.length);
    writeU16(localView, 26, name.length);
    writeU16(localView, 28, 0);
    local.set(name, 30);

    localParts.push(local, entry.data);

    const central = new Uint8Array(46 + name.length);
    const centralView = new DataView(central.buffer);
    writeU32(centralView, 0, 0x02014b50);
    writeU16(centralView, 4, 20);
    writeU16(centralView, 6, 20);
    writeU16(centralView, 8, 0);
    writeU16(centralView, 10, 0);
    writeU16(centralView, 12, 0);
    writeU16(centralView, 14, 0);
    writeU32(centralView, 16, checksum);
    writeU32(centralView, 20, entry.data.length);
    writeU32(centralView, 24, entry.data.length);
    writeU16(centralView, 28, name.length);
    writeU16(centralView, 30, 0);
    writeU16(centralView, 32, 0);
    writeU16(centralView, 34, 0);
    writeU16(centralView, 36, 0);
    writeU32(centralView, 38, 0);
    writeU32(centralView, 42, offset);
    central.set(name, 46);
    centralParts.push(central);

    offset += local.length + entry.data.length;
  }

  const centralDirectory = concat(centralParts);
  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  writeU32(endView, 0, 0x06054b50);
  writeU16(endView, 4, 0);
  writeU16(endView, 6, 0);
  writeU16(endView, 8, entries.length);
  writeU16(endView, 10, entries.length);
  writeU32(endView, 12, centralDirectory.length);
  writeU32(endView, 16, offset);
  writeU16(endView, 20, 0);

  return new Blob([...localParts, centralDirectory, end].map(toBlobPart), { type: 'application/zip' });
}

const inflateRaw = async (data: Uint8Array): Promise<Uint8Array> => {
  if (typeof DecompressionStream === 'undefined') {
    throw new Error('当前浏览器不支持解压 Deflate ZIP，请升级 Chromium/Chrome 后重试。');
  }
  const stream = new Blob([toBlobPart(data)]).stream().pipeThrough(
    new DecompressionStream('deflate-raw' as CompressionFormat),
  );
  return new Uint8Array(await new Response(stream).arrayBuffer());
};

export async function readZip(file: File): Promise<Map<string, Uint8Array>> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const entries = new Map<string, Uint8Array>();

  let offset = 0;
  while (offset + 30 <= bytes.length) {
    const signature = view.getUint32(offset, true);
    if (signature !== 0x04034b50) break;

    const flags = view.getUint16(offset + 6, true);
    if (flags & 0x08) {
      throw new Error('暂不支持使用 data descriptor 的 ZIP，请使用常规 ZIP 格式重新压缩。');
    }
    const compression = view.getUint16(offset + 8, true);
    if (compression !== 0 && compression !== 8) {
      throw new Error(`不支持的 ZIP 压缩方式：${compression}`);
    }

    const compressedSize = view.getUint32(offset + 18, true);
    const uncompressedSize = view.getUint32(offset + 22, true);
    const fileNameLength = view.getUint16(offset + 26, true);
    const extraLength = view.getUint16(offset + 28, true);
    const nameStart = offset + 30;
    const dataStart = nameStart + fileNameLength + extraLength;
    const dataEnd = dataStart + compressedSize;

    if (dataEnd > bytes.length) throw new Error('Invalid ZIP file');

    const rawName = bytes.slice(nameStart, nameStart + fileNameLength);
    const extra = bytes.slice(nameStart + fileNameLength, dataStart);
    const path = decodeZipEntryName(rawName, extra, flags);
    const compressed = bytes.slice(dataStart, dataEnd);
    const data = compression === 8 ? await inflateRaw(compressed) : compressed;
    if (uncompressedSize && data.length !== uncompressedSize) {
      throw new Error(`ZIP 文件损坏：${path}`);
    }
    entries.set(path, data);
    offset = dataEnd;
  }

  return entries;
}

export function textEntry(path: string, value: unknown): ZipEntryInput {
  return {
    path,
    data: encoder.encode(JSON.stringify(value, null, 2)),
  };
}

export function readJsonEntry<T>(entries: Map<string, Uint8Array>, path: string): T {
  const data = entries.get(path);
  if (!data) throw new Error(`Missing ${path}`);
  return JSON.parse(decoder.decode(data)) as T;
}
