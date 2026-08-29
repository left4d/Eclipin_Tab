import type { DockItem } from '@/features/dock/types/dock';
import { fetchAndProcessIcon } from '@/features/dock/utils/iconFetcher';
import { FAVICON_PREFIX, getDomainFromRef } from '@/features/dock/utils/iconCache';
import { db } from '@/shared/utils/db';
import { normalizeUrl } from '@/shared/utils/url';

const shouldRepairIcon = async (item: DockItem): Promise<boolean> => {
  if (!item.icon || item.icon.startsWith('data:image/svg')) return true;
  if (!item.icon.startsWith(FAVICON_PREFIX)) return false;
  try {
    return (await db.getFavicon(getDomainFromRef(item.icon)))?.isFallback === true;
  } catch {
    return false;
  }
};

/**
 * 只负责图标修复，不读取或写入空间状态。
 * 调用方应捕获目标空间 ID，异步完成后再精确提交结果。
 */
export const repairDockItemIcons = async (items: DockItem[]): Promise<DockItem[]> => {
  const repaired: DockItem[] = [];

  for (const item of items) {
    if (item.type === 'folder') {
      repaired.push({ ...item, items: await repairDockItemIcons(item.items ?? []) });
      continue;
    }

    if (!item.url || !(await shouldRepairIcon(item))) {
      repaired.push(item);
      continue;
    }

    try {
      const result = await fetchAndProcessIcon(normalizeUrl(item.url), 0, true, true);
      repaired.push(result.isFallback
        ? item
        : { ...item, icon: result.url, iconSmall: Boolean(result.iconSmall) });
    } catch {
      repaired.push(item);
    }
  }

  return repaired;
};
