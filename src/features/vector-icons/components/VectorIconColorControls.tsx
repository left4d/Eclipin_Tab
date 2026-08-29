import type { CSSProperties } from 'react';
import styles from './VectorIconPickerPage.module.css';

const PRESET_COLORS = [
  '#1C1C1E',
  '#FFFFFF',
  '#FF3B30',
  '#FF9500',
  '#34C759',
  '#0A84FF',
  '#AF52DE',
] as const;

interface VectorIconColorControlsProps {
  color: string | null;
  disabled?: boolean;
  onChange: (color: string | null) => void;
}

export const VectorIconColorControls = ({ color, disabled, onChange }: VectorIconColorControlsProps) => (
  <div className={styles.colorSection}>
    <div className={styles.colorHeading}>
      <span>图标颜色</span>
      <small>{color ?? '保留原色'}</small>
    </div>
    <div className={styles.colorPresets}>
      <button
        type="button"
        className={`${styles.originalColorButton} ${color === null ? styles.colorPresetActive : ''}`}
        disabled={disabled}
        onClick={() => onChange(null)}
      >
        原色
      </button>
      {PRESET_COLORS.map(preset => (
        <button
          type="button"
          key={preset}
          className={`${styles.colorPreset} ${color === preset ? styles.colorPresetActive : ''}`}
          style={{ '--vector-preset-color': preset } as CSSProperties}
          aria-label={`使用颜色 ${preset}`}
          title={preset}
          disabled={disabled}
          onClick={() => onChange(preset)}
        />
      ))}
      <label className={styles.customColor} title="自定义颜色">
        <span>＋</span>
        <input
          type="color"
          value={color ?? '#0A84FF'}
          disabled={disabled}
          onChange={event => onChange(event.target.value.toUpperCase())}
        />
      </label>
    </div>
  </div>
);
