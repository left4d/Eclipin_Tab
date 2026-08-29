import { useEffect, useMemo, useState } from 'react';
import { Modal } from '@/shared/components/Modal/Modal';
import { VectorIconPickerModal } from '@/features/vector-icons/components/VectorIconPickerModal';
import { useLanguage } from '@/shared/context/LanguageContext';
import { useThemeData } from '@/features/theme/context/ThemeContext';
import { storage } from '@/shared/utils/storage';
import { getStoredWidgetAnchorEntries } from '@/features/widgets/services/widgetAnchorService';
import { parseNavigationAction, serializeNavigationAction } from '@/shared/navigation';
import { normalizeInternalAnchorId } from '@/shared/utils/internalAnchor';
import type { NavigationBarConfig, NavigationBarDefaultIcon, NavigationBarItem } from '../types/navigationBar';
import { getNavigationBarItemLabel } from '../services/navigationBarStorage';
import {
  ChevronDownNavigationIcon,
  ChevronUpNavigationIcon,
  NavigationDefaultIcon,
  PlusNavigationIcon,
  TrashNavigationIcon,
} from './NavigationBarIcons';
import styles from './NavigationBarEditor.module.css';

interface NavigationBarEditorProps {
  isOpen: boolean;
  config: NavigationBarConfig;
  onClose: () => void;
  onSave: (config: NavigationBarConfig) => void;
}

const iconOptions: NavigationBarDefaultIcon[] = ['home', 'grid', 'compass', 'arrow', 'bookmark', 'star'];

const cloneConfig = (config: NavigationBarConfig): NavigationBarConfig => ({
  ...config,
  items: config.items.map((item) => ({ ...item, action: item.action })),
});

const nextDefaultIcon = (index: number): NavigationBarDefaultIcon => iconOptions[index % iconOptions.length];

export const NavigationBarEditor = ({ isOpen, config, onClose, onSave }: NavigationBarEditorProps) => {
  const { language } = useLanguage();
  const { pageSlideDirection } = useThemeData();
  const zh = language === 'zh';
  const [draft, setDraft] = useState<NavigationBarConfig>(() => cloneConfig(config));
  const [selectedId, setSelectedId] = useState(config.items[0]?.id ?? '');
  const [actionInput, setActionInput] = useState('');
  const [error, setError] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const next = cloneConfig(config);
    setDraft(next);
    setSelectedId(next.items[0]?.id ?? '');
    setError('');
    setPickerOpen(false);
  }, [config, isOpen]);

  const selectedIndex = draft.items.findIndex((item) => item.id === selectedId);
  const selectedItem = selectedIndex >= 0 ? draft.items[selectedIndex] : null;

  useEffect(() => {
    setActionInput(selectedItem ? serializeNavigationAction(selectedItem.action) : '');
    setError('');
  }, [selectedId, selectedItem?.action]);

  const anchors = useMemo(() => Array.from(new Set([
    ...storage.getStickers(pageSlideDirection).map((item) => normalizeInternalAnchorId(item.anchorId ?? '')),
    ...getStoredWidgetAnchorEntries(pageSlideDirection).map((item) => item.anchorId),
  ].filter(Boolean))).slice(0, 16), [pageSlideDirection, isOpen]);

  const updateSelected = (updates: Partial<NavigationBarItem>) => {
    if (!selectedItem) return;
    setDraft((current) => ({
      ...current,
      items: current.items.map((item) => item.id === selectedItem.id ? { ...item, ...updates } : item),
    }));
  };

  const commitActionInput = (): boolean => {
    if (!selectedItem) return true;
    const action = parseNavigationAction(actionInput);
    if (!action) {
      setError(zh
        ? '无法识别这条跳转语句。可使用 page:2、#weather、page:next、layout:vertical、网址或条件规则。'
        : 'This navigation statement is not recognized. Try page:2, #weather, page:next, layout:vertical, a URL, or a conditional rule.');
      return false;
    }
    updateSelected({ action });
    setActionInput(serializeNavigationAction(action));
    setError('');
    return true;
  };

  const addItem = () => {
    const page = Math.max(1, draft.items.length + 1);
    const item: NavigationBarItem = {
      id: `nav-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      label: zh ? `导航 ${page}` : `Navigation ${page}`,
      action: { type: 'page', page },
      defaultIcon: nextDefaultIcon(draft.items.length),
    };
    setDraft((current) => ({ ...current, items: [...current.items, item].slice(0, 16) }));
    setSelectedId(item.id);
  };

  const removeItem = () => {
    if (!selectedItem || draft.items.length <= 1) return;
    const index = selectedIndex;
    const nextItems = draft.items.filter((item) => item.id !== selectedItem.id);
    setDraft((current) => ({ ...current, items: nextItems }));
    setSelectedId(nextItems[Math.min(index, nextItems.length - 1)]?.id ?? nextItems[0]?.id ?? '');
  };

  const moveItem = (direction: -1 | 1) => {
    if (selectedIndex < 0) return;
    const target = selectedIndex + direction;
    if (target < 0 || target >= draft.items.length) return;
    setDraft((current) => {
      const items = [...current.items];
      [items[selectedIndex], items[target]] = [items[target], items[selectedIndex]];
      return { ...current, items };
    });
  };

  const save = () => {
    if (!selectedItem) return;
    const parsedAction = parseNavigationAction(actionInput);
    if (!parsedAction) {
      setError(zh
        ? '无法识别这条跳转语句。可使用 page:2、#weather、page:next、layout:vertical、网址或条件规则。'
        : 'This navigation statement is not recognized. Try page:2, #weather, page:next, layout:vertical, a URL, or a conditional rule.');
      return;
    }
    const normalizedItems = draft.items.map((item) => ({
      ...item,
      action: item.id === selectedItem.id ? parsedAction : item.action,
      label: item.label.trim() || (zh ? '未命名导航' : 'Untitled navigation'),
    }));
    onSave({ ...draft, items: normalizedItems });
  };

  if (!isOpen) return null;

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={zh ? '编辑导航栏' : 'Edit Navigation Bar'}
        className={styles.modal}
        zIndex={2_147_480_000}
      >
        <div className={styles.intro}>
          <strong>{zh ? '与贴纸使用同一套跳转语句' : 'Uses the same navigation syntax as stickers'}</strong>
          <span>{zh
            ? '支持网页、页面、标签、上一页 / 下一页、上下 / 左右布局切换和条件规则。'
            : 'Supports URLs, pages, anchors, previous/next, vertical/horizontal layout switches, and conditional rules.'}</span>
        </div>

        <div className={styles.layout}>
          <aside className={styles.itemList} aria-label={zh ? '导航项目' : 'Navigation items'}>
            <div className={styles.listHeader}>
              <span>{zh ? '项目' : 'Items'}</span>
              <button type="button" onClick={addItem} disabled={draft.items.length >= 16} title={zh ? '添加导航项目' : 'Add navigation item'}>
                <PlusNavigationIcon />
              </button>
            </div>
            <div className={styles.items}>
              {draft.items.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  className={`${styles.itemButton} ${item.id === selectedId ? styles.itemButtonActive : ''}`}
                  onClick={() => setSelectedId(item.id)}
                >
                  <span className={styles.itemIcon}>
                    {item.customIconDataUrl
                      ? <img src={item.customIconDataUrl} alt="" />
                      : <NavigationDefaultIcon icon={item.defaultIcon} />}
                  </span>
                  <span className={styles.itemText}>
                    <strong>{getNavigationBarItemLabel(item, language)}</strong>
                    <small>{serializeNavigationAction(item.action)}</small>
                  </span>
                </button>
              ))}
            </div>
          </aside>

          <section className={styles.editor}>
            {selectedItem && (
              <>
                <div className={styles.editorTitleRow}>
                  <div>
                    <strong>{zh ? '导航项目' : 'Navigation item'}</strong>
                    <span>{selectedItem.customIconName || (zh ? '内置 SVG 图标' : 'Built-in SVG icon')}</span>
                  </div>
                  <div className={styles.reorderButtons}>
                    <button type="button" onClick={() => moveItem(-1)} disabled={selectedIndex <= 0} aria-label={zh ? '上移' : 'Move up'}><ChevronUpNavigationIcon /></button>
                    <button type="button" onClick={() => moveItem(1)} disabled={selectedIndex >= draft.items.length - 1} aria-label={zh ? '下移' : 'Move down'}><ChevronDownNavigationIcon /></button>
                    <button type="button" className={styles.deleteButton} onClick={removeItem} disabled={draft.items.length <= 1} aria-label={zh ? '删除' : 'Delete'}><TrashNavigationIcon /></button>
                  </div>
                </div>

                <label className={styles.field}>
                  <span>{zh ? '名称' : 'Name'}</span>
                  <input value={getNavigationBarItemLabel(selectedItem, language)} onChange={(event) => updateSelected({ label: event.target.value })} />
                </label>

                <div className={styles.field}>
                  <span>{zh ? '图标' : 'Icon'}</span>
                  <div className={styles.iconRow}>
                    <div className={styles.iconPreview}>
                      {selectedItem.customIconDataUrl
                        ? <img src={selectedItem.customIconDataUrl} alt="" />
                        : <NavigationDefaultIcon icon={selectedItem.defaultIcon} />}
                    </div>
                    <div className={styles.iconActions}>
                      <button type="button" onClick={() => setPickerOpen(true)}>{zh ? '从 SVG 图标库选择' : 'Choose from SVG library'}</button>
                      {selectedItem.customIconDataUrl && (
                        <button type="button" onClick={() => updateSelected({ customIconDataUrl: undefined, customIconName: undefined })}>{zh ? '恢复内置图标' : 'Use built-in icon'}</button>
                      )}
                    </div>
                  </div>
                  {!selectedItem.customIconDataUrl && (
                    <div className={styles.defaultIcons}>
                      {iconOptions.map((icon) => (
                        <button
                          type="button"
                          key={icon}
                          className={selectedItem.defaultIcon === icon ? styles.defaultIconActive : ''}
                          onClick={() => updateSelected({ defaultIcon: icon })}
                          aria-label={icon}
                        >
                          <NavigationDefaultIcon icon={icon} />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <label className={styles.field}>
                  <span>{zh ? '跳转语句' : 'Navigation statement'}</span>
                  <input
                    value={actionInput}
                    onChange={(event) => { setActionInput(event.target.value); setError(''); }}
                    onBlur={() => { if (actionInput.trim()) commitActionInput(); }}
                    placeholder="page:2 / #anchor / page:next / https://..."
                    spellCheck={false}
                  />
                </label>

                <div className={styles.presets}>
                  {[
                    ['page:1', zh ? '首页' : 'Home'],
                    ['page:2', zh ? '第 2 页' : 'Page 2'],
                    ['page:prev', zh ? '上一页' : 'Previous'],
                    ['page:next', zh ? '下一页' : 'Next'],
                    ['layout:vertical', zh ? '切到上下' : 'Switch vertical'],
                  ].map(([value, label]) => (
                    <button type="button" key={value} onClick={() => { setActionInput(value); setError(''); }}>{label}</button>
                  ))}
                </div>

                {anchors.length > 0 && (
                  <div className={styles.anchorSection}>
                    <span>{zh ? '已有标签' : 'Available anchors'}</span>
                    <div className={styles.anchorChips}>
                      {anchors.map((anchor) => (
                        <button type="button" key={anchor} onClick={() => { setActionInput(`#${anchor}`); setError(''); }}>#{anchor}</button>
                      ))}
                    </div>
                  </div>
                )}

                <div className={styles.syntaxHelp}>
                  <code>page:3</code>
                  <code>#weather-main</code>
                  <code>page:3 else page:1</code>
                  <code>if page&gt;=4 then prev else next</code>
                  <code>layout:toggle</code>
                </div>
                {error && <div className={styles.error} role="alert">{error}</div>}
              </>
            )}
          </section>
        </div>

        <footer className={styles.footer}>
          <button type="button" onClick={onClose}>{zh ? '取消' : 'Cancel'}</button>
          <button type="button" className={styles.primary} onClick={save}>{zh ? '保存导航栏' : 'Save Navigation Bar'}</button>
        </footer>
      </Modal>

      <VectorIconPickerModal
        isOpen={pickerOpen}
        purpose="navigation"
        onClose={() => setPickerOpen(false)}
        onChoose={(dataUrl, iconName) => {
          updateSelected({ customIconDataUrl: dataUrl, customIconName: iconName });
          setPickerOpen(false);
        }}
      />
    </>
  );
};
