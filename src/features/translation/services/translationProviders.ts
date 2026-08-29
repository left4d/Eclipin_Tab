import { md5 } from '@/shared/utils/md5';
import type {
  BaiduTranslationCredentials,
  TranslatorLanguageCode,
  TranslatorProvider,
} from '../types/translation';

const BAIDU_CREDENTIALS_KEY = 'eclipin_baidu_translate_credentials_v1';
export const BAIDU_TRANSLATION_SETTINGS_CHANGED_EVENT = 'eclipin:baidu-translation-settings-changed';
export const BAIDU_TRANSLATE_API_URL = 'https://fanyi-api.baidu.com/api/trans/vip/translate';

const BAIDU_LANGUAGE_CODES: Record<TranslatorLanguageCode, string> = {
  auto: 'auto',
  'zh-CN': 'zh',
  en: 'en',
  ja: 'jp',
  ko: 'kor',
  fr: 'fra',
  de: 'de',
  es: 'spa',
  ru: 'ru',
};

const getStorage = (): Storage | null => {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
};

export const loadBaiduTranslationCredentials = (): BaiduTranslationCredentials => {
  try {
    const raw = getStorage()?.getItem(BAIDU_CREDENTIALS_KEY);
    if (!raw) return { appId: '', secretKey: '' };
    const parsed = JSON.parse(raw) as Partial<BaiduTranslationCredentials>;
    return { appId: String(parsed.appId ?? ''), secretKey: String(parsed.secretKey ?? '') };
  } catch {
    return { appId: '', secretKey: '' };
  }
};

export const saveBaiduTranslationCredentials = (credentials: BaiduTranslationCredentials): void => {
  try {
    getStorage()?.setItem(BAIDU_CREDENTIALS_KEY, JSON.stringify({
      appId: credentials.appId.trim(),
      secretKey: credentials.secretKey.trim(),
    }));
    if (typeof window !== 'undefined') window.dispatchEvent(new Event(BAIDU_TRANSLATION_SETTINGS_CHANGED_EVENT));
  } catch {
    // localStorage 不可用时不阻塞设置页。
  }
};

export const hasBaiduTranslationCredentials = (credentials = loadBaiduTranslationCredentials()): boolean => (
  Boolean(credentials.appId.trim() && credentials.secretKey.trim())
);

export const parseGoogleTranslation = (payload: unknown): string => {
  if (!Array.isArray(payload) || !Array.isArray(payload[0])) return '';
  return payload[0]
    .map((segment) => (Array.isArray(segment) && typeof segment[0] === 'string' ? segment[0] : ''))
    .join('')
    .trim();
};

interface BaiduTranslationResponse {
  trans_result?: Array<{ src?: string; dst?: string }>;
  error_code?: string | number;
  error_msg?: string;
}

export const parseBaiduTranslation = (payload: unknown): string => {
  if (!payload || typeof payload !== 'object') return '';
  const response = payload as BaiduTranslationResponse;
  if (!Array.isArray(response.trans_result)) return '';
  return response.trans_result.map((item) => item?.dst ?? '').join('\n').trim();
};

export const getTranslatorWebUrl = (
  provider: TranslatorProvider,
  query: string,
  source: TranslatorLanguageCode,
  target: Exclude<TranslatorLanguageCode, 'auto'>,
): string => {
  if (provider === 'baidu') {
    const from = BAIDU_LANGUAGE_CODES[source];
    const to = BAIDU_LANGUAGE_CODES[target];
    return `https://fanyi.baidu.com/#${encodeURIComponent(from)}/${encodeURIComponent(to)}/${encodeURIComponent(query)}`;
  }
  return `https://translate.google.com/?sl=${encodeURIComponent(source)}&tl=${encodeURIComponent(target)}&text=${encodeURIComponent(query)}&op=translate`;
};

export const translateWithGoogle = async ({
  text,
  source,
  target,
  signal,
}: {
  text: string;
  source: TranslatorLanguageCode;
  target: Exclude<TranslatorLanguageCode, 'auto'>;
  signal: AbortSignal;
}): Promise<string> => {
  const params = new URLSearchParams({ client: 'gtx', sl: source, tl: target, dt: 't', q: text });
  const response = await fetch(`https://translate.googleapis.com/translate_a/single?${params.toString()}`, {
    signal,
    credentials: 'omit',
    cache: 'no-store',
  });
  if (!response.ok) throw new Error('google translation request failed');
  const result = parseGoogleTranslation(await response.json());
  if (!result) throw new Error('empty google translation result');
  return result;
};

export const translateWithBaidu = async ({
  text,
  source,
  target,
  credentials,
  signal,
}: {
  text: string;
  source: TranslatorLanguageCode;
  target: Exclude<TranslatorLanguageCode, 'auto'>;
  credentials: BaiduTranslationCredentials;
  signal: AbortSignal;
}): Promise<string> => {
  if (!hasBaiduTranslationCredentials(credentials)) throw new Error('baidu credentials missing');
  const salt = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const sign = md5(`${credentials.appId}${text}${salt}${credentials.secretKey}`);
  const params = new URLSearchParams({
    q: text,
    from: BAIDU_LANGUAGE_CODES[source],
    to: BAIDU_LANGUAGE_CODES[target],
    appid: credentials.appId,
    salt,
    sign,
  });
  const response = await fetch(BAIDU_TRANSLATE_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
    credentials: 'omit',
    cache: 'no-store',
    signal,
  });
  if (!response.ok) throw new Error('baidu translation request failed');
  const payload = await response.json() as BaiduTranslationResponse;
  if (payload.error_code) throw new Error(`baidu translation error ${payload.error_code}`);
  const result = parseBaiduTranslation(payload);
  if (!result) throw new Error('empty baidu translation result');
  return result;
};
