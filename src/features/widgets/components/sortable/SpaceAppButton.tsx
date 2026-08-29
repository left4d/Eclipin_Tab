import { useRef, type DragEvent } from 'react';
import { DockItem as DockItemComponent } from '@/features/dock/components/Dock/DockItem';
import type { DockItem } from '@/features/dock/types/dock';
import type { DockItemDropPlacement } from '@/features/spaces/utils/dockItemTree';
import type { SpaceDropMode } from './SortableWidget.types';
import styles from '../WidgetPanel.module.css';

interface SpaceAppButtonProps {
  item: DockItem;
  isEditMode: boolean;
  isDragging: boolean;
  dropMode: SpaceDropMode | null;
  dropPlacement: DockItemDropPlacement;
  onOpen: (item: DockItem, anchorRect: DOMRect) => void;
  onEdit: (item: DockItem, anchorRect: DOMRect) => void;
  onDelete: (itemId: string) => void;
  onDragStart: (itemId: string) => void;
  onDragHover: (itemId: string, mode: SpaceDropMode, placement: DockItemDropPlacement) => void;
  onDragEnd: () => void;
  onDrop: (targetId: string, mode: SpaceDropMode, placement: DockItemDropPlacement) => void;
  iconRefreshKey?: number;
}

export const SpaceAppButton = ({
  item,
  isEditMode,
  isDragging,
  dropMode,
  dropPlacement,
  onOpen,
  onEdit,
  onDelete,
  onDragStart,
  onDragHover,
  onDragEnd,
  onDrop,
  iconRefreshKey = 0,
}: SpaceAppButtonProps) => {
  const shellRef = useRef<HTMLDivElement>(null);

  const resolveDropIntent = (event: DragEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const inCenter = Math.abs(event.clientX - centerX) <= rect.width * 0.3
      && Math.abs(event.clientY - centerY) <= rect.height * 0.34;
    return {
      mode: (inCenter ? 'merge' : 'reorder') as SpaceDropMode,
      placement: (event.clientX < centerX ? 'before' : 'after') as DockItemDropPlacement,
    };
  };

  return (
    <div
      ref={shellRef}
      data-space-item-id={item.id}
      className={`${styles.spaceAppShell} ${isDragging ? styles.spaceAppShellDragging : ''} ${dropMode === 'merge' ? styles.spaceAppShellMergeTarget : ''} ${dropMode === 'reorder' ? styles.spaceAppShellReorderTarget : ''} ${dropMode === 'reorder' && dropPlacement === 'after' ? styles.spaceAppShellReorderAfter : ''}`}
      draggable={isEditMode}
      onDragStart={(event) => {
        if (!isEditMode) {
          event.preventDefault();
          return;
        }
        event.stopPropagation();
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('application/x-eclipin-space-item', item.id);
        event.dataTransfer.setData('text/plain', item.id);
        onDragStart(item.id);
      }}
      onDragEnter={(event) => {
        if (!isEditMode) return;
        event.preventDefault();
        event.stopPropagation();
        const intent = resolveDropIntent(event);
        onDragHover(item.id, intent.mode, intent.placement);
      }}
      onDragOver={(event) => {
        if (!isEditMode) return;
        event.preventDefault();
        event.stopPropagation();
        event.dataTransfer.dropEffect = 'move';
        const intent = resolveDropIntent(event);
        onDragHover(item.id, intent.mode, intent.placement);
      }}
      onDrop={(event) => {
        if (!isEditMode) return;
        event.preventDefault();
        event.stopPropagation();
        const intent = resolveDropIntent(event);
        onDrop(item.id, intent.mode, intent.placement);
      }}
      onDragEnd={(event) => {
        event.stopPropagation();
        onDragEnd();
      }}
    >
      <DockItemComponent
        item={item}
        isEditMode={isEditMode}
        isDragging={isDragging}
        isDropTarget={dropMode === 'reorder'}
        isMergeTarget={dropMode === 'merge'}
        onClick={(rect) => onOpen(item, rect ?? shellRef.current?.getBoundingClientRect() ?? new DOMRect())}
        onEdit={(rect) => onEdit(item, rect ?? shellRef.current?.getBoundingClientRect() ?? new DOMRect())}
        onDelete={() => onDelete(item.id)}
        onMouseDown={(event) => event.stopPropagation()}
        iconRefreshKey={iconRefreshKey}
      />
      {isEditMode && item.type === 'folder' && (
        <button
          type="button"
          className={styles.spaceFolderRenameButton}
          title="重命名文件夹"
          aria-label={`重命名文件夹 ${item.name}`}
          draggable={false}
          onPointerDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onEdit(item, shellRef.current?.getBoundingClientRect() ?? new DOMRect());
          }}
        >
          ✎
        </button>
      )}
      <span className={styles.spaceAppName} title={item.name}>{item.name}</span>
    </div>
  );
};
