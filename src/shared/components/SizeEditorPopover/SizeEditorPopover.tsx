import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  copyElementSize,
  normalizeElementSize,
  type ElementSize,
} from '@/shared/utils/elementSizeClipboard';
import styles from './SizeEditorPopover.module.css';

interface SizeEditorPopoverProps {
  anchorRect: DOMRect;
  width: number;
  height: number;
  lockAspectRatio: boolean;
  lockAspectRatioDisabled?: boolean;
  title?: string;
  onClose: () => void;
  onApply: (size: ElementSize, lockAspectRatio: boolean) => void;
}

const parsePositiveNumber = (value: string): number | null => {
  if (value.trim() === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

export const SizeEditorPopover = ({
  anchorRect,
  width,
  height,
  lockAspectRatio,
  lockAspectRatioDisabled = false,
  title = '尺寸',
  onClose,
  onApply,
}: SizeEditorPopoverProps) => {
  const initialSize = useMemo(() => normalizeElementSize({ width, height }), [height, width]);
  const initialAspectRatio = initialSize.width / Math.max(1, initialSize.height);
  const [widthDraft, setWidthDraft] = useState(String(initialSize.width));
  const [heightDraft, setHeightDraft] = useState(String(initialSize.height));
  const [locked, setLocked] = useState(lockAspectRatioDisabled ? true : lockAspectRatio);
  const [copied, setCopied] = useState(false);

  const parsedWidth = parsePositiveNumber(widthDraft);
  const parsedHeight = parsePositiveNumber(heightDraft);
  const canApply = parsedWidth !== null && parsedHeight !== null;
  const editorWidth = 324;
  const editorHeight = 198;
  const gap = 14;
  const left = anchorRect.right + gap + editorWidth <= window.innerWidth
    ? anchorRect.right + gap
    : Math.max(12, anchorRect.left - editorWidth - gap);
  const top = Math.min(
    Math.max(12, anchorRect.top + anchorRect.height / 2 - editorHeight / 2),
    Math.max(12, window.innerHeight - editorHeight - 12),
  );

  const updateWidth = (next: string) => {
    setWidthDraft(next);
    setCopied(false);
    if (!locked) return;
    const value = parsePositiveNumber(next);
    if (value !== null) setHeightDraft(String(Math.max(1, Math.round(value / initialAspectRatio))));
  };

  const updateHeight = (next: string) => {
    setHeightDraft(next);
    setCopied(false);
    if (!locked) return;
    const value = parsePositiveNumber(next);
    if (value !== null) setWidthDraft(String(Math.max(1, Math.round(value * initialAspectRatio))));
  };

  const handleLockChange = (nextLocked: boolean) => {
    if (lockAspectRatioDisabled) return;
    setLocked(nextLocked);
    setCopied(false);
    if (!nextLocked) return;
    const currentWidth = parsePositiveNumber(widthDraft);
    if (currentWidth !== null) {
      setHeightDraft(String(Math.max(1, Math.round(currentWidth / initialAspectRatio))));
    }
  };

  const readDraftSize = (): ElementSize | null => {
    const nextWidth = parsePositiveNumber(widthDraft);
    const nextHeight = parsePositiveNumber(heightDraft);
    if (nextWidth === null || nextHeight === null) return null;
    return normalizeElementSize({ width: nextWidth, height: nextHeight });
  };

  return createPortal(
    <div
      className={styles.clickAway}
      onMouseDown={onClose}
      onDoubleClick={(event) => event.stopPropagation()}
    >
      <form
        className={styles.editor}
        style={{ left, top }}
        onMouseDown={(event) => event.stopPropagation()}
        onDoubleClick={(event) => event.stopPropagation()}
        onSubmit={(event) => {
          event.preventDefault();
          const size = readDraftSize();
          if (!size) return;
          onApply(size, lockAspectRatioDisabled ? true : locked);
          onClose();
        }}
      >
        <div className={styles.title}>{title}</div>
        <div className={styles.sizeRow}>
          <label>
            <span>W</span>
            <input
              className="field"
              autoFocus
              type="number"
              min="1"
              max="10000"
              step="1"
              inputMode="numeric"
              value={widthDraft}
              onChange={(event) => updateWidth(event.target.value)}
              onKeyDown={(event) => { if (event.key === 'Escape') onClose(); }}
            />
          </label>
          <span className={styles.multiply}>×</span>
          <label>
            <span>H</span>
            <input
              className="field"
              type="number"
              min="1"
              max="10000"
              step="1"
              inputMode="numeric"
              value={heightDraft}
              onChange={(event) => updateHeight(event.target.value)}
              onKeyDown={(event) => { if (event.key === 'Escape') onClose(); }}
            />
          </label>
        </div>
        <label className={`${styles.lockRow} ${lockAspectRatioDisabled ? styles.lockDisabled : ''}`}>
          <input
            type="checkbox"
            checked={lockAspectRatioDisabled ? true : locked}
            disabled={lockAspectRatioDisabled}
            onChange={(event) => handleLockChange(event.target.checked)}
          />
          <span>固定比例{lockAspectRatioDisabled ? '（贴纸）' : ''}</span>
        </label>
        <div className={styles.actions}>
          <button
            type="button"
            onClick={() => {
              const size = readDraftSize();
              if (!size) return;
              copyElementSize(size);
              setCopied(true);
            }}
            disabled={!canApply}
          >
            {copied ? '已复制' : '复制尺寸'}
          </button>
          <button type="submit" className={styles.applyButton} disabled={!canApply}>应用</button>
        </div>
      </form>
    </div>,
    document.body,
  );
};
