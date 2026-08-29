export type TranslatorLanguageCode = 'auto' | 'zh-CN' | 'en' | 'ja' | 'ko' | 'fr' | 'de' | 'es' | 'ru';
export type TranslatorProvider = 'google' | 'baidu';

export interface BaiduTranslationCredentials {
  appId: string;
  secretKey: string;
}
