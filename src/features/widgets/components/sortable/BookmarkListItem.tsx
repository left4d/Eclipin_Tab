import type { DockItem } from '@/features/dock/types/dock';
import { countWebsiteItems } from '@/features/spaces/utils/dockItemTree';
import { useResolvedIcon } from '../../hooks/useResolvedIcon';
import styles from './BookmarkWidget.module.css';

interface BookmarkListItemProps {
  item: DockItem;
  depth: number;
  expandedFolderIds: Set<string>;
  onToggleFolder: (folderId: string) => void;
  onOpenUrl: (url: string) => void;
  onEdit?: (item: DockItem, anchorRect: DOMRect) => void;
  isEditMode?: boolean;
  iconRefreshKey: number;
}

const getBookmarkSecondaryText = (item: DockItem): string => {
  if (item.type === 'folder') return `${countWebsiteItems(item.items ?? [])} 个书签`;
  if (!item.url) return '';
  try {
    return new URL(item.url).hostname.replace(/^www\./i, '');
  } catch {
    return item.url;
  }
};

export const BookmarkListItem = ({
  item,
  depth,
  expandedFolderIds,
  onToggleFolder,
  onOpenUrl,
  onEdit,
  isEditMode = false,
  iconRefreshKey,
}: BookmarkListItemProps) => {
  const isFolder = item.type === 'folder';
  const isExpanded = isFolder && expandedFolderIds.has(item.id);
  const resolvedIcon = useResolvedIcon(isFolder ? undefined : item.icon);
  const children = isFolder ? item.items ?? [] : [];
  const showEditButton = !isFolder && isEditMode && Boolean(onEdit);

  return (
    <div className={styles.bookmarkListNode}>
      <div className={styles.bookmarkListRowShell}>
        <button
          type="button"
          className={`${styles.bookmarkListRow} ${isFolder ? styles.bookmarkFolderRow : ''} ${showEditButton ? styles.bookmarkListRowEditable : ''}`}
          style={{ paddingLeft: 8 + depth * 17 }}
          title={item.name}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation();
            if (isFolder) {
              onToggleFolder(item.id);
            } else if (item.url) {
              onOpenUrl(item.url);
            }
          }}
        >
          <span className={styles.bookmarkListIcon} aria-hidden="true">
            {isFolder ? (
              <span className={styles.bookmarkFolderGlyph}>{isExpanded ? '▾' : '▸'}</span>
            ) : (
              <img
                key={`${item.id}-${iconRefreshKey}-${resolvedIcon}`}
                src={resolvedIcon}
                alt=""
                draggable={false}
                className={item.iconSmall ? styles.bookmarkListIconSmall : undefined}
              />
            )}
          </span>
          <span className={styles.bookmarkListText}>
            <strong>{item.name}</strong>
            <small>{getBookmarkSecondaryText(item)}</small>
          </span>
          {isFolder && <span className={styles.bookmarkFolderCount}>{children.length}</span>}
        </button>
        {showEditButton && (
          <button
            type="button"
            className={styles.bookmarkEditButton}
            title="编辑书签图标"
            aria-label={`编辑 ${item.name} 的图标`}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onEdit?.(item, event.currentTarget.getBoundingClientRect());
            }}
          >
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M3 11.75 3.45 9.4l6.9-6.9a1.35 1.35 0 0 1 1.9 0l1.25 1.25a1.35 1.35 0 0 1 0 1.9l-6.9 6.9L4.25 13 3 13v-1.25Z" stroke="currentColor" strokeWidth="1.35" strokeLinejoin="round" />
              <path d="m9.45 3.4 3.15 3.15" stroke="currentColor" strokeWidth="1.35" />
            </svg>
          </button>
        )}
      </div>
      {isExpanded && children.length > 0 && (
        <div className={styles.bookmarkListChildren}>
          {children.map((child) => (
            <BookmarkListItem
              key={child.id}
              item={child}
              depth={depth + 1}
              expandedFolderIds={expandedFolderIds}
              onToggleFolder={onToggleFolder}
              onOpenUrl={onOpenUrl}
              onEdit={onEdit}
              isEditMode={isEditMode}
              iconRefreshKey={iconRefreshKey}
            />
          ))}
        </div>
      )}
    </div>
  );
};
