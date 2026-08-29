/**
 * Wallpaper Engine ships a small install-level font library under
 * `wallpaper_engine/assets/fonts`. Scene wallpapers may reference these as
 * `fonts/<file>` without embedding the font in scene.pkg.
 *
 * Keep this registry limited to filenames observed in a stock WE installation.
 * Wallpaper-local/workshop fonts are still resolved from the imported archive
 * first and never redirected here.
 */
export const WALLPAPER_ENGINE_BUILTIN_FONT_FILES = [
  '8bitOperatorPlus8-Regular.ttf',
  'Alcubierre.otf',
  'Atami-Regular.otf',
  'Blackout 2 AM.ttf',
  'CursedTimerUlil-Aznm.ttf',
  'kust.ttf',
  'Lazer84.ttf',
  'Monofur-PK7og.ttf',
  'NotoSans-Regular.ttf',
  'opensticks.ttf',
  'RobotoMono-Regular.ttf',
  'Segment7Standard.otf',
  'spincycle_3d_ot.otf',
  'summer85.ttf',
  'TwemojiMozilla.ttf',
] as const;

const BUILTIN_FONT_BY_LOWER_NAME = new Map(
  WALLPAPER_ENGINE_BUILTIN_FONT_FILES.map((name) => [name.toLowerCase(), name] as const),
);

const normalizeReference = (value: string): string => (
  value.replace(/\\/g, '/').replace(/^\.\//, '').replace(/^\/+/, '')
);

/**
 * Returns the canonical WE built-in filename when an authored font reference
 * points at the install-level `fonts/` namespace. Returns null for workshop or
 * arbitrary nested font paths so imported wallpaper resources keep priority.
 */
export const getWallpaperEngineBuiltinFontFile = (reference: string | null | undefined): string | null => {
  if (!reference) return null;
  const normalized = normalizeReference(reference);
  const match = /^fonts\/([^/]+)$/i.exec(normalized);
  if (!match) return null;
  return BUILTIN_FONT_BY_LOWER_NAME.get(match[1].toLowerCase()) ?? null;
};

/** Relative URL served from Vite/extension `public/`. */
export const getWallpaperEngineBuiltinFontPublicPath = (reference: string | null | undefined): string | null => {
  const file = getWallpaperEngineBuiltinFontFile(reference);
  return file ? `wallpaper-engine/fonts/${file}` : null;
};
