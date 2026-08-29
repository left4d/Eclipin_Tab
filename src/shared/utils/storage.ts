import { DockItem, SearchEngine, SpacesState, createDefaultSpacesState, Sticker } from '@/shared/types';
import { isNavigationAction, parseNavigationAction } from '@/shared/navigation';

const STORAGE_KEYS = {
  DOCK_ITEMS: 'Eclipin_dockItems',
  SEARCH_ENGINE: 'Eclipin_searchEngine',
  // Config (Unified settings)
  CONFIG: 'Eclipin_config',

  // Legacy Keys (kept for reference, strictly used for migration)
  // THEME: 'Eclipin_theme',
  // FOLLOW_SYSTEM: 'Eclipin_followSystem',
  // DOCK_POSITION: 'Eclipin_dockPosition',
  // ICON_SIZE: 'Eclipin_iconSize',
  // GRADIENT: 'Eclipin_gradient',
  // TEXTURE: 'Eclipin_texture',

  WALLPAPER_ID: 'Eclipin_wallpaperId',

  // Focus Spaces
  SPACES: 'Eclipin_spaces',
  // Zen Shelf Stickers
  STICKERS: 'Eclipin_stickers',
  HORIZONTAL_STICKERS: 'Eclipin_stickers_horizontal',
  // Deleted Stickers (Recycle Bin)
  DELETED_STICKERS: 'Eclipin_deletedStickers',
  HORIZONTAL_DELETED_STICKERS: 'Eclipin_deletedStickers_horizontal',
  // 贴纸图片迁移标记
  STICKER_IMAGES_MIGRATED: 'Eclipin_stickerImagesMigrated',
} as const;
// Unified Configuration Interface
type StoredContainerStyle = 'classic' | 'frame' | 'ambient' | 'veil';
type StoredPageScrollMode = 'continuous' | 'paged';
type StoredPageSlideDirection = 'vertical' | 'horizontal';
export type LayoutStorageMode = StoredPageSlideDirection;

interface AppConfig {
  theme: string;
  followSystem: boolean;
  dockPosition: 'top' | 'center' | 'bottom';
  iconSize: 'large' | 'small';
  texture: string;
  gradient: string | null;
  solidGradient: string | null;
  openInNewTab: boolean;
  appearancePalette: string;
  containerStyle: StoredContainerStyle;
  pageScrollMode: StoredPageScrollMode;
  pageSlideDirection: StoredPageSlideDirection;
  quickLinksBarEnabled: boolean;
}

const DEFAULT_CONFIG: AppConfig = {
  theme: 'light',
  followSystem: true,
  dockPosition: 'bottom',
  iconSize: 'large',
  texture: 'point',
  gradient: null,
  solidGradient: null,
  openInNewTab: true,
  appearancePalette: 'sage',
  containerStyle: 'classic',
  pageScrollMode: 'continuous',
  pageSlideDirection: 'vertical',
  quickLinksBarEnabled: true,
};

// ============================================================================
// 性能优化: 内存缓存层，避免重复 JSON.parse
// ============================================================================
interface CacheEntry<T> {
  data: T;
  raw: string; // 用于检测 localStorage 是否被外部修改
}

const memoryCache = {
  spaces: null as CacheEntry<SpacesState> | null,
  stickers: null as CacheEntry<Sticker[]> | null,
  horizontalStickers: null as CacheEntry<Sticker[]> | null,
  deletedStickers: null as CacheEntry<Sticker[]> | null,
  horizontalDeletedStickers: null as CacheEntry<Sticker[]> | null,
  config: null as CacheEntry<AppConfig> | null,
};

/**
 * 从缓存获取数据，如果 localStorage 数据未变则返回缓存
 */
function getCached<T>(key: string, cache: CacheEntry<T> | null): T | null {
  if (!cache) return null;
  try {
    const currentRaw = localStorage.getItem(key);
    if (currentRaw === cache.raw) {
      return cache.data;
    }
  } catch {
    // ignore
  }
  return null;
}

const migrateDockItemNavigationAction = (item: DockItem): { item: DockItem; changed: boolean } => {
  let childChanged = false;
  const migratedItems = item.items?.map((child) => {
    const result = migrateDockItemNavigationAction(child);
    if (result.changed) childChanged = true;
    return result.item;
  });

  if (isNavigationAction(item.action)) {
    const url = item.action.type === 'url' ? item.action.url : undefined;
    const ownChanged = item.url !== url;
    if (!childChanged && !ownChanged) return { item, changed: false };
    return {
      item: {
        ...item,
        url,
        items: childChanged ? migratedItems : item.items,
      },
      changed: true,
    };
  }

  const action = parseNavigationAction(item.url ?? '');
  if (!action) {
    if (!childChanged) return { item, changed: false };
    return { item: { ...item, items: migratedItems }, changed: true };
  }

  return {
    item: {
      ...item,
      action,
      // 外链继续保留规范化 URL，供图标/域名展示等非执行逻辑使用。
      url: action.type === 'url' ? action.url : undefined,
      items: childChanged ? migratedItems : item.items,
    },
    changed: true,
  };
};

const migrateDockItemsNavigationActions = (items: DockItem[]): { items: DockItem[]; changed: boolean } => {
  let changed = false;
  const migrated = items.map((item) => {
    const result = migrateDockItemNavigationAction(item);
    if (result.changed) changed = true;
    return result.item;
  });
  return { items: migrated, changed };
};

const migrateSpacesNavigationActions = (state: SpacesState): { state: SpacesState; changed: boolean } => {
  let changed = false;
  const spaces = state.spaces.map((space) => {
    const migrated = migrateDockItemsNavigationActions(space.apps);
    if (!migrated.changed) return space;
    changed = true;
    return { ...space, apps: migrated.items };
  });
  return changed ? { state: { ...state, spaces }, changed: true } : { state, changed: false };
};

const migrateStickerNavigationActions = (stickers: Sticker[]): { stickers: Sticker[]; changed: boolean } => {
  let changed = false;
  const migrated = stickers.map((sticker) => {
    if (isNavigationAction(sticker.action)) {
      if (sticker.linkTarget === undefined && sticker.imageLinkUrl === undefined) return sticker;
      changed = true;
      const { linkTarget: _linkTarget, imageLinkUrl: _imageLinkUrl, ...rest } = sticker;
      return rest as Sticker;
    }
    const action = parseNavigationAction(sticker.linkTarget ?? sticker.imageLinkUrl ?? '');
    if (!action) return sticker;
    changed = true;
    const { linkTarget: _linkTarget, imageLinkUrl: _imageLinkUrl, ...rest } = sticker;
    return { ...rest, action } as Sticker;
  });
  return { stickers: migrated, changed };
};

export const storage = {
  // ==========================================================================
  // Configuration Management (New Structured Storage)
  // ==========================================================================

  getConfig(): AppConfig {
    try {
      // Check memory cache
      const cached = getCached(STORAGE_KEYS.CONFIG, memoryCache.config);
      if (cached) return cached;

      const json = localStorage.getItem(STORAGE_KEYS.CONFIG);
      if (json) {
        const parsed = JSON.parse(json);
        const config = { ...DEFAULT_CONFIG, ...parsed };
        memoryCache.config = { data: config, raw: json };
        return config;
      }

      // Migration: Try to read legacy keys
      const config = { ...DEFAULT_CONFIG };

      const legacyTheme = localStorage.getItem('Eclipin_theme');
      if (legacyTheme) config.theme = legacyTheme;

      const legacyFollow = localStorage.getItem('Eclipin_followSystem');
      if (legacyFollow !== null) config.followSystem = legacyFollow === 'true';

      const legacyDockPos = localStorage.getItem('Eclipin_dockPosition');
      if (legacyDockPos === 'top' || legacyDockPos === 'center' || legacyDockPos === 'bottom') config.dockPosition = legacyDockPos;

      const legacyIconSize = localStorage.getItem('Eclipin_iconSize');
      if (legacyIconSize === 'small' || legacyIconSize === 'large') config.iconSize = legacyIconSize;

      const legacyTexture = localStorage.getItem('Eclipin_texture');
      if (legacyTexture) config.texture = legacyTexture;

      const legacyGradient = localStorage.getItem('Eclipin_gradient');
      if (legacyGradient) config.gradient = legacyGradient;

      const legacyOpenInNewTab = localStorage.getItem('Eclipin_openInNewTab');
      if (legacyOpenInNewTab !== null) config.openInNewTab = legacyOpenInNewTab === 'true';

      // Save migrated config
      const newJson = JSON.stringify(config);
      localStorage.setItem(STORAGE_KEYS.CONFIG, newJson);
      memoryCache.config = { data: config, raw: newJson };

      return config;
    } catch {
      return DEFAULT_CONFIG;
    }
  },

  saveConfig(config: AppConfig): void {
    try {
      const json = JSON.stringify(config);
      localStorage.setItem(STORAGE_KEYS.CONFIG, json);
      memoryCache.config = { data: config, raw: json };
    } catch (error) {
      console.error('Failed to save config:', error);
    }
  },

  updateConfig(patch: Partial<AppConfig>): void {
    const current = this.getConfig();
    const next = { ...current, ...patch };
    this.saveConfig(next);
  },

  getSolidGradient(): string | null {
    return this.getConfig().solidGradient;
  },

  saveSolidGradient(solidGradient: string | null): void {
    this.updateConfig({ solidGradient });
  },

  // ==========================================================================
  // Specific Settings Accessors (Adapters using getConfig/saveConfig)
  // ==========================================================================

  getTheme(): string {
    return this.getConfig().theme;
  },

  saveTheme(theme: string): void {
    this.updateConfig({ theme });
  },

  getFollowSystem(): boolean {
    return this.getConfig().followSystem;
  },

  saveFollowSystem(followSystem: boolean): void {
    this.updateConfig({ followSystem });
  },

  getDockPosition(): 'top' | 'center' | 'bottom' {
    const value = this.getConfig().dockPosition;
    return value === 'top' || value === 'center' ? value : 'bottom';
  },

  saveDockPosition(dockPosition: 'top' | 'center' | 'bottom'): void {
    this.updateConfig({ dockPosition });
  },

  getIconSize(): 'large' | 'small' {
    return this.getConfig().iconSize;
  },

  saveIconSize(iconSize: 'large' | 'small'): void {
    this.updateConfig({ iconSize });
  },

  getTexture(): string {
    return this.getConfig().texture;
  },

  saveTexture(texture: string): void {
    this.updateConfig({ texture });
  },

  getGradient(): string | null {
    return this.getConfig().gradient;
  },

  saveGradient(gradient: string | null): void {
    this.updateConfig({ gradient });
  },

  getOpenInNewTab(): boolean {
    return this.getConfig().openInNewTab;
  },

  saveOpenInNewTab(openInNewTab: boolean): void {
    this.updateConfig({ openInNewTab });
  },

  getAppearancePalette(): string {
    return this.getConfig().appearancePalette;
  },

  saveAppearancePalette(appearancePalette: string): void {
    this.updateConfig({ appearancePalette });
  },

  getContainerStyle(): 'classic' | 'frame' | 'ambient' | 'veil' {
    const value = this.getConfig().containerStyle;
    return value === 'frame' || value === 'ambient' || value === 'veil' ? value : 'classic';
  },

  saveContainerStyle(containerStyle: 'classic' | 'frame' | 'ambient' | 'veil'): void {
    this.updateConfig({ containerStyle });
  },

  getPageScrollMode(): StoredPageScrollMode {
    return this.getConfig().pageScrollMode === 'paged' ? 'paged' : 'continuous';
  },

  savePageScrollMode(pageScrollMode: StoredPageScrollMode): void {
    this.updateConfig({ pageScrollMode });
  },

  getPageSlideDirection(): StoredPageSlideDirection {
    return this.getConfig().pageSlideDirection === 'horizontal' ? 'horizontal' : 'vertical';
  },

  savePageSlideDirection(pageSlideDirection: StoredPageSlideDirection): void {
    this.updateConfig({
      pageSlideDirection,
      ...(pageSlideDirection === 'horizontal' ? { pageScrollMode: 'paged' as const } : {}),
    });
  },

  // ==========================================================================
  // Large Data / Independent Storage
  // ==========================================================================

  getDockItems(): DockItem[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.DOCK_ITEMS);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      const migrated = migrateDockItemsNavigationActions(parsed);
      if (migrated.changed) this.saveDockItems(migrated.items);
      return migrated.items;
    } catch {
      return [];
    }
  },

  saveDockItems(items: DockItem[]): void {
    try {
      const migrated = migrateDockItemsNavigationActions(items).items;
      localStorage.setItem(STORAGE_KEYS.DOCK_ITEMS, JSON.stringify(migrated));
    } catch (error) {
      console.error('Failed to save dock items:', error);
    }
  },

  getSearchEngine(): SearchEngine | null {
    try {
      const engine = localStorage.getItem(STORAGE_KEYS.SEARCH_ENGINE);
      return engine ? JSON.parse(engine) : null;
    } catch {
      return null;
    }
  },

  saveSearchEngine(engine: SearchEngine): void {
    try {
      localStorage.setItem(STORAGE_KEYS.SEARCH_ENGINE, JSON.stringify(engine));
    } catch (error) {
      console.error('Failed to save search engine:', error);
    }
  },

  getWallpaperId(): string | null {
    try {
      return localStorage.getItem(STORAGE_KEYS.WALLPAPER_ID);
    } catch {
      return null;
    }
  },

  saveWallpaperId(id: string | null): void {
    try {
      if (id) {
        localStorage.setItem(STORAGE_KEYS.WALLPAPER_ID, id);
      } else {
        localStorage.removeItem(STORAGE_KEYS.WALLPAPER_ID);
      }
    } catch (error) {
      console.error('Failed to save wallpaper ID:', error);
    }
  },

  // ==========================================================================
  // Focus Spaces
  // ==========================================================================

  getSpaces(): SpacesState {
    try {
      const cached = getCached(STORAGE_KEYS.SPACES, memoryCache.spaces);
      if (cached) return cached;

      const spacesJson = localStorage.getItem(STORAGE_KEYS.SPACES);
      if (spacesJson) {
        const parsed = JSON.parse(spacesJson);
        if (parsed && Array.isArray(parsed.spaces) && parsed.spaces.length > 0) {
          const migrated = migrateSpacesNavigationActions(parsed as SpacesState);
          if (migrated.changed) {
            this.saveSpaces(migrated.state);
            return migrated.state;
          }
          memoryCache.spaces = { data: migrated.state, raw: spacesJson };
          return migrated.state;
        }
      }

      // Migration from legacy dock items
      const legacyItems = this.getDockItems();
      if (legacyItems.length > 0) {
        const migratedState = createDefaultSpacesState(legacyItems);
        this.saveSpaces(migratedState);
        return migratedState;
      }

      const defaultState = createDefaultSpacesState();
      this.saveSpaces(defaultState);
      return defaultState;
    } catch (error) {
      console.error('Failed to get spaces:', error);
      const fallbackState = createDefaultSpacesState();
      this.saveSpaces(fallbackState);
      return fallbackState;
    }
  },

  saveSpaces(state: SpacesState): void {
    try {
      const normalizedState = migrateSpacesNavigationActions(state).state;
      const json = JSON.stringify(normalizedState);
      localStorage.setItem(STORAGE_KEYS.SPACES, json);
      memoryCache.spaces = { data: normalizedState, raw: json };
    } catch (error) {
      console.error('Failed to save spaces:', error);
    }
  },

  clearSpaces(): void {
    try {
      localStorage.removeItem(STORAGE_KEYS.SPACES);
      memoryCache.spaces = null;
    } catch (error) {
      console.error('Failed to clear spaces:', error);
    }
  },

  // ==========================================================================
  // Zen Shelf Stickers
  // ==========================================================================

  hasStickerLayout(mode: LayoutStorageMode = 'vertical'): boolean {
    try {
      const key = mode === 'horizontal' ? STORAGE_KEYS.HORIZONTAL_STICKERS : STORAGE_KEYS.STICKERS;
      return localStorage.getItem(key) !== null;
    } catch {
      return false;
    }
  },

  getStickers(mode: LayoutStorageMode = 'vertical'): Sticker[] {
    try {
      const key = mode === 'horizontal' ? STORAGE_KEYS.HORIZONTAL_STICKERS : STORAGE_KEYS.STICKERS;
      const cacheKey = mode === 'horizontal' ? 'horizontalStickers' : 'stickers';
      const cached = getCached(key, memoryCache[cacheKey]);
      if (cached) return cached;
      const raw = localStorage.getItem(key);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as Sticker[];
      const migrated = migrateStickerNavigationActions(parsed);
      if (migrated.changed) {
        const migratedRaw = JSON.stringify(migrated.stickers);
        localStorage.setItem(key, migratedRaw);
        memoryCache[cacheKey] = { data: migrated.stickers, raw: migratedRaw };
      } else {
        memoryCache[cacheKey] = { data: migrated.stickers, raw };
      }
      return migrated.stickers;
    } catch (error) {
      console.error('Failed to get stickers:', error);
      return [];
    }
  },

  saveStickers(stickers: Sticker[], mode: LayoutStorageMode = 'vertical'): void {
    try {
      const key = mode === 'horizontal' ? STORAGE_KEYS.HORIZONTAL_STICKERS : STORAGE_KEYS.STICKERS;
      const cacheKey = mode === 'horizontal' ? 'horizontalStickers' : 'stickers';
      const normalized = migrateStickerNavigationActions(stickers).stickers;
      const json = JSON.stringify(normalized);
      localStorage.setItem(key, json);
      memoryCache[cacheKey] = { data: normalized, raw: json };
    } catch (error) {
      console.error('Failed to save stickers:', error);
    }
  },

  getDeletedStickers(mode: LayoutStorageMode = 'vertical'): Sticker[] {
    try {
      const key = mode === 'horizontal' ? STORAGE_KEYS.HORIZONTAL_DELETED_STICKERS : STORAGE_KEYS.DELETED_STICKERS;
      const cacheKey = mode === 'horizontal' ? 'horizontalDeletedStickers' : 'deletedStickers';
      const cached = getCached(key, memoryCache[cacheKey]);
      if (cached) return cached;
      const raw = localStorage.getItem(key);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as Sticker[];
      const migrated = migrateStickerNavigationActions(parsed);
      if (migrated.changed) {
        const migratedRaw = JSON.stringify(migrated.stickers);
        localStorage.setItem(key, migratedRaw);
        memoryCache[cacheKey] = { data: migrated.stickers, raw: migratedRaw };
      } else {
        memoryCache[cacheKey] = { data: migrated.stickers, raw };
      }
      return migrated.stickers;
    } catch (error) {
      console.error('Failed to get deleted stickers:', error);
      return [];
    }
  },

  saveDeletedStickers(stickers: Sticker[], mode: LayoutStorageMode = 'vertical'): void {
    try {
      const key = mode === 'horizontal' ? STORAGE_KEYS.HORIZONTAL_DELETED_STICKERS : STORAGE_KEYS.DELETED_STICKERS;
      const cacheKey = mode === 'horizontal' ? 'horizontalDeletedStickers' : 'deletedStickers';
      const normalized = migrateStickerNavigationActions(stickers).stickers;
      const json = JSON.stringify(normalized);
      localStorage.setItem(key, json);
      memoryCache[cacheKey] = { data: normalized, raw: json };
    } catch (error) {
      console.error('Failed to save deleted stickers:', error);
    }
  },

  // ==========================================================================
  // 贴纸图片迁移
  // ==========================================================================

  isStickerImagesMigrated(): boolean {
    try {
      return localStorage.getItem(STORAGE_KEYS.STICKER_IMAGES_MIGRATED) === 'true';
    } catch {
      return false;
    }
  },

  markStickerImagesMigrated(): void {
    try {
      localStorage.setItem(STORAGE_KEYS.STICKER_IMAGES_MIGRATED, 'true');
    } catch (error) {
      console.error('Failed to mark sticker images migrated:', error);
    }
  },

  /**
   * 清理旧版壁纸 localStorage 数据
   */
  cleanupLegacyWallpaper(): void {
    try {
      localStorage.removeItem('Eclipin_wallpaper');
      localStorage.removeItem('Eclipin_lastWallpaper');
    } catch {
      // ignore
    }
  },
};
