import type { TranslatorLanguageCode, TranslatorProvider } from '../../types/widget';
import { TRANSLATOR_LANGUAGES } from '../../config/widgetCatalog';
import { openExternalUrl } from '../../utils/widgetFormatters';
import type { SortableWidgetController } from '../../hooks/useSortableWidgetController';
import type { SortableWidgetProps } from './SortableWidget.types';
import styles from './TranslatorWidget.module.css';

interface TranslatorWidgetBodyProps {
  props: SortableWidgetProps;
  controller: SortableWidgetController;
}

const PROVIDERS: Array<{ id: TranslatorProvider; label: string; short: string }> = [
  { id: 'google', label: 'Google', short: 'G' },
  { id: 'baidu', label: '百度', short: '百' },
];

export const TranslatorWidgetBody = ({ props, controller }: TranslatorWidgetBodyProps) => {
  const { widget, onUpdate } = props;
  const {
    dictionaryUrl,
    openInNewTab,
    setTranslationDraft,
    setTranslationProvider,
    setTranslationRefreshKey,
    setTranslationResult,
    startDrag,
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
  } = controller;

  if (widget.type !== 'translate') return null;
  const isTranslating = translationStatus === '正在翻译…';
  const provider = PROVIDERS.find((item) => item.id === translationProvider) ?? PROVIDERS[0];

  return (
    <div className={styles.translatorBody} aria-live="polite" onPointerDown={startDrag}>
      <div className={styles.translatorProviderBar}>
        <span>翻译服务</span>
        <div className={styles.translatorProviderSwitch} role="group" aria-label="翻译服务">
          {PROVIDERS.map((item) => (
            <button
              type="button"
              key={item.id}
              className={translationProvider === item.id ? styles.translatorProviderActive : ''}
              onClick={() => setTranslationProvider(item.id)}
              title={`切换到 ${item.label} 翻译`}
            >{item.short} {item.label}</button>
          ))}
        </div>
      </div>

      <div className={styles.translatorLanguageBar} onPointerDown={(event) => event.stopPropagation()}>
        <label>
          <span className={styles.srOnly}>源语言</span>
          <select
            className="field"
            value={translationSourceLanguage}
            onChange={(event) => onUpdate(widget.id, { translateSourceLanguage: event.target.value as TranslatorLanguageCode })}
            aria-label="源语言"
          >
            {TRANSLATOR_LANGUAGES.map((language) => <option key={language.code} value={language.code}>{language.label}</option>)}
          </select>
        </label>
        <button type="button" className={`icon-btn ${styles.translatorSwap}`} onClick={swapTranslationLanguages} aria-label="交换翻译语言" title="交换翻译语言">⇄</button>
        <label>
          <span className={styles.srOnly}>目标语言</span>
          <select
            className="field"
            value={translationTargetLanguage}
            onChange={(event) => onUpdate(widget.id, { translateTargetLanguage: event.target.value as Exclude<TranslatorLanguageCode, 'auto'> })}
            aria-label="目标语言"
          >
            {TRANSLATOR_LANGUAGES.filter((language) => language.code !== 'auto').map((language) => <option key={language.code} value={language.code}>{language.label}</option>)}
          </select>
        </label>
      </div>

      <div className={styles.translatorPanels} onPointerDown={(event) => event.stopPropagation()}>
        <div className={`field-shell ${styles.translatorInputPanel}`}>
          <textarea
            className="field-shell__input"
            ref={translatorInputRef}
            value={translationDraft}
            maxLength={600}
            placeholder="输入单词或句子…"
            aria-label="需要翻译的文字"
            spellCheck
            onChange={(event) => setTranslationDraft(event.target.value)}
          />
          {translationDraft ? (
            <button
              type="button"
              className={`icon-btn icon-btn--round ${styles.translatorClear}`}
              onClick={() => {
                setTranslationDraft('');
                setTranslationResult('');
                translatorInputRef.current?.focus();
              }}
              aria-label="清空输入"
              title="清空输入"
            >×</button>
          ) : null}
        </div>
        <div className={`${styles.translatorOutputPanel} ${isTranslating ? styles.translatorOutputLoading : ''}`}>
          {translationResult || (isTranslating ? '正在翻译…' : '翻译结果会显示在这里')}
        </div>
      </div>

      <div className={styles.translatorFooter} onPointerDown={(event) => event.stopPropagation()}>
        <span className={styles.translatorStatus} title={translationStatus}>{translationStatus}</span>
        <div className={styles.translatorActions}>
          <button
            type="button"
            className={`icon-btn icon-btn--round ${styles.translatorIconButton}`}
            disabled={!translationQuery || isTranslating}
            onClick={() => setTranslationRefreshKey((value) => value + 1)}
            aria-label="重新翻译"
            title="重新翻译"
          >↻</button>
          <button
            type="button"
            className={`icon-btn icon-btn--round ${styles.translatorIconButton}`}
            disabled={!translationQuery}
            onClick={() => openExternalUrl(translatorWebUrl, openInNewTab)}
            aria-label={`在 ${provider.label} 翻译中打开`}
            title={`在 ${provider.label} 翻译中打开`}
          >{provider.short}</button>
          <button
            type="button"
            className={`btn btn--sm ${styles.translatorDictionaryButton}`}
            disabled={!translationQuery}
            onClick={() => openExternalUrl(dictionaryUrl, openInNewTab)}
            aria-label="在有道词典中查询"
            title="在有道词典中查询当前输入"
          >词典 ↗</button>
        </div>
      </div>
    </div>
  );
};
