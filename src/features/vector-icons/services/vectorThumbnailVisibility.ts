type VisibilityCallback = (visible: boolean) => void;

const callbacks = new Map<Element, VisibilityCallback>();
let observer: IntersectionObserver | null = null;

function getObserver(): IntersectionObserver | null {
  if (typeof IntersectionObserver === 'undefined') return null;
  if (observer) return observer;
  observer = new IntersectionObserver((entries) => {
    for (const entry of entries) callbacks.get(entry.target)?.(entry.isIntersecting);
  }, { rootMargin: '80px' });
  return observer;
}

/**
 * 图标库所有缩略图共用一个 IntersectionObserver。
 * 最后一个订阅者离开时立即 disconnect，避免每个图标各自持有 observer / callback 队列。
 */
export function observeVectorThumbnail(element: Element, callback: VisibilityCallback): () => void {
  const sharedObserver = getObserver();
  if (!sharedObserver) {
    callback(true);
    return () => undefined;
  }
  callbacks.set(element, callback);
  sharedObserver.observe(element);
  return () => {
    sharedObserver.unobserve(element);
    callbacks.delete(element);
    if (callbacks.size === 0) {
      sharedObserver.disconnect();
      observer = null;
    }
  };
}
