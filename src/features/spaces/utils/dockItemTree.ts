import { DockItem } from '@/shared/types';
import { createId } from '@/shared/utils/id';
import { generateFolderIcon } from '@/features/dock/utils/iconFetcher';

const withFolderItems = (folder: DockItem, items: DockItem[]): DockItem => ({
  ...folder,
  type: 'folder',
  items,
  icon: generateFolderIcon(items),
});

export const countWebsiteItems = (items: DockItem[]): number => items.reduce((count, item) => {
  if (item.type === 'folder') return count + countWebsiteItems(item.items ?? []);
  return count + (item.url ? 1 : 0);
}, 0);

export const findDockItemById = (items: DockItem[], itemId: string): DockItem | null => {
  for (const item of items) {
    if (item.id === itemId) return item;
    if (item.type === 'folder' && item.items) {
      const nested = findDockItemById(item.items, itemId);
      if (nested) return nested;
    }
  }
  return null;
};

export const updateDockItemById = (
  items: DockItem[],
  itemId: string,
  updates: Partial<DockItem>,
): DockItem[] => items.map((item) => {
  if (item.id === itemId) {
    if (item.type === 'folder') {
      const nextFolder = { ...item, ...updates, id: item.id, type: 'folder' as const };
      return withFolderItems(nextFolder, nextFolder.items ?? []);
    }
    return { ...item, ...updates, id: item.id, type: 'app' as const };
  }

  if (item.type !== 'folder' || !item.items) return item;
  const nextItems = updateDockItemById(item.items, itemId, updates);
  if (nextItems.every((child, index) => child === item.items?.[index])) return item;
  return withFolderItems(item, nextItems);
});

export const removeDockItemById = (items: DockItem[], itemId: string): DockItem[] => {
  const nextItems: DockItem[] = [];

  for (const item of items) {
    if (item.id === itemId) continue;
    if (item.type !== 'folder' || !item.items) {
      nextItems.push(item);
      continue;
    }

    const nestedItems = removeDockItemById(item.items, itemId);
    if (nestedItems.length === item.items.length) {
      nextItems.push(item);
    } else if (nestedItems.length === 1) {
      nextItems.push(nestedItems[0]);
    } else if (nestedItems.length > 1) {
      nextItems.push(withFolderItems(item, nestedItems));
    }
  }

  return nextItems;
};

export const updateFolderItemsById = (
  items: DockItem[],
  folderId: string,
  children: DockItem[],
): DockItem[] => {
  const nextItems: DockItem[] = [];

  for (const item of items) {
    if (item.id === folderId && item.type === 'folder') {
      if (children.length === 1) nextItems.push(children[0]);
      else if (children.length > 1) nextItems.push(withFolderItems(item, children));
      continue;
    }

    if (item.type !== 'folder' || !item.items) {
      nextItems.push(item);
      continue;
    }

    const nestedItems = updateFolderItemsById(item.items, folderId, children);
    if (nestedItems.length === item.items.length && nestedItems.every((child, index) => child === item.items?.[index])) {
      nextItems.push(item);
    } else if (nestedItems.length === 1) {
      nextItems.push(nestedItems[0]);
    } else if (nestedItems.length > 1) {
      nextItems.push(withFolderItems(item, nestedItems));
    }
  }

  return nextItems;
};

export type DockItemDropPlacement = 'before' | 'after';

export const reorderRootDockItems = (
  items: DockItem[],
  sourceId: string,
  targetId: string,
  placement: DockItemDropPlacement = 'before',
): DockItem[] => {
  if (sourceId === targetId) return items;
  const sourceIndex = items.findIndex((item) => item.id === sourceId);
  const targetIndex = items.findIndex((item) => item.id === targetId);
  if (sourceIndex < 0 || targetIndex < 0) return items;

  const nextItems = [...items];
  const [sourceItem] = nextItems.splice(sourceIndex, 1);
  const targetIndexAfterRemoval = nextItems.findIndex((item) => item.id === targetId);
  const insertIndex = placement === 'after' ? targetIndexAfterRemoval + 1 : targetIndexAfterRemoval;
  nextItems.splice(Math.max(0, insertIndex), 0, sourceItem);
  return nextItems;
};

export const mergeRootDockItems = (
  items: DockItem[],
  sourceId: string,
  targetId: string,
): DockItem[] => {
  if (sourceId === targetId) return items;
  const source = items.find((item) => item.id === sourceId);
  const target = items.find((item) => item.id === targetId);
  if (!source || !target) return items;

  const sourceItems = source.type === 'folder' ? (source.items ?? []) : [source];
  if (sourceItems.length === 0) return items.filter((item) => item.id !== sourceId);

  if (target.type === 'folder') {
    const mergedItems = [...(target.items ?? []), ...sourceItems];
    return items
      .map((item) => item.id === targetId ? withFolderItems(item, mergedItems) : item)
      .filter((item) => item.id !== sourceId);
  }

  const folderItems = [target, ...sourceItems];
  const folder: DockItem = withFolderItems({
    id: createId('folder'),
    name: '新文件夹',
    type: 'folder',
    items: folderItems,
  }, folderItems);

  return items
    .map((item) => item.id === targetId ? folder : item)
    .filter((item) => item.id !== sourceId);
};

/**
 * 将指定文件夹中的一个直接子项提升到空间根级。
 * 文件夹剩 1 项时自动解散；为空时自动移除。
 */
export const moveFolderItemToRoot = (
  items: DockItem[],
  folderId: string,
  itemId: string,
  targetId?: string,
  placement: DockItemDropPlacement = 'after',
): DockItem[] => {
  const removeFromFolder = (
    currentItems: DockItem[],
    rootIndex: number,
  ): { items: DockItem[]; extracted: DockItem | null; sourceRootIndex: number } => {
    for (let index = 0; index < currentItems.length; index += 1) {
      const item = currentItems[index];

      if (item.id === folderId && item.type === 'folder') {
        const children = item.items ?? [];
        const childIndex = children.findIndex((child) => child.id === itemId);
        if (childIndex < 0) break;

        const extracted = children[childIndex];
        const remaining = children.filter((child) => child.id !== itemId);
        const replacement: DockItem[] = remaining.length === 0
          ? []
          : remaining.length === 1
            ? [remaining[0]]
            : [withFolderItems(item, remaining)];

        return {
          items: [...currentItems.slice(0, index), ...replacement, ...currentItems.slice(index + 1)],
          extracted,
          sourceRootIndex: rootIndex,
        };
      }

      if (item.type === 'folder' && item.items) {
        const nestedResult = removeFromFolder(item.items, rootIndex);
        if (!nestedResult.extracted) continue;

        const replacement: DockItem[] = nestedResult.items.length === 0
          ? []
          : nestedResult.items.length === 1
            ? [nestedResult.items[0]]
            : [withFolderItems(item, nestedResult.items)];

        return {
          items: [...currentItems.slice(0, index), ...replacement, ...currentItems.slice(index + 1)],
          extracted: nestedResult.extracted,
          sourceRootIndex: nestedResult.sourceRootIndex,
        };
      }
    }

    return { items: currentItems, extracted: null, sourceRootIndex: rootIndex };
  };

  let removal = { items, extracted: null as DockItem | null, sourceRootIndex: items.length };
  for (let rootIndex = 0; rootIndex < items.length && !removal.extracted; rootIndex += 1) {
    const rootItem = items[rootIndex];
    if (rootItem.id === folderId || (rootItem.type === 'folder' && findDockItemById([rootItem], folderId))) {
      removal = removeFromFolder(items, rootIndex);
    }
  }

  if (!removal.extracted) return items;

  const extracted = removal.extracted;
  const cleanRoot = removal.items.filter((item) => item.id !== extracted.id);
  const targetIndex = targetId ? cleanRoot.findIndex((item) => item.id === targetId) : -1;
  const insertIndex = targetIndex >= 0
    ? targetIndex + (placement === 'after' ? 1 : 0)
    : Math.min(Math.max(0, removal.sourceRootIndex + 1), cleanRoot.length);

  const result = [...cleanRoot];
  result.splice(insertIndex, 0, extracted);
  return result;
};

