import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { getLocalWebFiles } from '@/shared/utils/localWebFileDb';
import { useVisibleSessionMount } from '@/shared/hooks/useVisibleSessionMount';
import styles from '../WidgetPanel.module.css';

interface EmbeddedWebPageProps {
  url?: string;
  html?: string;
  title: string;
  onLoad: () => void;
  packageId?: string;
  packageEntryPath?: string;
}

const LOCAL_WEB_INIT_MESSAGE = 'eclipin:local-web-package:init';
const EMBED_PRELOAD_MARGIN = '1800px 3000px';

/**
 * 将 iframe 与小组件内的高频状态更新隔离。
 * 网页包通过固定的 sandbox runner 加载；runner 本身是 manifest sandbox page，
 * 用户网页脚本无法直接访问主应用 DOM / localStorage / Chrome 扩展 API。
 *
 * iframe 是这里最昂贵的资源：当前新标签页会话里只要进入过预加载区就持续保活，
 * 翻页返回时直接复用；文档进入后台后立即卸载。外层 host 始终保留，因此仍可恢复。
 */
export const EmbeddedWebPage = memo(({
  url,
  html,
  title,
  onLoad,
  packageId,
  packageEntryPath,
}: EmbeddedWebPageProps) => {
  const hostRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const sentPackageRef = useRef('');
  const [isNearViewport, setIsNearViewport] = useState(false);
  const packageKey = packageId && packageEntryPath ? `${packageId}:${packageEntryPath}` : '';

  useEffect(() => {
    sentPackageRef.current = '';
  }, [packageKey]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || typeof IntersectionObserver === 'undefined') {
      setIsNearViewport(true);
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      const entry = entries[0];
      setIsNearViewport(Boolean(entry?.isIntersecting));
    }, { root: null, rootMargin: EMBED_PRELOAD_MARGIN, threshold: 0 });
    observer.observe(host);
    return () => observer.disconnect();
  }, []);

  // Once an iframe has entered the preload margin, keep it alive for the rest
  // of the current visible new-tab session. Switching away releases it
  // immediately; returning only remounts frames that are near the viewport.
  const shouldMountFrame = useVisibleSessionMount(isNearViewport);

  useEffect(() => {
    if (!shouldMountFrame) sentPackageRef.current = '';
  }, [shouldMountFrame]);

  const handleLoad = useCallback(() => {
    onLoad();
    if (!packageId || !packageEntryPath || sentPackageRef.current === packageKey) return;
    sentPackageRef.current = packageKey;
    void getLocalWebFiles(packageId).then((files) => {
      const target = frameRef.current?.contentWindow;
      if (!target || sentPackageRef.current !== packageKey) return;
      target.postMessage({
        type: LOCAL_WEB_INIT_MESSAGE,
        pageId: packageId,
        entryPath: packageEntryPath,
        files: files.map((item) => ({
          path: item.path,
          data: item.data,
          mimeType: item.mimeType,
          size: item.size,
        })),
      }, '*');
    }).catch((error) => {
      sentPackageRef.current = '';
      console.error('Failed to prepare local web package:', error);
    });
  }, [onLoad, packageEntryPath, packageId, packageKey]);

  return (
    <div ref={hostRef} className={styles.embedFrameHost} data-embed-suspended={shouldMountFrame ? undefined : 'true'}>
      {shouldMountFrame && (
        <iframe
          ref={frameRef}
          className={styles.embedFrame}
          src={html === undefined ? url : undefined}
          srcDoc={html}
          title={title}
          sandbox={html === undefined ? undefined : 'allow-downloads allow-forms allow-modals allow-popups allow-popups-to-escape-sandbox allow-pointer-lock allow-scripts'}
          allow="autoplay; clipboard-read; clipboard-write; fullscreen; picture-in-picture; storage-access"
          allowFullScreen
          referrerPolicy="no-referrer"
          loading="eager"
          onLoad={handleLoad}
        />
      )}
    </div>
  );
});

EmbeddedWebPage.displayName = 'EmbeddedWebPage';
