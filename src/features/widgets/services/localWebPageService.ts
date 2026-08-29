import { db, type LocalWebPageItem } from '@/shared/utils/db';
import { deleteLocalWebFiles, saveLocalWebFiles, type LocalWebFileItem } from '@/shared/utils/localWebFileDb';
import { readZip } from '@/shared/utils/zip';

const MAX_LOCAL_WEB_PAGE_SIZE = 20 * 1024 * 1024;
const MAX_WEB_PACKAGE_ZIP_SIZE = 200 * 1024 * 1024;
const MAX_WEB_PACKAGE_UNPACKED_SIZE = 400 * 1024 * 1024;
const MAX_WEB_PACKAGE_FILE_SIZE = 128 * 1024 * 1024;
const MAX_WEB_PACKAGE_FILES = 6000;
const HTML_FILE_PATTERN = /\.html?$/i;
const ZIP_FILE_PATTERN = /\.zip$/i;

const MIME_BY_EXT: Record<string, string> = {
  html: 'text/html;charset=utf-8', htm: 'text/html;charset=utf-8', css: 'text/css;charset=utf-8',
  js: 'text/javascript;charset=utf-8', mjs: 'text/javascript;charset=utf-8', cjs: 'text/javascript;charset=utf-8',
  jsx: 'text/javascript;charset=utf-8', ts: 'text/javascript;charset=utf-8', tsx: 'text/javascript;charset=utf-8',
  json: 'application/json;charset=utf-8', map: 'application/json;charset=utf-8', webmanifest: 'application/manifest+json;charset=utf-8',
  txt: 'text/plain;charset=utf-8', xml: 'application/xml;charset=utf-8', csv: 'text/csv;charset=utf-8',
  svg: 'image/svg+xml', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif',
  ico: 'image/x-icon', bmp: 'image/bmp', avif: 'image/avif', jxl: 'image/jxl',
  mp4: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime', m4v: 'video/x-m4v',
  ogg: 'audio/ogg', oga: 'audio/ogg', mp3: 'audio/mpeg', wav: 'audio/wav', m4a: 'audio/mp4', aac: 'audio/aac',
  vtt: 'text/vtt;charset=utf-8', srt: 'application/x-subrip;charset=utf-8',
  woff: 'font/woff', woff2: 'font/woff2', ttf: 'font/ttf', otf: 'font/otf', eot: 'application/vnd.ms-fontobject',
  wasm: 'application/wasm', pdf: 'application/pdf', atlas: 'text/plain;charset=utf-8', skel: 'application/octet-stream',
  gltf: 'model/gltf+json', glb: 'model/gltf-binary', bin: 'application/octet-stream',
};

const mimeFromPath = (path: string): string => {
  const ext = path.split('.').pop()?.toLowerCase() ?? '';
  return MIME_BY_EXT[ext] ?? 'application/octet-stream';
};

const normalizePackagePath = (rawPath: string): string | null => {
  const path = rawPath.replace(/\\/g, '/').replace(/^\.\/+/, '');
  if (!path || path.endsWith('/') || path.startsWith('/') || /^[a-zA-Z]:\//.test(path)) return null;
  const segments = path.split('/').filter(Boolean);
  if (segments.some((segment) => segment === '..' || segment === '.')) return null;
  if (segments[0] === '__MACOSX' || segments[segments.length - 1] === '.DS_Store') return null;
  return segments.join('/');
};

const localWebRunnerUrl = (): string => {
  if (typeof chrome !== 'undefined' && chrome.runtime?.getURL) return chrome.runtime.getURL('local-web-runner.html');
  return '/local-web-runner.html';
};

const scoreEntryPath = (path: string): number => {
  const parts = path.split('/');
  const fileName = parts[parts.length - 1].toLowerCase();
  const depth = parts.length - 1;
  let score = depth * 100;
  if (/^index\.html?$/.test(fileName)) score -= 80;
  else if (/^(?:default|home|main|start)\.html?$/.test(fileName)) score -= 55;
  else if (/^(?:404|403|500|error|offline)\.html?$/.test(fileName)) score += 250;
  if (/(?:^|[-_.])index(?:[-_.]|$)/.test(fileName)) score -= 10;
  return score;
};

const chooseEntryPath = (paths: Iterable<string>): string => {
  const htmlPaths = [...paths].filter((path) => HTML_FILE_PATTERN.test(path));
  if (htmlPaths.length === 0) throw new Error('网页包中没有找到 HTML 入口文件。');
  return htmlPaths.sort((a, b) => scoreEntryPath(a) - scoreEntryPath(b) || a.localeCompare(b))[0];
};

const savePackageEntries = async (
  widgetId: string,
  displayName: string,
  entries: Array<{ path: string; data: Blob }>,
): Promise<LocalWebPageItem> => {
  const normalizedEntries = new Map<string, Blob>();
  let totalSize = 0;

  for (const entry of entries) {
    const path = normalizePackagePath(entry.path);
    if (!path) continue;
    if (entry.data.size > MAX_WEB_PACKAGE_FILE_SIZE) throw new Error(`网页包内单个文件过大：${path}`);
    totalSize += entry.data.size;
    if (totalSize > MAX_WEB_PACKAGE_UNPACKED_SIZE) throw new Error('网页包解压后不能超过 400MB。');
    normalizedEntries.set(path, entry.data);
  }

  if (normalizedEntries.size === 0) throw new Error('网页包中没有可用文件。');
  if (normalizedEntries.size > MAX_WEB_PACKAGE_FILES) throw new Error(`网页包文件数量不能超过 ${MAX_WEB_PACKAGE_FILES} 个。`);

  const entryPath = chooseEntryPath(normalizedEntries.keys());
  const id = `local-web-${widgetId}`;
  const storedFiles: LocalWebFileItem[] = [...normalizedEntries.entries()].map(([path, data]) => {
    const inferredMimeType = mimeFromPath(path);
    const mimeType = inferredMimeType !== 'application/octet-stream' ? inferredMimeType : (data.type || inferredMimeType);
    return {
      key: `${id}:${path}`,
      pageId: id,
      path,
      data: data.type === mimeType ? data : data.slice(0, data.size, mimeType),
      mimeType,
      size: data.size,
    };
  });

  await deleteLocalWebFiles(id);
  await saveLocalWebFiles(storedFiles);

  const item: LocalWebPageItem = {
    id,
    name: displayName || entryPath.split('/').pop() || '本地网页',
    kind: 'package',
    entryPath,
    fileCount: storedFiles.length,
    totalSize: storedFiles.reduce((sum, item) => sum + item.size, 0),
    createdAt: Date.now(),
  };
  await db.saveLocalWebPage(item);
  return item;
};

export const getLocalWebPageUrl = (item: LocalWebPageItem): string | null => {
  if (item.kind !== 'package' || !item.entryPath) return null;
  return localWebRunnerUrl();
};

export const saveLocalWebPageFile = async (widgetId: string, file: File): Promise<LocalWebPageItem> => {
  const isHtml = file.type === 'text/html' || HTML_FILE_PATTERN.test(file.name);
  if (!isHtml) throw new Error('请选择 .html 或 .htm 网页文件。');
  if (file.size > MAX_LOCAL_WEB_PAGE_SIZE) throw new Error('本地网页文件不能超过 20MB。');
  if (!(await file.text()).trim()) throw new Error('网页文件内容为空。');

  // 新导入的单文件 HTML 也走 package runner。这样离屏时 iframe 一卸载，HTML/脚本
  // 不会长期保留在 React state 中，并且能复用 package runner 的 URL/Worker 兼容层。
  return savePackageEntries(widgetId, file.name || '本地网页.html', [{ path: file.name || 'index.html', data: file }]);
};

export const saveLocalWebPackageFile = async (widgetId: string, file: File): Promise<LocalWebPageItem> => {
  if (!(file.type === 'application/zip' || ZIP_FILE_PATTERN.test(file.name))) throw new Error('请选择 .zip 网页包。');
  if (file.size > MAX_WEB_PACKAGE_ZIP_SIZE) throw new Error('网页包 ZIP 不能超过 200MB。');

  const rawEntries = await readZip(file);
  const entries = [...rawEntries.entries()].map(([path, data]) => ({
    path,
    data: new Blob([data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer], { type: mimeFromPath(path) }),
  }));
  return savePackageEntries(widgetId, file.name || '网页包.zip', entries);
};

export const saveLocalWebDirectoryFiles = async (widgetId: string, files: File[]): Promise<LocalWebPageItem> => {
  if (files.length === 0) throw new Error('请选择包含网页文件的文件夹。');
  if (files.length > MAX_WEB_PACKAGE_FILES) throw new Error(`网页文件数量不能超过 ${MAX_WEB_PACKAGE_FILES} 个。`);

  const relativePath = files[0]?.webkitRelativePath || files[0]?.name || '';
  const rootName = relativePath.includes('/') ? relativePath.split('/')[0] : '本地网页文件夹';
  const entries = files.map((file) => ({
    path: file.webkitRelativePath || file.name,
    data: file as Blob,
  }));
  return savePackageEntries(widgetId, rootName, entries);
};

export const deleteLocalWebPage = async (id: string | undefined): Promise<void> => {
  if (!id) return;
  try {
    await Promise.all([db.deleteLocalWebPage(id), deleteLocalWebFiles(id)]);
  } catch (error) {
    console.warn('Failed to delete local embedded web page:', error);
  }
};
