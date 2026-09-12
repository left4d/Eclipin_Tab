import { deleteLocalWebPage } from './localWebPageService';
import { hasStoredWidgets, loadWidgets, persistAndEmitWidgets, type WidgetLayoutMode } from './widgetStorage';
import type { WidgetLayout } from '../types/widget';

export const DELETED_WIDGETS_CHANGED_EVENT = 'eclipin:deleted-widgets-changed';
export const RESTORE_WIDGET_EVENT = 'eclipin:restore-widget';
const MAX_DELETED_WIDGETS = 30;
const STORAGE_PREFIX = 'eclipin_deleted_widgets_v1';

export interface DeletedWidgetRecord {
  id: string;
  deletedAt: number;
  mode: WidgetLayoutMode;
  widget: WidgetLayout;
}

const cache: Partial<Record<WidgetLayoutMode, DeletedWidgetRecord[]>> = {};

const storageKey = (mode: WidgetLayoutMode) => `${STORAGE_PREFIX}_${mode}`;

const getStorage = (): Storage | null => {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
};

const normalizeRecords = (value: unknown, mode: WidgetLayoutMode): DeletedWidgetRecord[] => {
  if (!Array.isArray(value)) return [];
  return value.flatMap((raw): DeletedWidgetRecord[] => {
    if (!raw || typeof raw !== 'object') return [];
    const record = raw as Partial<DeletedWidgetRecord>;
    if (!record.widget || typeof record.widget !== 'object' || typeof record.widget.id !== 'string') return [];
    return [{
      id: typeof record.id === 'string' && record.id ? record.id : `${record.widget.id}-${Number(record.deletedAt) || Date.now()}`,
      deletedAt: typeof record.deletedAt === 'number' && Number.isFinite(record.deletedAt) ? record.deletedAt : Date.now(),
      mode,
      widget: record.widget as WidgetLayout,
    }];
  }).slice(0, MAX_DELETED_WIDGETS);
};

export const loadDeletedWidgets = (mode: WidgetLayoutMode): DeletedWidgetRecord[] => {
  const cached = cache[mode];
  if (cached) return cached;
  try {
    const raw = getStorage()?.getItem(storageKey(mode));
    const records = normalizeRecords(raw ? JSON.parse(raw) : [], mode);
    cache[mode] = records;
    return records;
  } catch {
    cache[mode] = [];
    return [];
  }
};

const emitChange = (mode: WidgetLayoutMode) => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(DELETED_WIDGETS_CHANGED_EVENT, { detail: { mode } }));
};

const saveDeletedWidgets = (mode: WidgetLayoutMode, records: DeletedWidgetRecord[]) => {
  const next = records.slice(0, MAX_DELETED_WIDGETS);
  cache[mode] = next;
  try {
    getStorage()?.setItem(storageKey(mode), JSON.stringify(next));
  } catch {
    // Keep the in-memory recycle bin usable when storage is unavailable.
  }
  emitChange(mode);
};

export const recycleWidget = (widget: WidgetLayout, mode: WidgetLayoutMode): DeletedWidgetRecord => {
  const record: DeletedWidgetRecord = {
    id: `${widget.id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    deletedAt: Date.now(),
    mode,
    widget: { ...widget },
  };
  const current = loadDeletedWidgets(mode).filter((item) => item.id !== record.id);
  const next = [record, ...current];
  const dropped = next.slice(MAX_DELETED_WIDGETS);
  saveDeletedWidgets(mode, next);
  dropped.forEach((item) => cleanupLocalPageIfUnused(item));
  return record;
};

const widgetReferencesLocalPage = (localId: string, ignoredRecordId?: string): boolean => {
  for (const mode of ['vertical', 'horizontal'] as const) {
    if (hasStoredWidgets(mode) && loadWidgets(mode).some((widget) => widget.embedLocalId === localId)) return true;
    if (loadDeletedWidgets(mode).some((record) => record.id !== ignoredRecordId && record.widget.embedLocalId === localId)) return true;
  }
  return false;
};

const cleanupLocalPageIfUnused = (record: DeletedWidgetRecord) => {
  const localId = record.widget.embedLocalId;
  if (!localId || widgetReferencesLocalPage(localId, record.id)) return;
  void deleteLocalWebPage(localId);
};

export const permanentlyDeleteWidget = (recordId: string, mode: WidgetLayoutMode): void => {
  const current = loadDeletedWidgets(mode);
  const record = current.find((item) => item.id === recordId);
  if (!record) return;
  saveDeletedWidgets(mode, current.filter((item) => item.id !== recordId));
  cleanupLocalPageIfUnused(record);
};

export const restoreDeletedWidget = (recordId: string, mode: WidgetLayoutMode): WidgetLayout | null => {
  const current = loadDeletedWidgets(mode);
  const record = current.find((item) => item.id === recordId);
  if (!record) return null;

  const active = loadWidgets(mode);
  const hasIdCollision = active.some((widget) => widget.id === record.widget.id);
  const restored: WidgetLayout = hasIdCollision
    ? { ...record.widget, id: `${record.widget.id}-restored-${Date.now().toString(36)}` }
    : { ...record.widget };

  persistAndEmitWidgets([...active, restored], mode);
  saveDeletedWidgets(mode, current.filter((item) => item.id !== recordId));
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(RESTORE_WIDGET_EVENT, { detail: { mode, widget: restored } }));
  }
  return restored;
};

export const getDeletedWidgetCount = (mode: WidgetLayoutMode): number => loadDeletedWidgets(mode).length;
