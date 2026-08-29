import { useEffect, useState } from 'react';

/** Keep a closing surface mounted briefly so its exit animation can finish. */
export function useDelayedUnmount(isOpen: boolean, delay = 340): boolean {
  const [shouldRender, setShouldRender] = useState(isOpen);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      return;
    }

    const timer = window.setTimeout(() => setShouldRender(false), delay);
    return () => window.clearTimeout(timer);
  }, [delay, isOpen]);

  return shouldRender;
}
