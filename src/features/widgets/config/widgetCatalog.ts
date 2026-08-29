import type { TranslatorLanguageCode } from '../types/widget';

export const TRANSLATOR_LANGUAGES: Array<{ code: TranslatorLanguageCode; label: string }> = [
  { code: 'auto', label: '自动检测' },
  { code: 'zh-CN', label: '简体中文' },
  { code: 'en', label: '英语' },
  { code: 'ja', label: '日语' },
  { code: 'ko', label: '韩语' },
  { code: 'fr', label: '法语' },
  { code: 'de', label: '德语' },
  { code: 'es', label: '西班牙语' },
  { code: 'ru', label: '俄语' },
];

export const ANALOG_CLOCK_COLOR = '#1C1C1E';
export const ANALOG_CLOCK_STROKE_WIDTH = 4;
export const ANALOG_CLOCK_OUTLINE_EXTRA_WIDTH = 2;
export const ANALOG_CLOCK_CENTER = 120;
