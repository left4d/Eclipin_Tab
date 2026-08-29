import { useEffect, useMemo, useState } from 'react';
import { useSpaces } from '@/features/spaces/context/SpacesContext';
import type { DockItem } from '@/features/dock/types/dock';
import { AddEditModal } from '@/features/dock/components/Modal/AddEditModal';
import { createId } from '@/shared/utils/id';
import {
  countWebsiteItems,
  findDockItemById,
  removeDockItemById,
  updateDockItemById,
} from '@/features/spaces/utils/dockItemTree';
import styles from '../Modal/SettingsModal.module.css';
import { useLanguage } from '@/shared/context/LanguageContext';

interface SpaceEditorState {
  spaceId: string;
  itemId: string | null;
  anchorRect: DOMRect;
}

export const SpacesSettingsSection = () => {
  const { spaces, updateSpaceApps, renameSpace, setSpaceDockVisibility } = useSpaces();
  const { language } = useLanguage();
  const [selectedSpaceId, setSelectedSpaceId] = useState(() => spaces[0]?.id ?? '');
  const [spaceNameDraft, setSpaceNameDraft] = useState(() => spaces[0]?.name ?? '');
  const [editor, setEditor] = useState<SpaceEditorState | null>(null);

  const selectedSpace = useMemo(
    () => spaces.find((space) => space.id === selectedSpaceId) ?? spaces[0] ?? null,
    [selectedSpaceId, spaces],
  );
  const editingItem = useMemo(() => {
    if (!editor?.itemId) return null;
    const targetSpace = spaces.find((space) => space.id === editor.spaceId);
    return targetSpace ? findDockItemById(targetSpace.apps, editor.itemId) : null;
  }, [editor, spaces]);
  const visibleDockSpaceCount = useMemo(
    () => spaces.filter((space) => space.showInDock !== false).length,
    [spaces],
  );

  useEffect(() => {
    if (spaces.length > 0 && !spaces.some((space) => space.id === selectedSpaceId)) {
      setSelectedSpaceId(spaces[0].id);
    }
  }, [selectedSpaceId, spaces]);

  useEffect(() => {
    setSpaceNameDraft(selectedSpace?.name ?? '');
  }, [selectedSpace?.id, selectedSpace?.name]);

  const commitSpaceName = () => {
    if (!selectedSpace) return;
    const nextName = spaceNameDraft.trim();
    if (!nextName) {
      setSpaceNameDraft(selectedSpace.name);
      return;
    }
    if (nextName !== selectedSpace.name) renameSpace(selectedSpace.id, nextName);
  };

  const saveItem = (item: Partial<DockItem>) => {
    if (!editor) return;
    const name = item.name?.trim();
    if (!name) return;

    if (editor.itemId) {
      updateSpaceApps(editor.spaceId, (apps) => updateDockItemById(apps, editor.itemId!, {
        name,
        url: item.url,
        icon: item.icon,
        iconSmall: item.iconSmall,
      }));
    } else {
      const newItem: DockItem = {
        id: createId(),
        type: 'app',
        name,
        url: item.url,
        icon: item.icon,
        iconSmall: item.iconSmall,
      };
      updateSpaceApps(editor.spaceId, (apps) => [...apps, newItem]);
    }
    setEditor(null);
  };

  const deleteItem = (spaceId: string, item: DockItem) => {
    if (!window.confirm(language === 'zh' ? `确定删除“${item.name}”吗？` : `Delete “${item.name}”?`)) return;
    updateSpaceApps(spaceId, (apps) => removeDockItemById(apps, item.id));
  };

  const renderWebsiteRow = (spaceId: string, item: DockItem, nested = false) => (
    <div key={item.id} className={`${styles.spaceWebsiteRow} ${nested ? styles.spaceWebsiteRowNested : ''}`}>
      <span className={styles.spaceWebsiteIcon} aria-hidden="true">
        {item.name.trim().charAt(0).toUpperCase() || '↗'}
      </span>
      <span className={styles.spaceWebsiteCopy}>
        <strong>{item.name}</strong>
        <small title={item.url}>{item.url || '未设置网址'}</small>
      </span>
      <button
        type="button"
        className={styles.spaceWebsiteAction}
        onClick={(event) => setEditor({ spaceId, itemId: item.id, anchorRect: event.currentTarget.getBoundingClientRect() })}
      >
        编辑
      </button>
      <button type="button" className={`${styles.spaceWebsiteAction} ${styles.spaceWebsiteDelete}`} onClick={() => deleteItem(spaceId, item)}>
        删除
      </button>
    </div>
  );

  return (
    <>
      <section className={styles.settingsSection}>
        <div className={styles.sectionHeader}>
          <h2>空间</h2>
          <p>管理首页快捷网址栏显示的空间，并直接维护每个空间中的网站。</p>
        </div>

        <div className={styles.spaceSettingsLayout}>
          <aside className={styles.spaceSettingsSidebar}>
            <div className={styles.spaceSettingsSidebarHeader}>
              <strong>全部空间</strong>
              <span>{spaces.length}</span>
            </div>
            <div className={styles.spaceSettingsList}>
              {spaces.map((space) => (
                <button
                  key={space.id}
                  type="button"
                  className={`${styles.spaceSettingsChoice} ${selectedSpace?.id === space.id ? styles.spaceSettingsChoiceActive : ''}`}
                  onClick={() => setSelectedSpaceId(space.id)}
                >
                  <span className={styles.spaceSettingsChoiceIcon}>
                    {space.iconType === 'emoji' && space.iconValue ? space.iconValue : space.name.charAt(0).toUpperCase()}
                  </span>
                  <span className={styles.spaceSettingsChoiceCopy}>
                    <strong>{space.name}</strong>
                    <small>{countWebsiteItems(space.apps)} 个网站</small>
                  </span>
                  <span className={`${styles.spaceDockBadge} ${space.showInDock !== false ? styles.spaceDockBadgeVisible : ''}`}>
                    {space.showInDock !== false ? 'Dock' : '隐藏'}
                  </span>
                </button>
              ))}
            </div>
          </aside>

          <div className={styles.spaceSettingsEditor}>
            {selectedSpace ? (
              <>
                <div className={styles.spaceSettingsTopbar}>
                  <label className={styles.spaceNameField}>
                    <span>空间名称</span>
                    <input
                      value={spaceNameDraft}
                      maxLength={30}
                      onChange={(event) => setSpaceNameDraft(event.target.value)}
                      onBlur={commitSpaceName}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') event.currentTarget.blur();
                        if (event.key === 'Escape') {
                          setSpaceNameDraft(selectedSpace.name);
                          event.currentTarget.blur();
                        }
                      }}
                    />
                  </label>
                  <div className={styles.spaceDockSwitchBlock}>
                    <div>
                      <strong>在快捷网址栏中显示</strong>
                      <small>隐藏后仍可在设置和空间组件中管理</small>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={selectedSpace.showInDock !== false}
                      className={`${styles.spaceDockSwitch} ${selectedSpace.showInDock !== false ? styles.spaceDockSwitchOn : ''}`}
                      disabled={selectedSpace.showInDock !== false && visibleDockSpaceCount <= 1}
                      title={selectedSpace.showInDock !== false && visibleDockSpaceCount <= 1 ? '至少保留一个空间显示在快捷网址栏' : undefined}
                      onClick={() => setSpaceDockVisibility(selectedSpace.id, selectedSpace.showInDock === false)}
                    >
                      <span />
                    </button>
                  </div>
                </div>

                <div className={styles.spaceWebsiteHeader}>
                  <div>
                    <strong>空间网址</strong>
                    <span>{countWebsiteItems(selectedSpace.apps)} 个网站 · 拖拽与文件夹整理可在首页或空间组件编辑模式中完成</span>
                  </div>
                  <button
                    type="button"
                    className={styles.spaceWebsiteAdd}
                    onClick={(event) => setEditor({ spaceId: selectedSpace.id, itemId: null, anchorRect: event.currentTarget.getBoundingClientRect() })}
                  >
                    ＋ 添加网址
                  </button>
                </div>

                <div className={styles.spaceWebsiteList}>
                  {selectedSpace.apps.length > 0 ? selectedSpace.apps.map((item) => (
                    item.type === 'folder' ? (
                      <div key={item.id} className={styles.spaceFolderCard}>
                        <div className={styles.spaceFolderHeader}>
                          <span className={styles.spaceFolderIcon}>▦</span>
                          <div>
                            <strong>{item.name}</strong>
                            <small>{countWebsiteItems(item.items ?? [])} 个网站</small>
                          </div>
                        </div>
                        <div className={styles.spaceFolderItems}>
                          {(item.items ?? []).map((child) => renderWebsiteRow(selectedSpace.id, child, true))}
                        </div>
                      </div>
                    ) : renderWebsiteRow(selectedSpace.id, item)
                  )) : (
                    <div className={styles.spaceWebsiteEmpty}>
                      <span>＋</span>
                      <strong>这个空间还没有网址</strong>
                      <button
                        type="button"
                        onClick={(event) => setEditor({ spaceId: selectedSpace.id, itemId: null, anchorRect: event.currentTarget.getBoundingClientRect() })}
                      >
                        添加第一个网址
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className={styles.spaceWebsiteEmpty}>暂无空间</div>
            )}
          </div>
        </div>
      </section>
      <AddEditModal
        isOpen={Boolean(editor)}
        item={editingItem}
        anchorRect={editor?.anchorRect ?? null}
        hideHeader
        popoverPlacement="side"
        onClose={() => setEditor(null)}
        onSave={saveItem}
      />
    </>
  );
};
