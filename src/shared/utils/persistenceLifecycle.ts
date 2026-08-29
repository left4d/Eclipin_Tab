export const PERSISTENCE_RESTORE_START_EVENT = 'eclipin:persistence-restore-start';
export const PERSISTENCE_RESTORE_APPLIED_EVENT = 'eclipin:persistence-restore-applied';
export const PERSISTENCE_RESTORE_FAILED_EVENT = 'eclipin:persistence-restore-failed';

const dispatchWindowEvent = (name: string): void => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(name));
};

/**
 * 通知仍挂载在当前页面中的状态 Provider：接下来会用快照覆盖持久化数据。
 * Provider 应暂停 pagehide/unmount 写回，避免旧内存状态覆盖刚恢复的数据。
 */
export const notifyPersistenceRestoreStart = (): void => {
  dispatchWindowEvent(PERSISTENCE_RESTORE_START_EVENT);
};

/**
 * 快照已经写入持久化层。Provider 可从 storage 重新同步内存引用，
 * 之后即使页面马上 reload/pagehide，也只会写回恢复后的数据。
 */
export const notifyPersistenceRestoreApplied = (): void => {
  dispatchWindowEvent(PERSISTENCE_RESTORE_APPLIED_EVENT);
};

/** 恢复失败时解除暂停，继续使用当前页面原有的内存状态。 */
export const notifyPersistenceRestoreFailed = (): void => {
  dispatchWindowEvent(PERSISTENCE_RESTORE_FAILED_EVENT);
};
