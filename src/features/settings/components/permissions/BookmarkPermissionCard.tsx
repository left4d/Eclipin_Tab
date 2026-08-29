import { useCallback, useEffect, useState } from 'react';
import {
  hasBookmarkPermission,
  isBookmarkApiAvailable,
  requestBookmarkPermission,
} from '@/features/dock/utils/bookmarks';
import styles from '../sections/ApiSettingsSection.module.css';

export const BookmarkPermissionCard = () => {
  const [available, setAvailable] = useState(false);
  const [granted, setGranted] = useState(false);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const isAvailable = isBookmarkApiAvailable();
    setAvailable(isAvailable);
    if (!isAvailable) {
      setGranted(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    setGranted(await hasBookmarkPermission());
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const requestPermission = async () => {
    if (loading || !available) return;
    setLoading(true);
    setGranted(await requestBookmarkPermission());
    setLoading(false);
  };

  return (
    <div className={styles.apiPermissionCard}>
      <div>
        <strong>Chrome 书签同步</strong>
        <span>{available ? (granted ? '已授权，书签小组件可同步浏览器书签。' : '需要授权 bookmarks 权限后同步。') : '当前不是扩展环境，无法读取浏览器书签。'}</span>
        <small>不需要 API Key，也不需要填写网页请求头。</small>
      </div>
      <button type="button" onClick={granted ? refresh : requestPermission} disabled={loading || !available}>
        {loading ? '检查中' : granted ? '刷新状态' : '授权书签'}
      </button>
    </div>
  );
};
