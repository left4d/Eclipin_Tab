import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { useSpacesActions, useSpacesData } from '@/features/spaces/context/SpacesContext';
import type { DockItem } from '@/features/dock/types/dock';
import { createId } from '@/shared/utils/id';
import type { WidgetLayout } from '../../types/widget';
import {
  collectDockItemUrls,
  focusOpenBrowserTab,
  groupOpenTabsByDomain,
  hasTabsPermission,
  isTabsApiAvailable,
  normalizeOpenTabUrl,
  queryOpenBrowserTabs,
  requestTabsPermission,
  subscribeToTabChanges,
  type OpenBrowserTab,
} from '../../services/openTabsService';
import {
  appendTabsToSavedSession,
  createSavedTabSession,
  deleteSavedTabSession,
  loadSavedTabSessions,
  openSavedTab,
  removeTabFromSavedSession,
  renameSavedTabSession,
  restoreSavedTabSession,
  subscribeToSavedTabSessions,
  type SavedBrowserTab,
  type SavedTabSession,
} from '../../services/savedTabSessionsService';
import { CloseIcon, FloppyIcon, PencilIcon, RestoreIcon, TabIcon, TrashIcon } from './OpenTabsWidgetIcons';
import styles from './OpenTabsWidget.module.css';
import { useLanguage } from '@/shared/context/LanguageContext';

interface OpenTabsWidgetBodyProps {
  widget: WidgetLayout;
  onUpdate: (id: string, updates: Partial<WidgetLayout>) => void;
  startDrag: (event: ReactPointerEvent<HTMLElement>) => void;
}

type WidgetView = 'open' | 'saved';
type SpaceCandidate = Pick<OpenBrowserTab, 'title' | 'url' | 'displayDomain' | 'favIconUrl'> | SavedBrowserTab;

interface SessionPickerState {
  tabs: OpenBrowserTab[];
  suggestedName: string;
}
const getTabPathLabel = (rawUrl: string): string => {
  try {
    const url = new URL(rawUrl);
    if (url.protocol === 'file:') return url.pathname || rawUrl;
    const path = `${url.pathname}${url.search}`;
    return path === '/' ? url.hostname : `${url.hostname}${path}`;
  } catch {
    return rawUrl;
  }
};
const getPersistableFavicon = (favicon: string | undefined): string | undefined => {
  if (!favicon) return undefined;
  return /^(?:https?:|data:image\/)/i.test(favicon) ? favicon : undefined;
};
const formatSavedTime = (value: string, language: 'en' | 'zh'): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(language === 'zh' ? 'zh-CN' : 'en-US', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

const createCurrentSessionName = (language: 'en' | 'zh'): string => {
  const now = new Date();
  const date = new Intl.DateTimeFormat(language === 'zh' ? 'zh-CN' : 'en-US', { month: 'numeric', day: 'numeric' }).format(now);
  const time = new Intl.DateTimeFormat(language === 'zh' ? 'zh-CN' : 'en-US', { hour: '2-digit', minute: '2-digit' }).format(now);
  return language === 'zh' ? `会话 ${date} ${time}` : `Session ${date} ${time}`;
};

export const OpenTabsWidgetBody = ({ widget, onUpdate, startDrag }: OpenTabsWidgetBodyProps) => {
  const { language } = useLanguage();
  const tr = (zh: string, en: string) => language === 'zh' ? zh : en;
  const { spaces, activeSpaceId } = useSpacesData();
  const { updateSpaceApps } = useSpacesActions();
  const [view, setView] = useState<WidgetView>('open');
  const [tabs, setTabs] = useState<OpenBrowserTab[]>([]);
  const [savedSessions, setSavedSessions] = useState<SavedTabSession[]>(() => loadSavedTabSessions());
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [notice, setNotice] = useState('');
  const [collapsedDomains, setCollapsedDomains] = useState<Set<string>>(() => new Set());
  const [collapsedSessions, setCollapsedSessions] = useState<Set<string>>(() => new Set());
  const [sessionPicker, setSessionPicker] = useState<SessionPickerState | null>(null);
  const [newSessionName, setNewSessionName] = useState('');
  const refreshTimerRef = useRef<number | null>(null);

  const selectedSpaceId = useMemo(() => {
    if (widget.openTabsTargetSpaceId && spaces.some((space) => space.id === widget.openTabsTargetSpaceId)) {
      return widget.openTabsTargetSpaceId;
    }
    if (spaces.some((space) => space.id === activeSpaceId)) return activeSpaceId;
    return spaces[0]?.id ?? '';
  }, [activeSpaceId, spaces, widget.openTabsTargetSpaceId]);

  const selectedSpace = spaces.find((space) => space.id === selectedSpaceId) ?? null;
  const existingUrls = useMemo(
    () => collectDockItemUrls(selectedSpace?.apps ?? []),
    [selectedSpace],
  );
  const groups = useMemo(() => groupOpenTabsByDomain(tabs), [tabs]);
  const savedUrls = useMemo(() => new Set(savedSessions.flatMap((session) => session.tabs.map((tab) => normalizeOpenTabUrl(tab.url)))), [savedSessions]);

  const refresh = useCallback(async () => {
    if (!isTabsApiAvailable()) {
      setPermissionGranted(false);
      setTabs([]);
      setStatus(tr('当前环境不支持浏览器标签页 API', 'The browser tabs API is not available in this environment'));
      setIsLoading(false);
      return;
    }

    try {
      const granted = await hasTabsPermission();
      setPermissionGranted(granted);
      if (!granted) {
        setTabs([]);
        setStatus(tr('授权后即可读取当前窗口已打开的网站', 'Grant access to read sites open in the current window'));
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      const nextTabs = await queryOpenBrowserTabs();
      setTabs(nextTabs);
      setStatus(nextTabs.length > 0 ? '' : tr('当前窗口没有可显示的网站标签页', 'There are no website tabs to show in this window'));
    } catch {
      setTabs([]);
      setStatus(tr('读取标签页失败，请刷新后重试', 'Failed to read tabs. Refresh and try again.'));
    } finally {
      setIsLoading(false);
    }
  }, [language]);

  const scheduleRefresh = useCallback(() => {
    if (refreshTimerRef.current) window.clearTimeout(refreshTimerRef.current);
    refreshTimerRef.current = window.setTimeout(() => {
      refreshTimerRef.current = null;
      void refresh();
    }, 120);
  }, [refresh]);

  useEffect(() => {
    void refresh();
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') scheduleRefresh();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      if (refreshTimerRef.current) window.clearTimeout(refreshTimerRef.current);
    };
  }, [refresh, scheduleRefresh]);

  useEffect(() => subscribeToSavedTabSessions(setSavedSessions), []);

  useEffect(() => {
    if (!permissionGranted) return;
    return subscribeToTabChanges(scheduleRefresh);
  }, [permissionGranted, scheduleRefresh]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(''), 2400);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const addTabsToSelectedSpace = (candidates: SpaceCandidate[]) => {
    if (!selectedSpace) {
      setNotice(tr('请先创建一个空间', 'Create a space first'));
      return;
    }

    const additions = candidates.filter((tab) => !existingUrls.has(normalizeOpenTabUrl(tab.url)));
    if (additions.length === 0) {
      setNotice(language === 'zh' ? `这些网站已经在「${selectedSpace.name}」中` : `These sites are already in “${selectedSpace.name}”`);
      return;
    }

    const items: DockItem[] = additions.map((tab) => ({
      id: createId('item'),
      name: tab.title || tab.displayDomain,
      url: tab.url,
      action: { type: 'url', url: tab.url },
      icon: getPersistableFavicon(tab.favIconUrl),
      type: 'app',
    }));
    updateSpaceApps(selectedSpace.id, (apps) => [...apps, ...items]);
    setNotice(language === 'zh' ? `已添加 ${items.length} 个网站到「${selectedSpace.name}」` : `Added ${items.length} sites to “${selectedSpace.name}”`);
  };

  const openSessionPicker = (candidates: OpenBrowserTab[], suggestedName: string) => {
    if (candidates.length === 0) {
      setNotice(tr('没有可保存的标签页', 'No tabs to save'));
      return;
    }
    setSessionPicker({ tabs: candidates, suggestedName });
    setNewSessionName(suggestedName);
  };

  const saveAsNewSession = () => {
    if (!sessionPicker) return;
    const sessions = createSavedTabSession(sessionPicker.tabs, newSessionName || sessionPicker.suggestedName);
    setSavedSessions(sessions);
    setNotice(language === 'zh' ? `已保存 ${sessionPicker.tabs.length} 个标签页` : `Saved ${sessionPicker.tabs.length} tabs`);
    setSessionPicker(null);
    setView('saved');
  };

  const saveIntoExistingSession = (session: SavedTabSession) => {
    if (!sessionPicker) return;
    const result = appendTabsToSavedSession(session.id, sessionPicker.tabs);
    setSavedSessions(result.sessions);
    setNotice(result.addedCount > 0
      ? (language === 'zh' ? `已加入 ${result.addedCount} 个标签页到「${session.name}」` : `Added ${result.addedCount} tabs to “${session.name}”`)
      : (language === 'zh' ? `这些标签页已经在「${session.name}」中` : `These tabs are already in “${session.name}”`));
    setSessionPicker(null);
    setView('saved');
  };

  const requestPermissionAndRefresh = async () => {
    const granted = await requestTabsPermission();
    setPermissionGranted(granted);
    if (granted) {
      setStatus('');
      await refresh();
    } else {
      setStatus(tr('未获得标签页读取权限', 'Tab read permission was not granted'));
    }
  };

  const saveCurrentWindow = async () => {
    let currentTabs = tabs;
    if (!permissionGranted) {
      const granted = await requestTabsPermission();
      setPermissionGranted(granted);
      if (!granted) {
        setStatus(tr('未获得标签页读取权限', 'Tab read permission was not granted'));
        return;
      }
      try {
        currentTabs = await queryOpenBrowserTabs();
        setTabs(currentTabs);
        setStatus('');
      } catch {
        setNotice(tr('读取当前窗口失败', 'Failed to read the current window'));
        return;
      }
    }
    if (currentTabs.length === 0) {
      setNotice(tr('当前窗口没有可保存的网站标签页', 'There are no website tabs to save in this window'));
      return;
    }
    openSessionPicker(currentTabs, createCurrentSessionName(language));
  };

  const renameSession = (session: SavedTabSession) => {
    const nextName = window.prompt(tr('重命名保存的会话', 'Rename saved session'), session.name)?.trim();
    if (!nextName || nextName === session.name) return;
    setSavedSessions(renameSavedTabSession(session.id, nextName));
    setNotice(language === 'zh' ? `已重命名为「${nextName}」` : `Renamed to “${nextName}”`);
  };

  const deleteSession = (session: SavedTabSession) => {
    if (!window.confirm(language === 'zh' ? `删除保存的会话「${session.name}」？` : `Delete saved session “${session.name}”?`)) return;
    setSavedSessions(deleteSavedTabSession(session.id));
    setNotice(language === 'zh' ? `已删除「${session.name}」` : `Deleted “${session.name}”`);
  };

  const stopHeaderControlPointer = (event: ReactPointerEvent<HTMLElement>) => event.stopPropagation();
  const displayCount = view === 'open'
    ? (permissionGranted ? (language === 'zh' ? `${tabs.length} 个` : `${tabs.length} tabs`) : tr('按域名整理', 'Grouped by domain'))
    : (language === 'zh' ? `${savedSessions.length} 个会话` : `${savedSessions.length} sessions`);

  return (
    <div className={styles.root}>
      <div className={styles.header} onPointerDown={startDrag}>
        <div className={styles.titleBlock}>
          <h3 className={styles.title}>{tr('标签页', 'Tabs')}</h3>
          <span className={styles.count}>{displayCount}</span>
        </div>
        <div className={styles.headerActions} onPointerDown={stopHeaderControlPointer}>
          <select
            className={styles.spaceSelect}
            value={selectedSpaceId}
            disabled={spaces.length === 0}
            aria-label={tr('添加网站到空间', 'Add sites to space')}
            title={tr('使用 + 按钮时，网站会进入这个空间', 'Sites added with the + button will go to this space')}
            onChange={(event) => onUpdate(widget.id, { openTabsTargetSpaceId: event.target.value || undefined })}
          >
            {spaces.length === 0 ? <option value="">{tr('暂无空间', 'No spaces yet')}</option> : spaces.map((space) => (
              <option key={space.id} value={space.id}>{tr('添加到', 'Add to')} · {space.name}</option>
            ))}
          </select>
          <button type="button" className={styles.iconButton} title={tr('刷新标签页', 'Refresh tabs')} aria-label={tr('刷新标签页', 'Refresh tabs')} onClick={() => void refresh()}>↻</button>
        </div>
      </div>

      <div className={styles.viewTabs} role="tablist" aria-label={tr('标签页视图', 'Tab view')} onPointerDown={stopHeaderControlPointer}>
        <button
          type="button"
          role="tab"
          aria-selected={view === 'open'}
          className={view === 'open' ? styles.viewTabActive : styles.viewTab}
          onClick={() => setView('open')}
        >
          {tr('打开的标签页', 'Open Tabs')} <span>{permissionGranted ? tabs.length : '—'}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={view === 'saved'}
          className={view === 'saved' ? styles.viewTabActive : styles.viewTab}
          onClick={() => setView('saved')}
        >
          {tr('保存的会话', 'Saved Sessions')} <span>{savedSessions.length}</span>
        </button>
      </div>

      <div className={styles.content} data-widget-scrollable="true">
        {view === 'open' ? (
          isLoading ? (
            <div className={styles.state}>{tr('正在读取当前窗口的标签页…', 'Reading tabs in the current window…')}</div>
          ) : !permissionGranted ? (
            <div className={styles.state}>
              <span>{status || tr('需要标签页读取权限', 'Tab access required')}</span>
              {isTabsApiAvailable() && (
                <button type="button" className={styles.permissionButton} onClick={() => void requestPermissionAndRefresh()}>
                  {tr('授权读取标签页', 'Grant tab access')}
                </button>
              )}
            </div>
          ) : groups.length === 0 ? (
            <div className={styles.state}>{status || tr('没有可显示的标签页', 'No tabs to display')}</div>
          ) : groups.map((group) => {
            const collapsed = collapsedDomains.has(group.domain);
            const allAdded = group.tabs.every((tab) => existingUrls.has(normalizeOpenTabUrl(tab.url)));
            const allSaved = group.tabs.every((tab) => savedUrls.has(normalizeOpenTabUrl(tab.url)));
            return (
              <section key={group.domain} className={styles.group}>
                <div className={styles.groupHeader}>
                  <button
                    type="button"
                    className={styles.groupToggle}
                    aria-expanded={!collapsed}
                    onClick={() => setCollapsedDomains((current) => {
                      const next = new Set(current);
                      if (next.has(group.domain)) next.delete(group.domain);
                      else next.add(group.domain);
                      return next;
                    })}
                  >
                    <span className={`${styles.chevron} ${collapsed ? styles.chevronCollapsed : ''}`}>⌄</span>
                    <span className={styles.domain} title={group.displayDomain}>{group.displayDomain}</span>
                    <span className={styles.domainCount}>{group.tabs.length}</span>
                  </button>
                  <div className={styles.groupActions}>
                    <button
                      type="button"
                      className={`${styles.saveButton} ${allSaved ? styles.saveButtonActive : ''}`}
                      title={allSaved ? tr('这一组已出现在保存的会话中；可继续保存到其他会话', 'This group is already in a saved session; you can still save it to another session') : tr('把这一组保存到会话', 'Save this group to a session')}
                      aria-label={language === 'zh' ? `把 ${group.displayDomain} 这一组保存到会话` : `Save the ${group.displayDomain} group to a session`}
                      onClick={() => openSessionPicker(group.tabs, group.displayDomain)}
                    >
                      <FloppyIcon filled={allSaved} />
                    </button>
                    <button
                      type="button"
                      className={styles.groupAddButton}
                      disabled={!selectedSpace || allAdded}
                      title={allAdded ? tr('这一组已经全部在目标空间中', 'This entire group is already in the target space') : (language === 'zh' ? `把这一组加入 ${selectedSpace?.name || '空间'}` : `Add this group to ${selectedSpace?.name || 'space'}`)}
                      onClick={() => addTabsToSelectedSpace(group.tabs)}
                    >
                      {allAdded ? '✓' : tr('+ 全部', '+ All')}
                    </button>
                  </div>
                </div>
                {!collapsed && (
                  <div className={styles.tabList}>
                    {group.tabs.map((tab) => {
                      const alreadyAdded = existingUrls.has(normalizeOpenTabUrl(tab.url));
                      const alreadySaved = savedUrls.has(normalizeOpenTabUrl(tab.url));
                      return (
                        <div key={tab.id} className={styles.tabRow}>
                          <button type="button" className={styles.tabMain} title={language === 'zh' ? `切换到：${tab.title}` : `Switch to: ${tab.title}`} onClick={() => void focusOpenBrowserTab(tab.id)}>
                            <TabIcon tab={tab} />
                            <span className={styles.tabCopy}>
                              <span className={styles.tabTitle}>{tab.title}</span>
                              <span className={styles.tabMeta}>{getTabPathLabel(tab.url)}</span>
                            </span>
                            {tab.active && <span className={styles.activeDot} title={tr('当前标签页', 'Current tab')} />}
                          </button>
                          <div className={styles.rowActions}>
                            <button
                              type="button"
                              className={`${styles.saveButton} ${alreadySaved ? styles.saveButtonActive : ''}`}
                              title={alreadySaved ? tr('已出现在保存的会话中；可继续添加到其他会话', 'Already in a saved session; you can still add it to another session') : tr('保存到会话', 'Save to session')}
                              aria-label={language === 'zh' ? `把 ${tab.title} 保存到会话` : `Save ${tab.title} to a session`}
                              onClick={() => openSessionPicker([tab], tab.title || tab.displayDomain)}
                            >
                              <FloppyIcon filled={alreadySaved} />
                            </button>
                            <button
                              type="button"
                              className={styles.addButton}
                              disabled={!selectedSpace || alreadyAdded}
                              title={alreadyAdded ? tr('已在目标空间中', 'Already in the target space') : (language === 'zh' ? `添加到 ${selectedSpace?.name || '空间'}` : `Add to ${selectedSpace?.name || 'space'}`)}
                              aria-label={alreadyAdded ? (language === 'zh' ? `${tab.title} 已在目标空间中` : `${tab.title} is already in the target space`) : (language === 'zh' ? `把 ${tab.title} 添加到目标空间` : `Add ${tab.title} to the target space`)}
                              onClick={() => addTabsToSelectedSpace([tab])}
                            >
                              {alreadyAdded ? '✓' : '+'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            );
          })
        ) : (
          <div className={styles.savedView}>
            {savedSessions.length > 0 && (
              <div className={styles.savedToolbar}>
                <span>{tr('会话保存在本机，可随时重新打开。', 'Sessions are stored locally and can be reopened anytime.')}</span>
                <button type="button" className={styles.saveCurrentButton} onClick={() => void saveCurrentWindow()}>
                  <FloppyIcon /> {tr('保存当前窗口', 'Save current window')}
                </button>
              </div>
            )}
            {savedSessions.length === 0 ? (
              <div className={styles.state}>
                <span>{tr('还没有保存的会话', 'No saved sessions yet')}</span>
                <button type="button" className={styles.permissionButton} onClick={() => void saveCurrentWindow()}>
                  {tr('保存当前窗口', 'Save current window')}
                </button>
              </div>
            ) : savedSessions.map((session) => {
              const collapsed = collapsedSessions.has(session.id);
              return (
                <section key={session.id} className={styles.sessionCard}>
                  <div className={styles.sessionHeader}>
                    <button
                      type="button"
                      className={styles.sessionToggle}
                      aria-expanded={!collapsed}
                      onClick={() => setCollapsedSessions((current) => {
                        const next = new Set(current);
                        if (next.has(session.id)) next.delete(session.id);
                        else next.add(session.id);
                        return next;
                      })}
                    >
                      <span className={`${styles.chevron} ${collapsed ? styles.chevronCollapsed : ''}`}>⌄</span>
                      <span className={styles.sessionCopy}>
                        <span className={styles.sessionName}>{session.name}</span>
                        <span className={styles.sessionMeta}>{language === 'zh' ? `${session.tabs.length} 个标签页` : `${session.tabs.length} tabs`} · {formatSavedTime(session.savedAt, language)}</span>
                      </span>
                    </button>
                    <div className={styles.sessionActions}>
                      <button
                        type="button"
                        className={styles.sessionIconButton}
                        title={tr('恢复整个会话', 'Restore entire session')}
                        aria-label={language === 'zh' ? `恢复会话 ${session.name}` : `Restore session ${session.name}`}
                        onClick={() => void restoreSavedTabSession(session).then(() => setNotice(language === 'zh' ? `正在打开「${session.name}」` : `Opening “${session.name}”`)).catch(() => setNotice(tr('恢复会话失败', 'Failed to restore session')))}
                      >
                        <RestoreIcon />
                      </button>
                      <button
                        type="button"
                        className={styles.sessionIconButton}
                        title={tr('重命名会话', 'Rename session')}
                        aria-label={language === 'zh' ? `重命名会话 ${session.name}` : `Rename session ${session.name}`}
                        onClick={() => renameSession(session)}
                      >
                        <PencilIcon />
                      </button>
                      <button
                        type="button"
                        className={`${styles.sessionIconButton} ${styles.dangerButton}`}
                        title={tr('删除会话', 'Delete session')}
                        aria-label={language === 'zh' ? `删除会话 ${session.name}` : `Delete session ${session.name}`}
                        onClick={() => deleteSession(session)}
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  </div>
                  {!collapsed && (
                    <div className={styles.savedTabList}>
                      {session.tabs.map((tab) => {
                        const alreadyAdded = existingUrls.has(normalizeOpenTabUrl(tab.url));
                        return (
                          <div key={tab.url} className={styles.tabRow}>
                            <button type="button" className={styles.tabMain} title={language === 'zh' ? `打开：${tab.title}` : `Open: ${tab.title}`} onClick={() => void openSavedTab(tab.url)}>
                              <TabIcon tab={tab} />
                              <span className={styles.tabCopy}>
                                <span className={styles.tabTitle}>{tab.title}</span>
                                <span className={styles.tabMeta}>{getTabPathLabel(tab.url)}</span>
                              </span>
                            </button>
                            <div className={styles.rowActions}>
                              <button
                                type="button"
                                className={styles.removeSavedButton}
                                title={tr('从这个会话移除', 'Remove from this session')}
                                aria-label={language === 'zh' ? `从 ${session.name} 移除 ${tab.title}` : `Remove ${tab.title} from ${session.name}`}
                                onClick={() => {
                                  setSavedSessions(removeTabFromSavedSession(session.id, tab.url));
                                  setNotice(tr('已从会话移除标签页', 'Tab removed from session'));
                                }}
                              >
                                <CloseIcon />
                              </button>
                              <button
                                type="button"
                                className={styles.addButton}
                                disabled={!selectedSpace || alreadyAdded}
                                title={alreadyAdded ? tr('已在目标空间中', 'Already in the target space') : (language === 'zh' ? `添加到 ${selectedSpace?.name || '空间'}` : `Add to ${selectedSpace?.name || 'space'}`)}
                                onClick={() => addTabsToSelectedSpace([tab])}
                              >
                                {alreadyAdded ? '✓' : '+'}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        )}
      </div>

      {notice && <div className={styles.notice} aria-live="polite">{notice}</div>}

      {sessionPicker && (
        <div className={styles.pickerBackdrop} onPointerDown={stopHeaderControlPointer}>
          <div className={styles.pickerPanel} role="dialog" aria-modal="true" aria-label={tr('保存到会话', 'Save to session')}>
            <div className={styles.pickerHeader}>
              <div>
                <strong>{tr('保存到会话', 'Save to session')}</strong>
                <span>{language === 'zh' ? `${sessionPicker.tabs.length} 个标签页` : `${sessionPicker.tabs.length} tabs`}</span>
              </div>
              <button type="button" className={styles.pickerClose} onClick={() => setSessionPicker(null)} aria-label={tr('关闭', 'Close')}>
                <CloseIcon />
              </button>
            </div>

            {savedSessions.length > 0 && (
              <div className={styles.pickerSessions}>
                <span className={styles.pickerLabel}>{tr('加入已有会话', 'Add to existing session')}</span>
                {savedSessions.map((session) => (
                  <button key={session.id} type="button" className={styles.pickerSessionButton} onClick={() => saveIntoExistingSession(session)}>
                    <span>{session.name}</span>
                    <small>{language === 'zh' ? `${session.tabs.length} 个` : `${session.tabs.length}`}</small>
                  </button>
                ))}
              </div>
            )}

            <form
              className={styles.newSessionForm}
              onSubmit={(event) => {
                event.preventDefault();
                saveAsNewSession();
              }}
            >
              <label htmlFor={`session-name-${widget.id}`} className={styles.pickerLabel}>{tr('新建会话', 'New Session')}</label>
              <div className={styles.newSessionRow}>
                <input
                  id={`session-name-${widget.id}`}
                  value={newSessionName}
                  maxLength={80}
                  onChange={(event) => setNewSessionName(event.target.value)}
                  placeholder={tr('会话名称', 'Session name')}
                  autoFocus
                />
                <button type="submit">{tr('保存', 'Save')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
