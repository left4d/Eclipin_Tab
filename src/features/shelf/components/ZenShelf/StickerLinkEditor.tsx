import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Sticker } from '@/shared/types';
import { parseNavigationAction } from '@/shared/navigation';
import {
  buildStickerPageTarget,
  getStickerLinkTarget,
  normalizeStickerAnchorId,
  normalizeStickerLinkTarget,
  parseStickerLinkTarget,
  type StickerLinkKind,
} from '@/features/shelf/utils/stickerNavigation';
import { getStoredWidgetAnchorEntries } from '@/features/widgets/services/widgetAnchorService';
import { useThemeData } from '@/features/theme/context/ThemeContext';
import styles from './StickerLinkEditor.module.css';

interface StickerLinkEditorProps {
  sticker: Sticker;
  stickers: Sticker[];
  onClose: () => void;
  onSave: (updates: Pick<Sticker, 'anchorId' | 'action' | 'linkTarget' | 'imageLinkUrl'>) => void;
}

type TargetGroup = 'external' | 'anchor' | 'page' | 'layout' | 'advanced';

const pageModes: StickerLinkKind[] = ['previous', 'next', 'page', 'conditional', 'coordinate'];

const getInitialMode = (sticker: Sticker): StickerLinkKind => parseStickerLinkTarget(getStickerLinkTarget(sticker))?.kind ?? 'external';

const getTargetGroup = (mode: StickerLinkKind): TargetGroup => {
  if (mode === 'external') return 'external';
  if (mode === 'anchor') return 'anchor';
  if (mode === 'condition') return 'advanced';
  if (mode === 'layout') return 'layout';
  return 'page';
};

const targetGroupOptions: Array<{ value: TargetGroup; label: string; description: string; icon: string }> = [
  { value: 'external', label: '打开网页', description: '网址或在线资源', icon: '↗' },
  { value: 'anchor', label: '跳到标签', description: '贴纸或组件位置', icon: '#' },
  { value: 'page', label: '页面跳转', description: '翻页、指定页、坐标', icon: '▣' },
  { value: 'layout', label: '空间切换', description: '上下 / 左右翻页', icon: '⇄' },
  { value: 'advanced', label: '高级规则', description: '按当前页判断去向', icon: '⌘' },
];

const pageModeOptions: Array<{ value: StickerLinkKind; label: string; description: string }> = [
  { value: 'previous', label: '上一页', description: '动态返回前一页' },
  { value: 'next', label: '下一页', description: '动态进入后一页' },
  { value: 'page', label: '指定页', description: '固定跳到某一页' },
  { value: 'conditional', label: '两页切换', description: '在两个页面间往返' },
  { value: 'coordinate', label: '页内坐标', description: '跳页并定位到坐标' },
];

const conditionPresets = [
  { label: '第 3 页 ↔ 第 1 页', value: 'if page=3 then 1 else 3' },
  { label: '第 3 页后返回，否则前进', value: 'if page>=3 then prev else next' },
];

export const StickerLinkEditor = ({ sticker, stickers, onClose, onSave }: StickerLinkEditorProps) => {
  const { pageSlideDirection } = useThemeData();
  const parsedInitial = useMemo(() => parseStickerLinkTarget(getStickerLinkTarget(sticker)), [sticker]);
  const [mode, setMode] = useState<StickerLinkKind>(() => getInitialMode(sticker));
  const [anchorId, setAnchorId] = useState(sticker.anchorId ?? '');
  const [showAnchorSettings, setShowAnchorSettings] = useState(Boolean(sticker.anchorId));
  const [externalUrl, setExternalUrl] = useState(parsedInitial?.kind === 'external' ? parsedInitial.url : '');
  const [targetAnchor, setTargetAnchor] = useState(parsedInitial?.kind === 'anchor' ? parsedInitial.anchorId : '');
  const [screen, setScreen] = useState(parsedInitial && (parsedInitial.kind === 'page' || parsedInitial.kind === 'conditional' || parsedInitial.kind === 'coordinate') ? parsedInitial.screen : 2);
  const [elseScreen, setElseScreen] = useState(parsedInitial?.kind === 'conditional' ? parsedInitial.elseScreen : 1);
  const [conditionExpression, setConditionExpression] = useState(parsedInitial?.kind === 'condition' ? parsedInitial.value : 'if page=3 then 1 else 2');
  const [coordinateX, setCoordinateX] = useState(parsedInitial?.kind === 'coordinate' ? parsedInitial.x : 320);
  const [coordinateY, setCoordinateY] = useState(parsedInitial?.kind === 'coordinate' ? parsedInitial.y : 260);
  const [layoutDirection, setLayoutDirection] = useState<'vertical' | 'horizontal' | 'toggle'>(parsedInitial?.kind === 'layout' ? parsedInitial.direction : 'toggle');
  const [error, setError] = useState('');

  const activeTargetGroup = getTargetGroup(mode);
  const hasSavedLink = Boolean(getStickerLinkTarget(sticker));
  const activeTargetOption = targetGroupOptions.find(option => option.value === activeTargetGroup) ?? targetGroupOptions[0];

  const widgetAnchors = useMemo(() => getStoredWidgetAnchorEntries(pageSlideDirection).map(item => item.anchorId), [pageSlideDirection]);
  const availableAnchors = useMemo(() => Array.from(new Set([
    ...stickers
      .filter(item => item.id !== sticker.id)
      .map(item => normalizeStickerAnchorId(item.anchorId ?? ''))
      .filter(Boolean),
    ...widgetAnchors,
  ])).slice(0, 24), [sticker.id, stickers, widgetAnchors]);

  const targetPreview = useMemo(() => {
    if (mode === 'external') return normalizeStickerLinkTarget(externalUrl) || externalUrl.trim();
    if (mode === 'previous') return 'page:prev';
    if (mode === 'next') return 'page:next';
    if (mode === 'anchor') {
      const normalized = normalizeStickerAnchorId(targetAnchor);
      return normalized ? `#${normalized}` : '';
    }
    if (mode === 'conditional') return `page:${Math.max(1, Math.trunc(screen || 1))} else ${Math.max(1, Math.trunc(elseScreen || 1))}`;
    if (mode === 'condition') return conditionExpression.trim();
    if (mode === 'coordinate') return buildStickerPageTarget(screen, { x: coordinateX, y: coordinateY });
    if (mode === 'layout') return `layout:${layoutDirection}`;
    return buildStickerPageTarget(screen);
  }, [conditionExpression, coordinateX, coordinateY, elseScreen, externalUrl, layoutDirection, mode, screen, targetAnchor]);

  const targetSummary = useMemo(() => {
    if (mode === 'external') return externalUrl.trim() ? `打开 ${externalUrl.trim()}` : '尚未填写网页地址';
    if (mode === 'anchor') {
      const normalized = normalizeStickerAnchorId(targetAnchor);
      return normalized ? `跳到 #${normalized}` : '选择或输入一个目标标签';
    }
    if (mode === 'previous') return '点击后前往上一页';
    if (mode === 'next') return '点击后前往下一页';
    if (mode === 'page') return `点击后跳到第 ${Math.max(1, Math.trunc(screen || 1))} 页`;
    if (mode === 'conditional') return `默认跳到第 ${Math.max(1, Math.trunc(screen || 1))} 页；已在该页时返回第 ${Math.max(1, Math.trunc(elseScreen || 1))} 页`;
    if (mode === 'coordinate') return `跳到第 ${Math.max(1, Math.trunc(screen || 1))} 页的 (${Math.trunc(coordinateX || 0)}, ${Math.trunc(coordinateY || 0)})`;
    if (mode === 'layout') return layoutDirection === 'horizontal' ? '切换到左右翻页空间' : layoutDirection === 'vertical' ? '切换到上下翻页空间' : '在上下 / 左右翻页空间之间切换';
    return conditionExpression.trim() ? '根据当前页面执行条件规则' : '尚未填写判断规则';
  }, [conditionExpression, coordinateX, coordinateY, elseScreen, externalUrl, layoutDirection, mode, screen, targetAnchor]);

  const chooseTargetGroup = (group: TargetGroup) => {
    if (group === activeTargetGroup) return;
    if (group === 'external') setMode('external');
    else if (group === 'anchor') setMode('anchor');
    else if (group === 'advanced') setMode('condition');
    else if (group === 'layout') setMode('layout');
    else setMode(pageModes.includes(mode) ? mode : 'page');
    setError('');
  };

  const selectMode = (nextMode: StickerLinkKind) => {
    setMode(nextMode);
    setError('');
  };

  const handleSave = () => {
    const normalizedAnchor = normalizeStickerAnchorId(anchorId);
    if (normalizedAnchor && (
      stickers.some(item => item.id !== sticker.id && normalizeStickerAnchorId(item.anchorId ?? '') === normalizedAnchor)
      || widgetAnchors.includes(normalizedAnchor)
    )) {
      setError(`标签 #${normalizedAnchor} 已被其他贴纸或组件使用，请换一个名称。`);
      setShowAnchorSettings(true);
      return;
    }

    const action = parseNavigationAction(targetPreview);
    if (targetPreview.trim() && !action) {
      setError('当前跳转设置无法识别，请检查填写内容。高级规则可使用类似 “if page=3 then 1 else 2” 的格式。');
      return;
    }

    onSave({
      anchorId: normalizedAnchor || undefined,
      action: action || undefined,
      linkTarget: undefined,
      imageLinkUrl: undefined,
    });
  };

  const clearLink = () => {
    onSave({ anchorId: sticker.anchorId, action: undefined, linkTarget: undefined, imageLinkUrl: undefined });
  };

  const pasteExternalUrl = async () => {
    try {
      const value = await navigator.clipboard?.readText();
      if (!value?.trim()) return;
      setExternalUrl(value.trim());
      setError('');
    } catch {
      setError('无法读取剪贴板，请直接粘贴网址。');
    }
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
        event.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  return createPortal(
    <div className={styles.backdrop} data-page-scroll-lock="true" data-modal="true" onMouseDown={onClose}>
      <section
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-label="贴纸链接与标签"
        onMouseDown={event => event.stopPropagation()}
        onDoubleClick={event => event.stopPropagation()}
      >
        <header className={styles.header}>
          <div className={styles.headerText}>
            <span className={styles.headerEyebrow}>贴纸行为</span>
            <h2 className={styles.title}>链接与标签</h2>
            <p className={styles.subtitle}>把贴纸变成网页入口、页面按钮或内部导航点。</p>
          </div>
          <button type="button" className={`icon-btn ${styles.closeButton}`} onClick={onClose} aria-label="关闭">×</button>
        </header>

        <div className={styles.body}>
          <aside className={styles.sidebar} aria-label="点击行为类型">
            <div className={styles.sidebarLabel}>点击后</div>
            <div className={`tabs ${styles.targetGroups}`} role="tablist" aria-label="跳转类型">
              {targetGroupOptions.map(option => (
                <button
                  key={option.value}
                  type="button"
                  role="tab"
                  aria-selected={activeTargetGroup === option.value}
                  className={`tabs__item ${styles.targetGroupButton}`}
                  onClick={() => chooseTargetGroup(option.value)}
                >
                  <span className={styles.targetGroupIcon}>{option.icon}</span>
                  <span className={styles.targetGroupText}>
                    <b>{option.label}</b>
                    <small>{option.description}</small>
                  </span>
                  <span className={styles.targetGroupChevron}>›</span>
                </button>
              ))}
            </div>

            <div className={styles.sidebarDivider} />
            <button
              type="button"
              className={`${styles.anchorQuickButton} ${showAnchorSettings ? styles.anchorQuickButtonActive : ''}`}
              onClick={() => setShowAnchorSettings(value => !value)}
              aria-expanded={showAnchorSettings}
            >
              <span className={styles.anchorQuickIcon}>#</span>
              <span className={styles.anchorQuickText}>
                <b>当前贴纸标签</b>
                <small>{anchorId ? `#${normalizeStickerAnchorId(anchorId)}` : '未设置'}</small>
              </span>
              <span className={styles.targetGroupChevron}>›</span>
            </button>
          </aside>

          <main className={styles.main}>
            <section className={styles.editorSection}>
              <div className={styles.sectionHeadingRow}>
                <div className={styles.sectionHeadingText}>
                  <span className={styles.sectionIcon}>{activeTargetOption.icon}</span>
                  <div>
                    <div className={styles.eyebrow}>点击行为</div>
                    <h3 className={styles.sectionTitle}>{activeTargetOption.label}</h3>
                    <p className={styles.sectionDescription}>{activeTargetOption.description}</p>
                  </div>
                </div>
                {hasSavedLink && <span className="badge">已设置</span>}
              </div>

              <div className={styles.editorPanel}>
                {activeTargetGroup === 'external' && (
                  <>
                    <label className={styles.label}>
                      <span>网页地址</span>
                      <div className={styles.inputActionWrap}>
                        <input
                          className={`field ${styles.input}`}
                          value={externalUrl}
                          onChange={event => { setExternalUrl(event.target.value); setError(''); }}
                          placeholder="example.com 或 https://example.com"
                          autoFocus
                        />
                        <button type="button" className={`btn btn--sm ${styles.inputAction}`} onClick={pasteExternalUrl}>粘贴</button>
                      </div>
                    </label>
                    <p className={styles.help}>可直接输入域名，保存时会自动识别为网页地址。</p>
                  </>
                )}

                {activeTargetGroup === 'anchor' && (
                  <>
                    <label className={styles.label}>
                      <span>目标标签</span>
                      <div className={`field-shell ${styles.anchorInputWrap}`}>
                        <span>#</span>
                        <input
                          className={`field-shell__input ${styles.anchorInput}`}
                          value={targetAnchor}
                          onChange={event => { setTargetAnchor(event.target.value); setError(''); }}
                          placeholder="project-start"
                          autoFocus
                        />
                      </div>
                    </label>
                    {availableAnchors.length > 0 ? (
                      <div className={styles.anchorPicker}>
                        <div className={styles.pickerLabel}>可跳转的标签</div>
                        <div className={styles.anchorChips}>
                          {availableAnchors.map(anchor => (
                            <button
                              type="button"
                              className="chip"
                              aria-pressed={normalizeStickerAnchorId(targetAnchor) === anchor}
                              key={anchor}
                              onClick={() => { setTargetAnchor(anchor); setError(''); }}
                            >#{anchor}</button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className={styles.emptyHint}>还没有可用标签。可在左侧“当前贴纸标签”中先为某个贴纸设置标签。</div>
                    )}
                  </>
                )}

                {activeTargetGroup === 'page' && (
                  <>
                    <div className={`segmented ${styles.pageModes}`} role="group" aria-label="页面跳转方式">
                      {pageModeOptions.map(option => (
                        <button
                          key={option.value}
                          type="button"
                          aria-pressed={mode === option.value}
                          className={`segmented__item ${styles.pageModeButton}`}
                          onClick={() => selectMode(option.value)}
                        >
                          <b>{option.label}</b>
                          <small>{option.description}</small>
                        </button>
                      ))}
                    </div>

                    {mode === 'page' && (
                      <div className={styles.focusBox}>
                        <label className={styles.label}>
                          <span>跳到第几页</span>
                          <input className={`field ${styles.numberInput}`} type="number" min={1} step={1} value={screen} onChange={event => setScreen(Math.max(1, Number(event.target.value) || 1))} />
                        </label>
                      </div>
                    )}

                    {mode === 'conditional' && (
                      <div className={styles.focusBox}>
                        <div className={styles.grid2}>
                          <label className={styles.label}>
                            <span>主页面</span>
                            <input className={`field ${styles.numberInput}`} type="number" min={1} step={1} value={screen} onChange={event => setScreen(Math.max(1, Number(event.target.value) || 1))} />
                          </label>
                          <label className={styles.label}>
                            <span>再次点击返回</span>
                            <input className={`field ${styles.numberInput}`} type="number" min={1} step={1} value={elseScreen} onChange={event => setElseScreen(Math.max(1, Number(event.target.value) || 1))} />
                          </label>
                        </div>
                        <p className={styles.help}>不在主页面时先进入主页面；已在主页面时再次点击会跳到返回页面。</p>
                      </div>
                    )}

                    {mode === 'coordinate' && (
                      <div className={styles.focusBox}>
                        <div className={styles.grid3}>
                          <label className={styles.label}><span>页面</span><input className={`field ${styles.numberInput}`} type="number" min={1} step={1} value={screen} onChange={event => setScreen(Math.max(1, Number(event.target.value) || 1))} /></label>
                          <label className={styles.label}><span>X 坐标</span><input className={`field ${styles.numberInput}`} type="number" value={coordinateX} onChange={event => setCoordinateX(Number(event.target.value) || 0)} /></label>
                          <label className={styles.label}><span>Y 坐标</span><input className={`field ${styles.numberInput}`} type="number" value={coordinateY} onChange={event => setCoordinateY(Number(event.target.value) || 0)} /></label>
                        </div>
                      </div>
                    )}

                    {(mode === 'previous' || mode === 'next') && (
                      <div className={styles.inlineInfo}>
                        <span className={styles.inlineInfoIcon}>{mode === 'previous' ? '←' : '→'}</span>
                        <span>{mode === 'previous' ? '根据当前位置动态返回前一页；已经在第一页时保持不动。' : '根据当前位置动态进入后一页，适合做连续浏览按钮。'}</span>
                      </div>
                    )}
                  </>
                )}

                {activeTargetGroup === 'layout' && (
                  <>
                    <div className={`segmented ${styles.pageModes} ${styles.pageModesThree}`} role="group" aria-label="空间切换方式">
                      {([
                        ['horizontal', '切到左右', '进入左右翻页空间'],
                        ['vertical', '切到上下', '返回上下翻页空间'],
                        ['toggle', '上下 / 左右切换', '每次点击切换空间'],
                      ] as Array<['vertical' | 'horizontal' | 'toggle', string, string]>).map(([value, label, description]) => (
                        <button
                          key={value}
                          type="button"
                          aria-pressed={layoutDirection === value}
                          className={`segmented__item ${styles.pageModeButton}`}
                          onClick={() => { setLayoutDirection(value); setError(''); }}
                        >
                          <b>{label}</b>
                          <small>{description}</small>
                        </button>
                      ))}
                    </div>
                    <div className={styles.inlineInfo}>
                      <span className={styles.inlineInfoIcon}>⇄</span>
                      <span>上下与左右模式使用各自保存的组件和贴纸布局，切换后进入对应空间。</span>
                    </div>
                  </>
                )}

                {activeTargetGroup === 'advanced' && (
                  <>
                    <label className={styles.label}>
                      <span>条件规则</span>
                      <input
                        className={`field ${styles.input}`}
                        value={conditionExpression}
                        onChange={event => { setConditionExpression(event.target.value); setError(''); }}
                        placeholder="if page=3 then 1 else 2"
                        autoFocus
                      />
                    </label>
                    <div className={styles.presetRow}>
                      {conditionPresets.map(preset => (
                        <button type="button" key={preset.value} className="chip" onClick={() => { setConditionExpression(preset.value); setError(''); }}>
                          {preset.label}
                        </button>
                      ))}
                    </div>
                    <div className={styles.advancedHelp}>
                      <b>规则格式</b>
                      <span>支持 =、!=、&gt;、&gt;=、&lt;、&lt;=；结果可以是页码、prev 或 next。</span>
                      <code>if page&gt;=3 then prev else next</code>
                      <span>也支持：如果 page=3 则 1 否则 2</span>
                    </div>
                  </>
                )}
              </div>

              <div className={styles.previewCard}>
                <span className={styles.previewIcon}>→</span>
                <div className={styles.previewText}>
                  <span>保存后</span>
                  <b>{targetSummary}</b>
                  <code>{targetPreview || '未设置点击行为'}</code>
                </div>
              </div>
            </section>

            {showAnchorSettings && (
              <section className={styles.anchorSection}>
                <div className={styles.anchorSectionHeader}>
                  <span className={styles.anchorSectionIcon}>#</span>
                  <div className={styles.anchorSectionText}>
                    <b>当前贴纸标签</b>
                    <small>让其他贴纸或组件可以准确跳到这里。</small>
                  </div>
                </div>
                <label className={styles.label}>
                  <span>标签名称</span>
                  <div className={`field-shell ${styles.anchorInputWrap}`}>
                    <span>#</span>
                    <input
                      className={`field-shell__input ${styles.anchorInput}`}
                      value={anchorId}
                      onChange={event => { setAnchorId(event.target.value); setError(''); }}
                      placeholder="project-start"
                    />
                  </div>
                </label>
                <p className={styles.help}>标签在当前空间内需要保持唯一。其他入口可直接选择 <b>#{normalizeStickerAnchorId(anchorId) || 'project-start'}</b>。</p>
              </section>
            )}

            {error && <div className={styles.error} role="alert">{error}</div>}
          </main>
        </div>

        <footer className={styles.actions}>
          <div className={styles.actionHint}><kbd>Esc</kbd> 关闭 <span>·</span> <kbd>Ctrl/⌘ + Enter</kbd> 保存</div>
          <button type="button" className="btn btn--danger" onClick={clearLink} disabled={!hasSavedLink}>清除点击行为</button>
          <button type="button" className="btn" onClick={onClose}>取消</button>
          <button type="button" className="btn btn--primary" onClick={handleSave}>保存</button>
        </footer>
      </section>
    </div>,
    document.body,
  );
};
