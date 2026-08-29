import { type RefObject, useEffect } from 'react';

interface DismissableLayerOptions {
  open: boolean;
  ref: RefObject<HTMLElement>;
  onDismiss: () => void;
  closeOnEscape?: boolean;
  ignore?: (target: Element) => boolean;
}

/**
 * 统一小型浮层的关闭行为：按 Esc、点击浮层外部，或把焦点移到浮层外部时关闭。
 */
export const useDismissableLayer = ({
  open,
  ref,
  onDismiss,
  closeOnEscape = true,
  ignore,
}: DismissableLayerOptions) => {
  useEffect(() => {
    if (!open) return;

    const isOutside = (target: EventTarget | null) => {
      if (!(target instanceof Element)) return false;
      if (ignore?.(target)) return false;
      return !ref.current?.contains(target);
    };

    const handlePointerDown = (event: PointerEvent) => {
      if (event.button === 2 || !isOutside(event.target)) return;
      onDismiss();
    };

    const handleFocusIn = (event: FocusEvent) => {
      if (isOutside(event.target)) onDismiss();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!closeOnEscape || event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      onDismiss();
    };

    document.addEventListener('pointerdown', handlePointerDown, true);
    document.addEventListener('focusin', handleFocusIn, true);
    document.addEventListener('keydown', handleKeyDown, true);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true);
      document.removeEventListener('focusin', handleFocusIn, true);
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [closeOnEscape, ignore, onDismiss, open, ref]);
};
