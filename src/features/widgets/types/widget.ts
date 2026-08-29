import type { BuiltInFontId } from '@/shared/constants/builtInFonts';
import type { NavigationAction } from '@/shared/navigation';
import type { TranslatorLanguageCode, TranslatorProvider } from '@/features/translation/types/translation';
export type { TranslatorLanguageCode, TranslatorProvider } from '@/features/translation/types/translation';

export type WidgetType = 'clock' | 'analogClock' | 'weather' | 'translate' | 'link' | 'notes' | 'todo' | 'pomodoro' | 'calendar' | 'countdown' | 'gtrend' | 'embed' | 'space' | 'bookmarks' | 'openTabs';
export type WidgetPageId = number;
export type WidgetContainerStyle = 'classic' | 'frame' | 'ambient' | 'veil';
export type WeatherLocationMode = 'current' | 'custom';

export interface WeatherCustomLocation {
  name: string;
  country?: string;
  admin1?: string;
  latitude: number;
  longitude: number;
  timezone?: string;
}

export interface WidgetLayout {
  id: string;
  type: WidgetType;
  x: number;
  y: number;
  w: number;
  h: number;
  /** 页面索引：0 = 首页；横向模式可为 1、2、3…；纵向模式主要使用 0/1。 */
  pageId?: WidgetPageId;
  spaceId?: string;
  name?: string;
  url?: string;
  /** 可选结构化导航动作；快捷链接/命令可直接复用 NavigationRouter。 */
  action?: NavigationAction;
  embedUrl?: string;
  /** 导入的本地单文件 HTML，正文保存在 IndexedDB。 */
  embedLocalId?: string;
  embedLocalName?: string;
  /** 本地网页重新导入时间，用于强制刷新同 ID 的网页包。 */
  embedLocalUpdatedAt?: number;
  icon?: string;
  iconSmall?: boolean;
  linkTextColor?: string;
  linkTextSize?: number;
  noteText?: string;
  noteFontSize?: number;
  fontFamily?: BuiltInFontId;
  pomodoroFocusMinutes?: number;
  pomodoroBreakMinutes?: number;
  /** ISO 本地日期，例如 2026-12-31。 */
  countdownDate?: string;
  translateText?: string;
  translateProvider?: TranslatorProvider;
  translateSourceLanguage?: TranslatorLanguageCode;
  translateTargetLanguage?: Exclude<TranslatorLanguageCode, 'auto'>;
  weatherLocationMode?: WeatherLocationMode;
  weatherCustomLocation?: WeatherCustomLocation;
  /** 浏览器书签图标的本地覆盖，键为稳定的 bookmark-* 项目 ID。 */
  bookmarkIcons?: Record<string, { icon: string; iconSmall?: boolean }>;
  /** “打开的标签页”组件中新网站默认添加到的 Focus Space。 */
  openTabsTargetSpaceId?: string;
  isPinned?: boolean;
  /** page: 随页面/组件桌面滚动；viewport: 相对浏览器视口固定。 */
  positionMode?: 'page' | 'viewport';
  /** 内部导航标签，可由贴纸使用 #标签 跳转到此组件。 */
  anchorId?: string;
  /** 数值越大，在组件重叠时越靠上。 */
  priority?: number;
  /** 调整容器尺寸时是否保持当前宽高比；贴纸固定锁定，组件可自由切换。 */
  lockAspectRatio?: boolean;
  /** 单个组件的容器样式覆盖；未设置时跟随全局背景容器。 */
  containerStyle?: WidgetContainerStyle;
}

export interface WidgetSizeRule {
  minW: number;
  minH: number;
  maxW: number;
  maxH: number;
  defW: number;
  defH: number;
}

export interface WidgetViewport {
  w: number;
  h: number;
}

export interface WidgetCounts {
  first: number;
  second: number;
}
