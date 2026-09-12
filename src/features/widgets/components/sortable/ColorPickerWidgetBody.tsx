import { useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react';
import { createPortal } from 'react-dom';
import { colord } from 'colord';
import type { WidgetLayout } from '../../types/widget';
import styles from '../WidgetPanel.module.css';

type ColorFormat = 'hex' | 'rgb' | 'hsl';

const PALETTE = [
  '#1C1C1E', '#FFFFFF', '#FF3B30', '#FF9500', '#FFD60A', '#34C759', '#0A84FF', '#AF52DE', '#FF2D55', '#64748B',
] as const;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const formatColor = (value: string, format: ColorFormat) => {
  const color = colord(value);
  if (!color.isValid()) return value;
  if (format === 'rgb') return color.toRgbString();
  if (format === 'hsl') return color.toHslString();
  return color.toHex().toUpperCase();
};

/** 0-255 rgb -> { h: 0-360, s: 0-100, v: 0-100 } */
function rgbToHsv(r: number, g: number, b: number): { h: number; s: number; v: number } {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn), delta = max - min;
  let h = 0;
  if (delta) {
    if (max === rn) h = 60 * (((gn - bn) / delta) % 6);
    else if (max === gn) h = 60 * ((bn - rn) / delta + 2);
    else h = 60 * ((rn - gn) / delta + 4);
  }
  if (h < 0) h += 360;
  return { h, s: max === 0 ? 0 : (delta / max) * 100, v: max * 100 };
}

/** { h: 0-360, s: 0-100, v: 0-100 } -> 0-255 rgb */
function hsvToRgb(h: number, s: number, v: number): { r: number; g: number; b: number } {
  const sn = s / 100, vn = v / 100;
  const c = vn * sn;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = vn - c;
  let rgb: [number, number, number];
  if (h < 60) rgb = [c, x, 0];
  else if (h < 120) rgb = [x, c, 0];
  else if (h < 180) rgb = [0, c, x];
  else if (h < 240) rgb = [0, x, c];
  else if (h < 300) rgb = [x, 0, c];
  else rgb = [c, 0, x];
  return { r: Math.round((rgb[0] + m) * 255), g: Math.round((rgb[1] + m) * 255), b: Math.round((rgb[2] + m) * 255) };
}

const svColorToHex = (h: number, s: number, v: number) => {
  const { r, g, b } = hsvToRgb(h, s, v);
  return colord({ r, g, b }).toHex().toUpperCase();
};

/**
 * 自研 SV + Hue 取色面板，替代原生 <input type="color">（避免 Windows 默认取色器）。
 * 通过 portal 渲染到 document.body，因此不会被小组件容器的 overflow:hidden 裁剪。
 */
function ColorPickerPopover({ color, onChange, onClose, style }: {
  color: string;
  onChange: (hex: string) => void;
  onClose: () => void;
  style?: CSSProperties;
}) {
  const initialColor = color && colord(color).isValid() ? color : '#0A84FF';
  const initialRgb = colord(initialColor).toRgb();
  const [hsv, setHsv] = useState(() => rgbToHsv(initialRgb.r, initialRgb.g, initialRgb.b));
  const hsvRef = useRef(hsv);
  const lastEmittedRef = useRef(initialColor);
  const svRef = useRef<HTMLDivElement>(null);
  const hueRef = useRef<HTMLDivElement>(null);

  useEffect(() => { hsvRef.current = hsv; }, [hsv]);
  // 颜色来自外部（如色板/文本输入）且不是本面板拖拽产生的，才重置 HSV，避免拖拽被打断。
  useEffect(() => {
    if (color !== lastEmittedRef.current) {
      const next = colord(color);
      if (next.isValid()) {
        const toRgb = next.toRgb();
        setHsv(rgbToHsv(toRgb.r, toRgb.g, toRgb.b));
      }
      lastEmittedRef.current = color;
    }
  }, [color]);

  const emit = (next: { h: number; s: number; v: number }) => {
    lastEmittedRef.current = svColorToHex(next.h, next.s, next.v);
    onChange(lastEmittedRef.current);
  };

  const updateFromSv = (clientX: number, clientY: number) => {
    const rect = svRef.current?.getBoundingClientRect();
    if (!rect) return;
    const s = clamp((clientX - rect.left) / rect.width, 0, 1) * 100;
    const v = (1 - clamp((clientY - rect.top) / rect.height, 0, 1)) * 100;
    const next = { ...hsvRef.current, s, v };
    setHsv(next);
    emit(next);
  };

  const updateFromHue = (clientX: number) => {
    const rect = hueRef.current?.getBoundingClientRect();
    if (!rect) return;
    const h = clamp((clientX - rect.left) / rect.width, 0, 1) * 360;
    const next = { ...hsvRef.current, h };
    setHsv(next);
    emit(next);
  };

  return (
    <div className={styles.colorPickerPopover} style={style} role="dialog" aria-label="颜色选择器">
      <div
        ref={svRef}
        className={styles.colorPickerSv}
        style={{ backgroundColor: `hsl(${hsv.h} 100% 50%)` }}
        onPointerDown={(event) => {
          event.preventDefault();
          event.stopPropagation();
          event.currentTarget.setPointerCapture(event.pointerId);
          updateFromSv(event.clientX, event.clientY);
        }}
        onPointerMove={(event) => { if (event.currentTarget.hasPointerCapture(event.pointerId)) updateFromSv(event.clientX, event.clientY); }}
        onPointerUp={(event) => { event.currentTarget.releasePointerCapture(event.pointerId); }}
      >
        <span className={styles.colorPickerThumb} style={{ left: `${hsv.s}%`, top: `${100 - hsv.v}%` }} />
      </div>
      <div
        ref={hueRef}
        className={styles.colorPickerHue}
        onPointerDown={(event) => {
          event.preventDefault();
          event.stopPropagation();
          event.currentTarget.setPointerCapture(event.pointerId);
          updateFromHue(event.clientX);
        }}
        onPointerMove={(event) => { if (event.currentTarget.hasPointerCapture(event.pointerId)) updateFromHue(event.clientX); }}
        onPointerUp={(event) => { event.currentTarget.releasePointerCapture(event.pointerId); }}
      >
        <span className={styles.colorPickerHueThumb} style={{ left: `${(hsv.h / 360) * 100}%` }} />
      </div>
      <div className={styles.colorPickerPopoverFooter}>
        <span className={styles.colorPickerPopoverSwatch} style={{ background: color }} />
        <code className={styles.colorPickerPopoverValue}>{formatColor(color, 'hex')}</code>
        <button type="button" className="btn btn--sm" onClick={onClose}>完成</button>
      </div>
    </div>
  );
}

export const ColorPickerWidgetBody = ({ widget, onUpdate, startDrag }: {
  widget: WidgetLayout;
  onUpdate: (id: string, updates: Partial<WidgetLayout>) => void;
  startDrag: (event: ReactPointerEvent<HTMLElement>) => void;
}) => {
  const [color, setColor] = useState(widget.colorValue ?? '#0A84FF');
  const [input, setInput] = useState(widget.colorValue ?? '#0A84FF');
  const [format, setFormat] = useState<ColorFormat>('hex');
  const [pickerAnchor, setPickerAnchor] = useState<DOMRect | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const output = useMemo(() => formatColor(color, format), [color, format]);

  const selectColor = (next: string) => {
    const parsed = colord(next);
    if (!parsed.isValid()) return;
    const normalized = parsed.toHex().toUpperCase();
    setColor(normalized);
    setInput(normalized);
    onUpdate(widget.id, { colorValue: normalized });
  };

  const commitInput = () => {
    if (colord(input).isValid()) selectColor(input);
    else setInput(output);
  };

  const copyColor = async () => {
    try { await navigator.clipboard.writeText(output); } catch { /* clipboard may be unavailable */ }
  };

  const openPicker = (event: ReactPointerEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (pickerAnchor) { setPickerAnchor(null); return; }
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) setPickerAnchor(rect);
  };

  // 点击面板外部 / Escape 关闭弹出层。
  useEffect(() => {
    if (!pickerAnchor) return;
    const onPointerDown = (event: globalThis.PointerEvent) => {
      const target = event.target as HTMLElement;
      if (target.closest(`.${styles.colorPickerPopover}`) || target.closest(`.${styles.colorPickerCurrentBtn}`)) return;
      setPickerAnchor(null);
    };
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') setPickerAnchor(null); };
    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('keydown', onKeyDown);
    return () => { window.removeEventListener('pointerdown', onPointerDown); window.removeEventListener('keydown', onKeyDown); };
  }, [pickerAnchor]);

  // 弹出层定位：贴近触发按钮且不超出视口。
  const pickerStyle = useMemo(() => {
    if (!pickerAnchor) return undefined;
    const width = 248, height = 224, margin = 8;
    let left = pickerAnchor.right + 8;
    if (left + width > window.innerWidth - margin) left = pickerAnchor.left - width - 8;
    if (left < margin) left = clamp(pickerAnchor.left, margin, window.innerWidth - width - margin);
    let top = pickerAnchor.bottom + 8;
    if (top + height > window.innerHeight - margin) top = Math.max(margin, pickerAnchor.top - height - 8);
    return { left, top } as CSSProperties;
  }, [pickerAnchor]);

  return (
    <div className={styles.colorPickerBody} onPointerDown={startDrag}>
      <div className={styles.colorPickerSwatches}>
        {/* 首个颜色按钮：中间一横线显示当前颜色，点击打开精确取色器 */}
        <button
          ref={triggerRef}
          type="button"
          className={styles.colorPickerCurrentBtn}
          title="选择颜色"
          aria-label={`当前颜色 ${output}`}
          onPointerDown={openPicker}
        >
          <span className={styles.colorPickerCurrentLine} style={{ background: color }} aria-hidden="true" />
        </button>
        {PALETTE.map((preset) => (
          <button
            key={preset}
            type="button"
            aria-label={`选择颜色 ${preset}`}
            className={styles.colorPickerSwatch}
            style={{ background: preset }}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={() => selectColor(preset)}
          />
        ))}
      </div>
      <div className={styles.colorPickerValueRow}>
        <input className="field" aria-label="颜色值" value={input} onChange={(event) => setInput(event.target.value)} onBlur={commitInput} onKeyDown={(event) => { if (event.key === 'Enter') commitInput(); }} onPointerDown={(event) => event.stopPropagation()} />
        <select className="field" aria-label="输出格式" value={format} onChange={(event) => setFormat(event.target.value as ColorFormat)} onPointerDown={(event) => event.stopPropagation()}>
          <option value="hex">HEX</option>
          <option value="rgb">RGB</option>
          <option value="hsl">HSL</option>
        </select>
        <button type="button" className="btn btn--sm" title={`复制 ${output}`} onPointerDown={(event) => event.stopPropagation()} onClick={copyColor}>复制</button>
      </div>
      {pickerAnchor && createPortal(<ColorPickerPopover color={color} onChange={selectColor} onClose={() => setPickerAnchor(null)} style={pickerStyle} />, document.body, 'color-picker-popover')}
    </div>
  );
};
