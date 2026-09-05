import { useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { executeNavigationAction } from '@/shared/navigation';
import {
  ADVANCED_SEARCH_TARGETS,
  buildAdvancedSearch,
  buildAdvancedSearchQuery,
  getAdvancedSearchFilterDefinitions,
  type AdvancedSearchFilterDefinition,
  type AdvancedSearchFilterId,
  type AdvancedSearchFilterValue,
  type AdvancedSearchFilterValues,
  type AdvancedSearchTarget,
} from '@/features/search/constants/advancedSearch';
import {
  addSavedSite,
  clearSavedSites,
  normalizeSite,
  readSavedSites,
  removeSavedSite,
  type SavedSite,
} from '@/features/search/services/savedSites';
import styles from './AdvancedSearchPanel.module.css';

interface AdvancedSearchPanelProps {
  query: string;
  onQueryChange: (value: string) => void;
  onSearch: (query: string) => void;
  onClose: () => void;
  openInNewTab: boolean;
}

type FiltersByTarget = Record<AdvancedSearchTarget, AdvancedSearchFilterValues>;

const createEmptyFilters = (): FiltersByTarget => ({
  engine: {}, images: {}, youtube: {}, bilibili: {}, github: {}, maps: {}, wikipedia: {},
});

const hasValue = (value: AdvancedSearchFilterValue | undefined) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return Boolean(value.trim());
  return Boolean(value?.from || value?.to);
};

const createDraftValue = (
  definition: AdvancedSearchFilterDefinition,
  current: AdvancedSearchFilterValue | undefined,
): AdvancedSearchFilterValue => {
  if (current !== undefined) return current;
  if (definition.kind === 'date-range') return { from: '', to: '' };
  if (definition.kind === 'select') return definition.options?.[0]?.value ?? '';
  if (definition.kind === 'toggle') return true;
  return '';
};

const SELECT_PREFIX_OVERRIDES: Partial<Record<AdvancedSearchFilterId, string>> = {
  filetype: '',
  githubType: '类型',
  youtubeUploadDate: '上传时间',
  youtubeDuration: '长度',
  youtubeSort: '排序',
  bilibiliDuration: '长度',
  bilibiliSort: '排序',
  imageSize: '尺寸',
  imageType: '类型',
  wikiLanguage: '语言',
  wikiNamespace: '范围',
};

const TEXT_PREFIXES: Partial<Record<AdvancedSearchFilterId, string>> = {
  site: 'site:',
  exclude: '排除:',
  intitle: 'intitle:',
  inurl: 'inurl:',
  or: 'OR:',
  youtubeChannel: '频道:',
  bilibiliUploader: 'UP 主:',
  githubRepo: 'repo:',
  githubLanguage: 'language:',
  githubStars: 'stars:',
  githubPath: 'path:',
  githubUser: 'user:',
  githubOrg: 'org:',
  mapsLocation: '地点:',
  mapsNearby: '附近:',
  mapsCategory: '类别:',
  wikiTitle: '标题:',
};

const formatFilterChip = (definition: AdvancedSearchFilterDefinition, value: AdvancedSearchFilterValue) => {
  if (typeof value === 'boolean') return definition.label;
  if (typeof value === 'object') {
    if (value.from && value.to) return `${value.from} → ${value.to}`;
    if (value.from) return `从 ${value.from}`;
    if (value.to) return `截至 ${value.to}`;
    return definition.label;
  }
  if (definition.kind === 'select') {
    const optionLabel = definition.options?.find((option) => option.value === value)?.label ?? value;
    const prefix = SELECT_PREFIX_OVERRIDES[definition.id];
    return prefix === '' ? optionLabel : `${prefix ?? definition.label}: ${optionLabel}`;
  }
  return `${TEXT_PREFIXES[definition.id] ?? `${definition.label}:`} ${value}`.trim();
};

export const AdvancedSearchPanel = ({
  query,
  onQueryChange,
  onSearch,
  onClose,
  openInNewTab,
}: AdvancedSearchPanelProps) => {
  const [target, setTarget] = useState<AdvancedSearchTarget>('engine');
  const [filtersByTarget, setFiltersByTarget] = useState<FiltersByTarget>(createEmptyFilters);
  const [manualQueries, setManualQueries] = useState<Partial<Record<AdvancedSearchTarget, string>>>({});
  const [pickerOpen, setPickerOpen] = useState(false);
  const [editingFilter, setEditingFilter] = useState<AdvancedSearchFilterId | null>(null);
  const [draftValue, setDraftValue] = useState<AdvancedSearchFilterValue>('');
  const workspaceRef = useRef<HTMLDivElement>(null);

  const definitions = useMemo(() => getAdvancedSearchFilterDefinitions(target), [target]);
  const filters = filtersByTarget[target];
  const generatedQuery = useMemo(
    () => buildAdvancedSearchQuery({ query, target, filters }),
    [filters, query, target],
  );
  const hasManualQuery = Object.prototype.hasOwnProperty.call(manualQueries, target);
  const finalQuery = hasManualQuery ? manualQueries[target] ?? '' : generatedQuery;
  const activeDefinitions = definitions.filter((definition) => hasValue(filters[definition.id]));
  const selectedTarget = ADVANCED_SEARCH_TARGETS.find((item) => item.id === target) ?? ADVANCED_SEARCH_TARGETS[0];
  const editingDefinition = editingFilter ? definitions.find((definition) => definition.id === editingFilter) : undefined;

  const clearManualQuery = (targetId: AdvancedSearchTarget) => {
    setManualQueries((current) => {
      if (!Object.prototype.hasOwnProperty.call(current, targetId)) return current;
      const next = { ...current };
      delete next[targetId];
      return next;
    });
  };

  const updateFilter = (id: AdvancedSearchFilterId, value: AdvancedSearchFilterValue | undefined) => {
    setFiltersByTarget((current) => {
      const nextTarget = { ...current[target] };
      if (value === undefined || !hasValue(value)) delete nextTarget[id];
      else nextTarget[id] = value;
      return { ...current, [target]: nextTarget };
    });
    clearManualQuery(target);
  };

  const removeFilter = (id: AdvancedSearchFilterId) => {
    updateFilter(id, undefined);
    if (editingFilter === id) setEditingFilter(null);
  };

  const openFilterEditor = (definition: AdvancedSearchFilterDefinition) => {
    if (definition.kind === 'toggle') {
      updateFilter(definition.id, filters[definition.id] === true ? undefined : true);
      setPickerOpen(false);
      setEditingFilter(null);
      return;
    }
    setDraftValue(createDraftValue(definition, filters[definition.id]));
    setEditingFilter(definition.id);
    setPickerOpen(false);
  };

  const saveFilter = () => {
    if (!editingDefinition) return;
    updateFilter(editingDefinition.id, draftValue);
    setEditingFilter(null);
  };

  const changeTarget = (nextTarget: AdvancedSearchTarget) => {
    setTarget(nextTarget);
    setPickerOpen(false);
    setEditingFilter(null);
    workspaceRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetFilters = () => {
    setFiltersByTarget((current) => ({ ...current, [target]: {} }));
    clearManualQuery(target);
    setPickerOpen(false);
    setEditingFilter(null);
  };

  const execute = () => {
    const result = buildAdvancedSearch({ query, target, filters, rawQuery: finalQuery });
    if (result.url) {
      executeNavigationAction({ type: 'url', url: result.url }, { openInNewTab });
      onClose();
      return;
    }
    if (result.query) {
      onSearch(result.query);
      onClose();
    }
  };

  const [savedSites, setSavedSites] = useState<SavedSite[]>(readSavedSites);

  // 直接为指定目标写某个筛选条件，绕过当前 target（用于保存的网址跨目标套用）。
  const setFilterForTarget = (targetId: AdvancedSearchTarget, id: AdvancedSearchFilterId, value: AdvancedSearchFilterValue) => {
    setFiltersByTarget((current) => ({ ...current, [targetId]: { ...current[targetId], [id]: value } }));
    clearManualQuery(targetId);
  };

  // 在「限定网站」编辑器里保存常用网址：把当前草稿值存为常用网址。
  const saveSiteFromEditor = () => {
    const site = normalizeSite(typeof draftValue === 'string' ? draftValue : '');
    if (!site) return;
    setSavedSites(addSavedSite(site));
  };

  // 点击一个已保存的网址：把它套用到「限定网站」条件。当前平台不支持 site: 时切回网页目标。
  const applySavedSite = (site: string) => {
    const canUseSite = getAdvancedSearchFilterDefinitions(target).some((definition) => definition.id === 'site');
    const targetId: AdvancedSearchTarget = canUseSite ? target : 'engine';
    if (targetId !== target) setTarget(targetId);
    setFilterForTarget(targetId, 'site', site);
  };

  const deleteSavedSite = (id: string) => {
    setSavedSites(removeSavedSite(id));
  };

  const clearSites = () => {
    clearSavedSites();
    setSavedSites([]);
  };

  const commonDefinitions = definitions.filter((definition) => definition.group === 'common' && !hasValue(filters[definition.id]));
  const moreDefinitions = definitions.filter((definition) => definition.group === 'more' && !hasValue(filters[definition.id]));
  const quickDefinitions = definitions.filter((definition) => definition.quick);
  const canSaveDraft = hasValue(draftValue);
  const targetFilterCounts = useMemo(() => Object.fromEntries(
    ADVANCED_SEARCH_TARGETS.map((item) => [
      item.id,
      getAdvancedSearchFilterDefinitions(item.id).filter((definition) => hasValue(filtersByTarget[item.id][definition.id])).length,
    ]),
  ) as Record<AdvancedSearchTarget, number>, [filtersByTarget]);

  return createPortal(
    <div
      className={styles.overlay}
      role="presentation"
      data-page-scroll-lock="true"
      onMouseDown={onClose}
      onWheel={(event) => event.stopPropagation()}
    >
      <section
        className={styles.panel}
        data-ui-zone="advanced-search"
        data-page-scroll-lock="true"
        role="dialog"
        aria-modal="true"
        aria-label="高级搜索"
        onMouseDown={(event) => event.stopPropagation()}
        onClick={(event) => event.stopPropagation()}
        onWheel={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          event.stopPropagation();
          if (event.key === 'Escape') {
            if (editingFilter) setEditingFilter(null);
            else if (pickerOpen) setPickerOpen(false);
            else onClose();
          }
        }}
      >
        <header className={styles.header}>
          <div className={styles.headerTitleRow}>
            <span className={styles.headerMark}>⌕</span>
            <div>
              <strong>高级搜索</strong>
              <span>先选择搜索位置，再为当前平台添加专属条件</span>
            </div>
          </div>
          <button type="button" className={`icon-btn icon-btn--ghost ${styles.closeButton}`} onClick={onClose} aria-label="关闭高级搜索">×</button>
        </header>

        <div className={styles.panelBody}>
          <aside className={styles.targetRail} aria-label="搜索位置">
            <div className={styles.railHeading}>
              <strong>搜索位置</strong>
              <span>条件独立保存</span>
            </div>
            <nav className={styles.targetNav} aria-label="高级搜索类型">
              {ADVANCED_SEARCH_TARGETS.map((item) => {
                const count = targetFilterCounts[item.id];
                const active = target === item.id;
                return (
                  <button
                    type="button"
                    key={item.id}
                    className={`${styles.targetNavItem} ${active ? styles.targetNavItemActive : ''}`}
                    onClick={() => changeTarget(item.id)}
                    aria-pressed={active}
                  >
                    <span className={styles.targetIcon}>{item.icon}</span>
                    <span className={styles.targetNavText}>
                      <strong>{item.label}</strong>
                      <small>{item.description}</small>
                    </span>
                    {count > 0 && <span className={styles.targetCount}>{count}</span>}
                  </button>
                );
              })}
            </nav>
            <div className={styles.railHint}>切换平台不会清空已配置的筛选条件。</div>
          </aside>

          <div className={styles.contentPane}>
            <div className={styles.queryArea}>
              <div className={styles.currentTargetRow}>
                <div className={styles.currentTargetIdentity}>
                  <span>{selectedTarget.icon}</span>
                  <div>
                    <strong>{selectedTarget.label}</strong>
                    <small>{selectedTarget.description}</small>
                  </div>
                </div>
                <span className={styles.currentTargetStatus}>
                  {activeDefinitions.length > 0 ? `${activeDefinitions.length} 个条件` : '未添加条件'}
                </span>
              </div>

              <label className={styles.queryField}>
                <span className={styles.queryIcon}>⌕</span>
                <input
                  value={query}
                  onChange={(event) => {
                    onQueryChange(event.target.value);
                    setManualQueries({});
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && finalQuery.trim()) {
                      event.preventDefault();
                      execute();
                    }
                  }}
                  placeholder={`在${selectedTarget.label}中搜索关键词、问题或主题`}
                  autoFocus
                />
              </label>
            </div>

            <div ref={workspaceRef} className={styles.workspace} data-advanced-search-scroll="true">
              <section className={styles.savedSection}>
                <div className={styles.sectionHeading}>
                  <div>
                    <strong>常用网址</strong>
                    <span>保存经常搜索的网站，点一下即可套用「限定网站」</span>
                  </div>
                  {savedSites.length > 0 && <button type="button" className={styles.savedClear} onClick={clearSites}>全部清除</button>}
                </div>
                {savedSites.length > 0 && (
                  <div className={styles.savedList}>
                    {savedSites.map((saved) => (
                      <div className={styles.savedItem} key={saved.id}>
                        <button type="button" className={styles.savedItemMain} onClick={() => applySavedSite(saved.site)} title={`套用限定网站 ${saved.site}`}>
                          <span className={styles.savedItemIcon}>⌕</span>
                          <span className={styles.savedItemLabel}>{saved.site}</span>
                        </button>
                        <button type="button" className={styles.savedItemRemove} onClick={() => deleteSavedSite(saved.id)} aria-label={`删除 ${saved.site}`}>×</button>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className={styles.filterSection}>
                <div className={styles.sectionHeading}>
                  <div>
                    <strong>筛选条件</strong>
                    <span>只显示已启用条件，需要时再添加</span>
                  </div>
                  {activeDefinitions.length > 0 && <span className={styles.countBadge}>{activeDefinitions.length}</span>}
                </div>

                <div className={styles.chipRow}>
                  {activeDefinitions.length === 0 && (
                    <span className={styles.emptyState}>当前没有筛选条件，可以从下方常用条件开始。</span>
                  )}
                  {activeDefinitions.map((definition) => {
                    const value = filters[definition.id];
                    if (value === undefined) return null;
                    return (
                      <div className={styles.filterChip} key={definition.id}>
                        <button type="button" className={styles.chipEdit} onClick={() => openFilterEditor(definition)}>
                          {formatFilterChip(definition, value)}
                        </button>
                        <button type="button" className={styles.chipRemove} onClick={() => removeFilter(definition.id)} aria-label={`移除${definition.label}`}>×</button>
                      </div>
                    );
                  })}
                </div>

                <div className={styles.filterToolbar}>
                  <button
                    type="button"
                    className={`${styles.addFilterButton} ${pickerOpen ? styles.addFilterButtonActive : ''}`}
                    onClick={() => {
                      setPickerOpen((current) => !current);
                      setEditingFilter(null);
                    }}
                    aria-expanded={pickerOpen}
                  >
                    <span>＋</span> 添加条件
                  </button>

                  <div className={styles.quickStrip} aria-label="常用筛选条件">
                    <span className={styles.quickLabel}>常用</span>
                    {quickDefinitions.map((definition) => {
                      const active = hasValue(filters[definition.id]);
                      return (
                        <button
                          type="button"
                          key={definition.id}
                          className={active ? styles.quickButtonActive : ''}
                          onClick={() => openFilterEditor(definition)}
                        >
                          {definition.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {pickerOpen && (
                  <div className={styles.filterPicker}>
                    <div className={styles.pickerTitle}>
                      <div>
                        <strong>添加条件</strong>
                        <span>仅列出当前还未启用的条件</span>
                      </div>
                      <span>{selectedTarget.label}</span>
                    </div>
                    {commonDefinitions.length > 0 && (
                      <div className={styles.pickerGroup}>
                        <span>常用</span>
                        <div className={styles.pickerOptions}>
                          {commonDefinitions.map((definition) => (
                            <button type="button" key={definition.id} onClick={() => openFilterEditor(definition)}>
                              <span className={styles.radioMark}>＋</span>
                              <span><strong>{definition.label}</strong><small>{definition.description}</small></span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    {moreDefinitions.length > 0 && (
                      <div className={styles.pickerGroup}>
                        <span>更多</span>
                        <div className={styles.pickerOptions}>
                          {moreDefinitions.map((definition) => (
                            <button type="button" key={definition.id} onClick={() => openFilterEditor(definition)}>
                              <span className={styles.radioMark}>＋</span>
                              <span><strong>{definition.label}</strong><small>{definition.description}</small></span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    {commonDefinitions.length === 0 && moreDefinitions.length === 0 && (
                      <div className={styles.pickerEmpty}>当前平台的条件都已启用。</div>
                    )}
                  </div>
                )}

                {editingDefinition && (
                  <div className={styles.filterEditor}>
                    <div className={styles.editorHeading}>
                      <div><strong>{editingDefinition.label}</strong><span>{editingDefinition.description}</span></div>
                      <button type="button" className="icon-btn icon-btn--ghost" onClick={() => setEditingFilter(null)} aria-label="关闭条件编辑">×</button>
                    </div>

                    {editingDefinition.kind === 'text' && (
                      <input
                        className="field"
                        value={typeof draftValue === 'string' ? draftValue : ''}
                        onChange={(event) => setDraftValue(event.target.value)}
                        placeholder={editingDefinition.placeholder}
                        autoFocus
                      />
                    )}

                    {editingDefinition.kind === 'select' && (
                      <select
                        className="field"
                        value={typeof draftValue === 'string' ? draftValue : ''}
                        onChange={(event) => setDraftValue(event.target.value)}
                        autoFocus
                      >
                        {editingDefinition.options?.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </select>
                    )}

                    {editingDefinition.kind === 'date-range' && (
                      <div className={styles.dateInputs}>
                        <label>
                          <span>从</span>
                          <input
                            className="field"
                            type="date"
                            value={typeof draftValue === 'object' ? draftValue.from : ''}
                            onChange={(event) => setDraftValue({
                              from: event.target.value,
                              to: typeof draftValue === 'object' ? draftValue.to : '',
                            })}
                            autoFocus
                          />
                        </label>
                        <label>
                          <span>到</span>
                          <input
                            className="field"
                            type="date"
                            value={typeof draftValue === 'object' ? draftValue.to : ''}
                            onChange={(event) => setDraftValue({
                              from: typeof draftValue === 'object' ? draftValue.from : '',
                              to: event.target.value,
                            })}
                          />
                        </label>
                      </div>
                    )}

                    <div className={styles.editorActions}>
                      <button type="button" className={styles.editorCancel} onClick={() => setEditingFilter(null)}>取消</button>
                      {editingDefinition.id === 'site' && (
                        <button type="button" className={styles.editorSaveFav} onClick={saveSiteFromEditor} disabled={!normalizeSite(typeof draftValue === 'string' ? draftValue : '')}>常用网址</button>
                      )}
                      <button type="button" className={styles.editorSave} onClick={saveFilter} disabled={!canSaveDraft}>保存</button>
                    </div>
                  </div>
                )}
              </section>
            </div>

            <footer className={styles.footer}>
              <div className={styles.preview}>
                <div className={styles.previewHeading}>
                  <div>
                    <strong>最终搜索语句</strong>
                    <span>可直接修改；平台参数型条件仍由上方条件应用</span>
                  </div>
                  {hasManualQuery && (
                    <button type="button" onClick={() => clearManualQuery(target)}>恢复自动生成</button>
                  )}
                </div>
                <textarea
                  className="field"
                  value={finalQuery}
                  onChange={(event) => setManualQueries((current) => ({ ...current, [target]: event.target.value }))}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey && finalQuery.trim()) {
                      event.preventDefault();
                      execute();
                    }
                  }}
                  rows={2}
                  spellCheck={false}
                  aria-label="最终搜索语句"
                />
              </div>
              <div className={styles.actions}>
                <button type="button" className={styles.resetButton} onClick={resetFilters}>清除条件</button>
                <button type="button" className={styles.searchButton} onClick={execute} disabled={!finalQuery.trim()}>搜索 ↵</button>
              </div>
            </footer>
          </div>
        </div>
      </section>
    </div>,
    document.body,
  );
};
