import { useMemo, useState, type MouseEvent } from 'react';
import { DEFAULT_TEXT_STYLE, type Sticker } from '@/shared/types';
import { ObjectInspector, type ObjectInspectorSection } from '@/shared/components/ObjectInspector/ObjectInspector';
import { STICKER_COLOR_PRESETS, areStickerColorsEquivalent, DEFAULT_STICKER_COLOR } from '@/features/shelf/constants/colorPresets';
import { getStickerLogicalSize } from '@/features/shelf/utils/stickerSizing';
import { getStickerCornerRadius, getStickerInteractionEffect, getStickerStrokeWidth } from '@/features/shelf/utils/stickerAppearance';
import { normalizeStickerPriority, normalizeStickerRotation } from '@/features/shelf/utils/zenShelfUtils';
import styles from './ZenShelf.module.css';

interface StickerObjectInspectorProps {
  sticker: Sticker;
  onClose: () => void;
  onEditText: (sticker: Sticker) => void;
  onEditLink: (sticker: Sticker) => void;
  onEditFont: (sticker: Sticker, x: number, y: number) => void;
  onEditSize: (sticker: Sticker) => void;
  onToggleScreenFixed: (sticker: Sticker) => void;
  onDelete: (sticker: Sticker) => void;
  onUpdate: (stickerId: string, updates: Partial<Sticker>) => void;
}

const interactionOptions: Array<{ value: NonNullable<Sticker['interactionEffect']>; label: string }> = [
  { value: 'none', label: '无' },
  { value: 'lift', label: '上浮' },
  { value: 'scale', label: '缩放' },
  { value: 'button', label: '按钮' },
];

const getStickerKind = (sticker: Sticker) => sticker.type === 'text' ? '文字贴纸' : sticker.type === 'image' ? '图片贴纸' : '绘图贴纸';

const getStickerTitle = (sticker: Sticker) => {
  if (sticker.type === 'text') return sticker.content.trim().replace(/\s+/g, ' ') || '空白文字';
  if (sticker.type === 'image') return sticker.imagePresentation === 'vectorIcon' ? '矢量图标' : '图片';
  return '绘图';
};

export const StickerObjectInspector = ({
  sticker,
  onClose,
  onEditText,
  onEditLink,
  onEditFont,
  onEditSize,
  onToggleScreenFixed,
  onDelete,
  onUpdate,
}: StickerObjectInspectorProps) => {
  const [section, setSection] = useState<ObjectInspectorSection>('appearance');
  const size = getStickerLogicalSize(sticker);
  const isSvgImage = document.querySelector<HTMLElement>(`[data-sticker-id="${sticker.id}"]`)?.dataset.stickerSvg === 'true';
  const strokeWidth = getStickerStrokeWidth(sticker, isSvgImage);
  const cornerRadius = sticker.type === 'image' ? getStickerCornerRadius(sticker) : 0;
  const rotation = normalizeStickerRotation(sticker.rotation ?? 0);
  const priority = normalizeStickerPriority(sticker.priority ?? 0);
  const scalePercent = Math.round((sticker.scale ?? 1) * 100);
  const currentColor = sticker.style?.color || DEFAULT_STICKER_COLOR;
  const interactionEffect = getStickerInteractionEffect(sticker);

  const summary = useMemo(() => {
    const parts: string[] = [];
    if (size) parts.push(`${Math.round(size.width)}×${Math.round(size.height)}`);
    if (rotation) parts.push(`${rotation}°`);
    parts.push(`P${priority}`);
    if (sticker.positionMode === 'viewport') parts.push('屏幕固定');
    else if (sticker.isPinned) parts.push('已锁定');
    return parts.join(' · ');
  }, [priority, rotation, size, sticker.isPinned, sticker.positionMode]);

  const updateStyle = (updates: Partial<NonNullable<Sticker['style']>>) => {
    if (sticker.type !== 'text') return;
    onUpdate(sticker.id, { style: { ...DEFAULT_TEXT_STYLE, ...sticker.style, ...updates } });
  };

  const openFont = (event: MouseEvent<HTMLButtonElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    onEditFont(sticker, rect.left, rect.bottom + 8);
  };

  return (
    <ObjectInspector
      kind={getStickerKind(sticker)}
      title={getStickerTitle(sticker)}
      summary={summary}
      activeSection={section}
      onSectionChange={setSection}
      onClose={onClose}
      primaryActions={
        <>
          {sticker.type === 'text' && <button type="button" data-accent="true" onClick={() => onEditText(sticker)}>编辑文字</button>}
          {sticker.type !== 'drawing' && <button type="button" onClick={() => onEditLink(sticker)}>链接与标签</button>}
          <button type="button" onClick={() => onEditSize(sticker)}>尺寸</button>
          <button type="button" className={styles.objectInspectorDangerButton} onClick={() => onDelete(sticker)}>删除</button>
        </>
      }
    >
      {section === 'appearance' ? (
        <>
          {sticker.type === 'text' && (
            <>
              <div className={styles.objectInspectorRow}>
                <span>字号</span>
                <input
                  type="range"
                  min={12}
                  max={120}
                  step={1}
                  value={sticker.style?.fontSize ?? 40}
                  onChange={(event) => updateStyle({ fontSize: Number(event.target.value) })}
                />
                <strong>{sticker.style?.fontSize ?? 40}</strong>
              </div>
              <div className={styles.objectInspectorSegmented} aria-label="文字对齐">
                {(['left', 'center', 'right'] as const).map((align) => (
                  <button
                    key={align}
                    type="button"
                    className={(sticker.style?.textAlign ?? 'left') === align ? styles.objectInspectorActive : ''}
                    onClick={() => updateStyle({ textAlign: align })}
                  >
                    {align === 'left' ? '左对齐' : align === 'center' ? '居中' : '右对齐'}
                  </button>
                ))}
              </div>
              <div className={styles.objectInspectorColorRow} aria-label="文字颜色">
                {STICKER_COLOR_PRESETS.map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    title={preset.label}
                    aria-label={`文字颜色：${preset.label}`}
                    aria-pressed={areStickerColorsEquivalent(currentColor, preset.value)}
                    className={areStickerColorsEquivalent(currentColor, preset.value) ? styles.objectInspectorColorActive : ''}
                    style={{ background: preset.value }}
                    onClick={() => updateStyle({ color: preset.value })}
                  />
                ))}
                <button type="button" className={styles.objectInspectorTextButton} onClick={openFont}>字体</button>
              </div>
            </>
          )}

          <div className={styles.objectInspectorRow}>
            <span>旋转</span>
            <input
              type="range"
              min={-180}
              max={180}
              step={1}
              value={rotation}
              onChange={(event) => onUpdate(sticker.id, { rotation: normalizeStickerRotation(Number(event.target.value)) })}
            />
            <strong>{rotation}°</strong>
          </div>

          {sticker.type !== 'drawing' && (
            <div className={styles.objectInspectorRow}>
              <span>描边</span>
              <input
                type="range"
                min={1}
                max={20}
                step={1}
                disabled={Boolean(sticker.hideStroke)}
                value={strokeWidth}
                onChange={(event) => onUpdate(sticker.id, { strokeWidth: Number(event.target.value), hideStroke: false })}
              />
              <button
                type="button"
                className={`${styles.objectInspectorMiniButton} ${sticker.hideStroke ? styles.objectInspectorActive : ''}`}
                onClick={() => onUpdate(sticker.id, { hideStroke: !sticker.hideStroke })}
              >
                {sticker.hideStroke ? '已隐藏' : `${strokeWidth}px`}
              </button>
            </div>
          )}

          {sticker.type === 'image' && (
            <div className={styles.objectInspectorRow}>
              <span>圆角</span>
              <input
                type="range"
                min={0}
                max={72}
                step={1}
                value={cornerRadius}
                onChange={(event) => onUpdate(sticker.id, { cornerRadius: Number(event.target.value) })}
              />
              <strong>{cornerRadius}px</strong>
            </div>
          )}

          {sticker.type !== 'drawing' && (
            <div className={styles.objectInspectorField}>
              <span>悬停效果</span>
              <div className={styles.objectInspectorSegmented}>
                {interactionOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={interactionEffect === option.value ? styles.objectInspectorActive : ''}
                    onClick={() => onUpdate(sticker.id, { interactionEffect: option.value })}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          <div className={styles.objectInspectorRow}>
            <span>缩放</span>
            <input
              type="range"
              min={25}
              max={300}
              step={5}
              value={scalePercent}
              onChange={(event) => onUpdate(sticker.id, { scale: Number(event.target.value) / 100 })}
            />
            <strong>{scalePercent}%</strong>
          </div>
          <div className={styles.objectInspectorRow}>
            <span>优先级</span>
            <input
              className={styles.objectInspectorNumberInput}
              type="number"
              min={-999}
              max={999}
              step={1}
              value={priority}
              onChange={(event) => onUpdate(sticker.id, { priority: normalizeStickerPriority(Number(event.target.value)) })}
            />
            <span className={styles.objectInspectorHint}>越大越靠前</span>
          </div>
          <div className={styles.objectInspectorToggleGrid}>
            <button
              type="button"
              className={sticker.isPinned ? styles.objectInspectorActive : ''}
              onClick={() => onUpdate(sticker.id, { isPinned: !sticker.isPinned })}
            >
              {sticker.isPinned ? '✓ 已锁定位置' : '锁定位置'}
            </button>
            <button
              type="button"
              className={sticker.positionMode === 'viewport' ? styles.objectInspectorActive : ''}
              onClick={() => onToggleScreenFixed(sticker)}
            >
              {sticker.positionMode === 'viewport' ? '✓ 相对屏幕固定' : '相对屏幕固定'}
            </button>
          </div>
        </>
      )}
    </ObjectInspector>
  );
};
