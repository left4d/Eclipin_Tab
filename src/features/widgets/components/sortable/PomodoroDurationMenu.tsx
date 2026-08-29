import { createPortal } from 'react-dom';
import type { CSSProperties } from 'react';
import styles from './PomodoroDurationMenu.module.css';

interface PomodoroDurationMenuProps {
  open: boolean;
  title: string;
  value: number;
  presets: number[];
  style: CSSProperties;
  onClose: () => void;
  onAdjust: (delta: number) => void;
  onSelect: (value: number) => void;
}

export const PomodoroDurationMenu = ({
  open,
  title,
  value,
  presets,
  style,
  onClose,
  onAdjust,
  onSelect,
}: PomodoroDurationMenuProps) => {
  if (!open) return null;

  return createPortal(
    <>
      <div className={styles.clickAway} onPointerDown={onClose} />
      <div
        className={styles.menu}
        style={style}
        role="dialog"
        aria-label={title}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <div className={styles.title}>{title}</div>
        <div className={styles.controls}>
          <button type="button" onClick={() => onAdjust(-1)} aria-label="减少 1 分钟">−</button>
          <strong>{value}</strong>
          <button type="button" onClick={() => onAdjust(1)} aria-label="增加 1 分钟">+</button>
        </div>
        <div className={styles.presets}>
          {presets.map((preset) => (
            <button type="button" key={preset} onClick={() => onSelect(preset)} aria-label={`设置为 ${preset} 分钟`}>
              {preset}
            </button>
          ))}
        </div>
      </div>
    </>,
    document.body,
  );
};
