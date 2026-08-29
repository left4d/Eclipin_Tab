import { db, type CustomFontItem } from '@/shared/utils/db';
import { createId } from '@/shared/utils/id';

export type CoreFontId = 'system' | 'qingke' | 'mashan';
export type CustomFontId = `custom:${string}`;
export type FontId = CoreFontId | CustomFontId;
/** 向后兼容旧组件中的类型名。 */
export type BuiltInFontId = FontId;

export interface BuiltInFontOption {
  id: CoreFontId;
  label: string;
  labelEn: string;
  family: string;
  preview: string;
  ttfFile?: string;
}

export interface CustomFontOption {
  id: CustomFontId;
  label: string;
  labelEn: string;
  family: string;
  preview: string;
  fileName: string;
  createdAt: number;
  isCustom: true;
}

export type FontOption = BuiltInFontOption | CustomFontOption;

export const BUILT_IN_FONTS: readonly BuiltInFontOption[] = [
  {
    id: 'system',
    label: '系统默认',
    labelEn: 'System Default',
    family: '"Bricolage Grotesque", "Microsoft YaHei", "PingFang SC", system-ui, sans-serif',
    preview: '时间 · 贴纸 12:34',
  },
  {
    id: 'qingke',
    label: '站酷庆科黄油体',
    labelEn: 'ZCOOL QingKe HuangYou',
    family: '"Eclipin ZCOOL QingKe", "Microsoft YaHei", "PingFang SC", sans-serif',
    preview: '灵感时刻 12:34',
    ttfFile: 'fonts/ZCOOLQingKeHuangYou-Regular.ttf',
  },
  {
    id: 'mashan',
    label: '马善政毛笔楷书',
    labelEn: 'Ma Shan Zheng',
    family: '"Eclipin Ma Shan Zheng", "STKaiti", "KaiTi", cursive',
    preview: '今日宜专注 12:34',
    ttfFile: 'fonts/MaShanZheng-Regular.ttf',
  },
] as const;

const FONT_FACE_NAMES: Partial<Record<CoreFontId, string>> = {
  qingke: 'Eclipin ZCOOL QingKe',
  mashan: 'Eclipin Ma Shan Zheng',
};

export const CUSTOM_FONT_CHANGED_EVENT = 'eclipin:custom-fonts-changed';
export const CUSTOM_FONT_PREFIX = 'custom:';
export const MAX_CUSTOM_FONT_SIZE = 20 * 1024 * 1024;
export const SUPPORTED_FONT_EXTENSIONS = ['ttf', 'otf', 'woff', 'woff2'] as const;

const fontLoadPromises = new Map<FontId, Promise<void>>();
const loadedFontFaces = new Map<FontId, FontFace>();

export const isCustomFontId = (value: unknown): value is CustomFontId => (
  typeof value === 'string' && value.startsWith(CUSTOM_FONT_PREFIX) && value.length > CUSTOM_FONT_PREFIX.length
);

export const normalizeFontId = (value: unknown): FontId => {
  if (value === 'qingke' || value === 'mashan' || value === 'system') return value;
  if (isCustomFontId(value)) return value;
  return 'system';
};

/** 向后兼容旧调用。 */
export const normalizeBuiltInFontId = normalizeFontId;

export const getBuiltInFont = (value: unknown): BuiltInFontOption => {
  const id = normalizeFontId(value);
  if (isCustomFontId(id)) return BUILT_IN_FONTS[0];
  return BUILT_IN_FONTS.find((font) => font.id === id) ?? BUILT_IN_FONTS[0];
};

const getCustomFontFaceName = (id: CustomFontId): string => {
  const safeId = id.slice(CUSTOM_FONT_PREFIX.length).replace(/[^a-zA-Z0-9_-]/g, '');
  return `Eclipin Custom ${safeId}`;
};

export const getFontFamily = (value: unknown): string => {
  const id = normalizeFontId(value);
  if (isCustomFontId(id)) {
    return `"${getCustomFontFaceName(id)}", "Microsoft YaHei", "PingFang SC", system-ui, sans-serif`;
  }
  return getBuiltInFont(id).family;
};

/** 向后兼容旧调用。 */
export const getBuiltInFontFamily = getFontFamily;

const formatForFontFile = (fileName: string, mimeType = ''): string | undefined => {
  const extension = fileName.split('.').pop()?.toLowerCase();
  if (extension === 'woff2' || mimeType.includes('woff2')) return 'woff2';
  if (extension === 'woff' || mimeType.includes('woff')) return 'woff';
  if (extension === 'otf' || mimeType.includes('opentype')) return 'opentype';
  if (extension === 'ttf' || mimeType.includes('truetype') || mimeType.includes('ttf')) return 'truetype';
  return undefined;
};

const loadCustomFontItem = async (item: CustomFontItem): Promise<void> => {
  const id = item.id as CustomFontId;
  if (loadedFontFaces.has(id) || typeof document === 'undefined' || typeof FontFace === 'undefined') return;

  const faceName = getCustomFontFaceName(id);
  const source = await item.data.arrayBuffer();
  const face = new FontFace(faceName, source, {
    style: 'normal',
    weight: '100 900',
    display: 'swap',
  });
  const loaded = await face.load();
  document.fonts.add(loaded);
  loadedFontFaces.set(id, loaded);
};

/**
 * 按需加载内置或用户导入的字体。加载失败时保留系统字体回退。
 */
export const ensureFontLoaded = (value: unknown): Promise<void> => {
  const id = normalizeFontId(value);
  const cached = fontLoadPromises.get(id);
  if (cached) return cached;

  const promise = (async () => {
    if (isCustomFontId(id)) {
      const item = await db.getCustomFont(id);
      if (!item) return;
      await loadCustomFontItem(item);
      return;
    }

    const font = getBuiltInFont(id);
    if (!font.ttfFile || typeof document === 'undefined' || typeof FontFace === 'undefined') return;

    const faceName = FONT_FACE_NAMES[id];
    if (!faceName) return;
    const sourceUrl = new URL(font.ttfFile, document.baseURI).href;
    const face = new FontFace(faceName, `url("${sourceUrl}") format("truetype")`, {
      style: 'normal',
      weight: '400',
      display: 'swap',
    });
    const loaded = await face.load();
    document.fonts.add(loaded);
    loadedFontFaces.set(id, loaded);
  })().catch((error) => {
    fontLoadPromises.delete(id);
    console.warn(`[Eclipin] Font failed to load: ${id}`, error);
  });

  fontLoadPromises.set(id, promise);
  return promise;
};

/** 向后兼容旧调用。 */
export const ensureBuiltInFontLoaded = ensureFontLoaded;

const getDisplayNameFromFile = (fileName: string): string => {
  const withoutExtension = fileName.replace(/\.(ttf|otf|woff2?|TTF|OTF|WOFF2?)$/, '');
  return withoutExtension.replace(/[_-]+/g, ' ').trim() || '本地字体';
};

export const getCustomFontOptions = async (): Promise<CustomFontOption[]> => {
  const items = await db.getAllCustomFonts();
  return items
    .sort((a, b) => b.createdAt - a.createdAt)
    .map((item) => ({
      id: item.id as CustomFontId,
      label: item.name,
      labelEn: item.name,
      family: getFontFamily(item.id),
      preview: '本地字体预览 12:34',
      fileName: item.fileName,
      createdAt: item.createdAt,
      isCustom: true as const,
    }));
};

export const addCustomFont = async (file: File): Promise<CustomFontOption> => {
  const extension = file.name.split('.').pop()?.toLowerCase();
  if (!extension || !SUPPORTED_FONT_EXTENSIONS.includes(extension as typeof SUPPORTED_FONT_EXTENSIONS[number])) {
    throw new Error('仅支持 TTF、OTF、WOFF 和 WOFF2 字体文件');
  }
  if (file.size <= 0) throw new Error('字体文件为空');
  if (file.size > MAX_CUSTOM_FONT_SIZE) throw new Error('字体文件不能超过 20MB');

  const randomId = createId();
  const id = `${CUSTOM_FONT_PREFIX}${randomId}` as CustomFontId;
  const mimeType = file.type || `font/${extension}`;
  const format = formatForFontFile(file.name, mimeType);
  if (!format) throw new Error('无法识别字体格式');

  const item: CustomFontItem = {
    id,
    name: getDisplayNameFromFile(file.name),
    fileName: file.name,
    data: file,
    mimeType,
    createdAt: Date.now(),
  };

  // 先验证浏览器能否解析，再写入数据库。
  if (typeof FontFace !== 'undefined') {
    const testFace = new FontFace(getCustomFontFaceName(id), await file.arrayBuffer(), {
      style: 'normal',
      weight: '100 900',
      display: 'swap',
    });
    const loaded = await testFace.load();
    if (typeof document !== 'undefined') document.fonts.add(loaded);
    loadedFontFaces.set(id, loaded);
  }

  await db.saveCustomFont(item);
  fontLoadPromises.set(id, Promise.resolve());
  window.dispatchEvent(new CustomEvent(CUSTOM_FONT_CHANGED_EVENT));

  return {
    id,
    label: item.name,
    labelEn: item.name,
    family: getFontFamily(id),
    preview: '本地字体预览 12:34',
    fileName: item.fileName,
    createdAt: item.createdAt,
    isCustom: true,
  };
};

export const deleteCustomFont = async (id: CustomFontId): Promise<void> => {
  await db.deleteCustomFont(id);
  const face = loadedFontFaces.get(id);
  if (face && typeof document !== 'undefined') document.fonts.delete(face);
  loadedFontFaces.delete(id);
  fontLoadPromises.delete(id);
  window.dispatchEvent(new CustomEvent(CUSTOM_FONT_CHANGED_EVENT));
};
