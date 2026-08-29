import { useEffect, useRef, useState } from 'react';
import type { TranslatorLanguageCode, TranslatorProvider } from '../types/widget';
import { getLanguageLabel } from '../utils/widgetFormatters';
import type { SortableWidgetProps } from '../components/sortable/SortableWidget.types';
import { hasHostPermissionForUrl } from '@/shared/utils/hostPermission';
import {
  BAIDU_TRANSLATE_API_URL,
  BAIDU_TRANSLATION_SETTINGS_CHANGED_EVENT,
  getTranslatorWebUrl,
  hasBaiduTranslationCredentials,
  loadBaiduTranslationCredentials,
  translateWithBaidu,
  translateWithGoogle,
} from '@/features/translation/services/translationProviders';

export const useWidgetTranslation = (
  widget: SortableWidgetProps['widget'],
  onUpdate: SortableWidgetProps['onUpdate'],
) => {
  const translatorInputRef = useRef<HTMLTextAreaElement>(null);
  const [translationDraft, setTranslationDraft] = useState(() => widget.translateText ?? '');
  const [translationResult, setTranslationResult] = useState('');
  const [translationStatus, setTranslationStatus] = useState('输入文字后自动翻译');
  const [translationRefreshKey, setTranslationRefreshKey] = useState(0);
  const [translationSettingsVersion, setTranslationSettingsVersion] = useState(0);
  const translationProvider: TranslatorProvider = widget.translateProvider ?? 'google';
  const translationSourceLanguage: TranslatorLanguageCode = widget.translateSourceLanguage ?? 'auto';
  const translationTargetLanguage: Exclude<TranslatorLanguageCode, 'auto'> = widget.translateTargetLanguage ?? 'zh-CN';

  useEffect(() => {
    if (widget.type !== 'translate') return;
    if (document.activeElement !== translatorInputRef.current) {
      setTranslationDraft(widget.translateText ?? '');
    }
  }, [widget.translateText, widget.type]);

  useEffect(() => {
    if (widget.type !== 'translate' || translationDraft === (widget.translateText ?? '')) return;
    const timer = window.setTimeout(() => onUpdate(widget.id, { translateText: translationDraft }), 350);
    return () => window.clearTimeout(timer);
  }, [onUpdate, translationDraft, widget.id, widget.translateText, widget.type]);

  useEffect(() => {
    if (widget.type !== 'translate') return;
    const refreshSettings = () => setTranslationSettingsVersion((value) => value + 1);
    window.addEventListener(BAIDU_TRANSLATION_SETTINGS_CHANGED_EVENT, refreshSettings);
    return () => window.removeEventListener(BAIDU_TRANSLATION_SETTINGS_CHANGED_EVENT, refreshSettings);
  }, [widget.type]);

  useEffect(() => {
    if (widget.type !== 'translate') return;
    const text = translationDraft.trim();
    if (!text) {
      setTranslationResult('');
      setTranslationStatus('输入文字后自动翻译');
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setTranslationResult('');
      setTranslationStatus('正在翻译…');
      try {
        if (translationProvider === 'baidu') {
          const credentials = loadBaiduTranslationCredentials();
          if (!hasBaiduTranslationCredentials(credentials)) {
            setTranslationStatus('百度翻译需在 设置 → 接口 填写 APP ID 和密钥');
            return;
          }
          if (!(await hasHostPermissionForUrl(BAIDU_TRANSLATE_API_URL))) {
            setTranslationStatus('百度翻译需在 设置 → 接口 授权网络访问');
            return;
          }
          const result = await translateWithBaidu({
            text,
            source: translationSourceLanguage,
            target: translationTargetLanguage,
            credentials,
            signal: controller.signal,
          });
          setTranslationResult(result);
          setTranslationStatus(`百度翻译 · ${getLanguageLabel(translationSourceLanguage)} → ${getLanguageLabel(translationTargetLanguage)}`);
          return;
        }

        const result = await translateWithGoogle({
          text,
          source: translationSourceLanguage,
          target: translationTargetLanguage,
          signal: controller.signal,
        });
        setTranslationResult(result);
        setTranslationStatus(`Google 翻译 · ${getLanguageLabel(translationSourceLanguage)} → ${getLanguageLabel(translationTargetLanguage)}`);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === 'AbortError')) {
          setTranslationStatus(translationProvider === 'baidu'
            ? '百度翻译失败，请检查接口配置或重新授权'
            : 'Google 翻译失败，可重试或打开网页翻译');
        }
      }
    }, 520);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [translationDraft, translationProvider, translationRefreshKey, translationSettingsVersion, translationSourceLanguage, translationTargetLanguage, widget.type]);

  const translationQuery = translationDraft.trim();
  const translatorWebUrl = getTranslatorWebUrl(
    translationProvider,
    translationQuery,
    translationSourceLanguage,
    translationTargetLanguage,
  );
  const dictionaryUrl = translationQuery
    ? `https://dict.youdao.com/w/${encodeURIComponent(translationQuery)}/`
    : 'https://dict.youdao.com/';

  const setTranslationProvider = (provider: TranslatorProvider) => {
    if (provider === translationProvider) return;
    setTranslationResult('');
    onUpdate(widget.id, { translateProvider: provider });
  };

  const swapTranslationLanguages = () => {
    const nextSource: TranslatorLanguageCode = translationTargetLanguage;
    const nextTarget: Exclude<TranslatorLanguageCode, 'auto'> = translationSourceLanguage === 'auto'
      ? (translationTargetLanguage === 'zh-CN' ? 'en' : 'zh-CN')
      : translationSourceLanguage;

    onUpdate(widget.id, {
      translateSourceLanguage: nextSource,
      translateTargetLanguage: nextTarget,
    });

    if (translationResult) {
      const previousInput = translationDraft;
      setTranslationDraft(translationResult);
      setTranslationResult(previousInput);
    }
  };

  return {
    dictionaryUrl,
    setTranslationDraft,
    setTranslationProvider,
    setTranslationRefreshKey,
    setTranslationResult,
    swapTranslationLanguages,
    translationDraft,
    translationProvider,
    translationQuery,
    translationResult,
    translationSourceLanguage,
    translationStatus,
    translationTargetLanguage,
    translatorInputRef,
    translatorWebUrl,
  };
};
