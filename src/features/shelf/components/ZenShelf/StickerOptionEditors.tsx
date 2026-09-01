import { createPortal } from 'react-dom';
import type { Dispatch, SetStateAction } from 'react';
import type { Sticker } from '@/shared/types';
import { FontPicker } from '@/shared/components/FontPicker/FontPicker';
import type { FontId } from '@/shared/constants/builtInFonts';
import {
  STICKER_PRIORITY_MAX,
  STICKER_PRIORITY_MIN,
  normalizeStickerRotation,
} from '../../utils/zenShelfUtils';
import { STICKER_CORNER_RADIUS_MAX } from '@/features/shelf/utils/stickerAppearance';
import styles from './ZenShelf.module.css';

export interface StickerEditorAnchor {
  stickerId: string;
  x: number;
  y: number;
}

interface StickerOptionEditorsProps {
  stickers: Sticker[];
  fontEditor: StickerEditorAnchor | null;
  setFontEditor: Dispatch<SetStateAction<StickerEditorAnchor | null>>;
  changeStickerFont: (stickerId: string, fontFamily: FontId) => void;
  rotationEditor: StickerEditorAnchor | null;
  setRotationEditor: Dispatch<SetStateAction<StickerEditorAnchor | null>>;
  rotationDraft: number;
  rotationInputDraft: string;
  setRotationInputDraft: Dispatch<SetStateAction<string>>;
  updateStickerRotation: (value: number) => void;
  priorityEditor: StickerEditorAnchor | null;
  setPriorityEditor: Dispatch<SetStateAction<StickerEditorAnchor | null>>;
  priorityDraft: string;
  setPriorityDraft: Dispatch<SetStateAction<string>>;
  saveStickerPriority: () => void;
  strokeEditor: StickerEditorAnchor | null;
  setStrokeEditor: Dispatch<SetStateAction<StickerEditorAnchor | null>>;
  strokeDraft: number;
  strokeInputDraft: string;
  setStrokeInputDraft: Dispatch<SetStateAction<string>>;
  updateStickerStrokeWidth: (value: number) => void;
  cornerRadiusEditor: StickerEditorAnchor | null;
  setCornerRadiusEditor: Dispatch<SetStateAction<StickerEditorAnchor | null>>;
  cornerRadiusDraft: number;
  cornerRadiusInputDraft: string;
  setCornerRadiusInputDraft: Dispatch<SetStateAction<string>>;
  updateStickerCornerRadius: (value: number) => void;
}

export const StickerOptionEditors = ({
  stickers,
  fontEditor,
  setFontEditor,
  changeStickerFont,
  rotationEditor,
  setRotationEditor,
  rotationDraft,
  rotationInputDraft,
  setRotationInputDraft,
  updateStickerRotation,
  priorityEditor,
  setPriorityEditor,
  priorityDraft,
  setPriorityDraft,
  saveStickerPriority,
  strokeEditor,
  setStrokeEditor,
  strokeDraft,
  strokeInputDraft,
  setStrokeInputDraft,
  updateStickerStrokeWidth,
  cornerRadiusEditor,
  setCornerRadiusEditor,
  cornerRadiusDraft,
  cornerRadiusInputDraft,
  setCornerRadiusInputDraft,
  updateStickerCornerRadius,
}: StickerOptionEditorsProps) => (
  <>
    {fontEditor && (() => {
      const sticker = stickers.find((item) => item.id === fontEditor.stickerId);
      if (!sticker || sticker.type !== 'text') return null;
      return createPortal(
        <div
          className={styles.stickerOptionEditorClickAway}
          onMouseDown={() => setFontEditor(null)}
          onDoubleClick={(event) => event.stopPropagation()}
        >
          <div
            className={styles.stickerFontEditor}
            style={{
              left: fontEditor.x + 326 <= window.innerWidth
                ? fontEditor.x
                : Math.max(12, fontEditor.x - 310),
              top: Math.min(Math.max(12, fontEditor.y - 90), Math.max(12, window.innerHeight - 520)),
            }}
            onMouseDown={(event) => event.stopPropagation()}
            onDoubleClick={(event) => event.stopPropagation()}
          >
            <div className={styles.stickerOptionEditorTitle}>切换字体</div>
            <p>选择后会立即应用，并随贴纸一起保存。</p>
            <FontPicker
              value={sticker.style?.fontFamily}
              previewText="贴纸字体预览 12:34"
              onChange={(fontId) => changeStickerFont(sticker.id, fontId)}
            />
          </div>
        </div>,
        document.body,
      );
    })()}

    {rotationEditor && createPortal(
      <div
        className={styles.stickerOptionEditorClickAway}
        onMouseDown={() => setRotationEditor(null)}
        onDoubleClick={(event) => event.stopPropagation()}
      >
        <div
          className={styles.stickerRotationEditor}
          style={{
            left: rotationEditor.x + 336 <= window.innerWidth
              ? rotationEditor.x
              : Math.max(12, rotationEditor.x - 320),
            top: Math.min(Math.max(12, rotationEditor.y - 90), Math.max(12, window.innerHeight - 250)),
          }}
          onMouseDown={(event) => event.stopPropagation()}
          onDoubleClick={(event) => event.stopPropagation()}
        >
          <div className={styles.stickerOptionEditorTitle}>旋转贴纸</div>
          <p>拖动滑杆或输入角度，修改会立即保存。</p>
          <div className={styles.stickerRotationValueRow}>
            <input
              type="range" className="range"
              min={-180}
              max={180}
              step={1}
              value={rotationDraft}
              onChange={(event) => updateStickerRotation(Number(event.target.value))}
            />
            <label className="field-shell">
              <input
                className="field-shell__input"
                type="number"
                min={-180}
                max={180}
                step={1}
                value={rotationInputDraft}
                onChange={(event) => {
                  const nextValue = event.target.value;
                  setRotationInputDraft(nextValue);
                  if (nextValue.trim() === '') return;
                  const parsed = Number(nextValue);
                  if (Number.isFinite(parsed)) updateStickerRotation(normalizeStickerRotation(parsed));
                }}
                onBlur={() => setRotationInputDraft(String(rotationDraft))}
                onKeyDown={(event) => {
                  if (event.key === 'Escape') setRotationEditor(null);
                  if (event.key === 'Enter') {
                    setRotationInputDraft(String(rotationDraft));
                    event.currentTarget.blur();
                  }
                }}
              />
              <span>°</span>
            </label>
          </div>
          <div className={styles.stickerRotationActions}>
            <button type="button" onClick={() => updateStickerRotation(rotationDraft - 15)}>−15°</button>
            <button type="button" onClick={() => updateStickerRotation(0)}>归零</button>
            <button type="button" onClick={() => updateStickerRotation(rotationDraft + 15)}>+15°</button>
            <button type="button" className={styles.stickerRotationDoneButton} onClick={() => setRotationEditor(null)}>完成</button>
          </div>
        </div>
      </div>,
      document.body,
    )}

    {priorityEditor && createPortal(
      <div
        className={styles.stickerPriorityEditorClickAway}
        onMouseDown={() => setPriorityEditor(null)}
        onDoubleClick={(event) => event.stopPropagation()}
      >
        <form
          className={styles.stickerPriorityEditor}
          style={{
            left: priorityEditor.x + 296 <= window.innerWidth
              ? priorityEditor.x
              : Math.max(12, priorityEditor.x - 280),
            top: Math.min(Math.max(12, priorityEditor.y - 82), Math.max(12, window.innerHeight - 204)),
          }}
          onMouseDown={(event) => event.stopPropagation()}
          onDoubleClick={(event) => event.stopPropagation()}
          onSubmit={(event) => {
            event.preventDefault();
            saveStickerPriority();
          }}
        >
          <div className={styles.stickerPriorityEditorTitle}>设置贴纸优先级</div>
          <p>贴纸重叠时，数字更大的贴纸显示在上方。相同数字仍按最近点击顺序排列。</p>
          <label className={styles.stickerPriorityInputRow}>
            <span>优先级</span>
            <input
              className="field"
              autoFocus
              type="number"
              min={STICKER_PRIORITY_MIN}
              max={STICKER_PRIORITY_MAX}
              step={1}
              inputMode="numeric"
              value={priorityDraft}
              onChange={(event) => setPriorityDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Escape') setPriorityEditor(null);
              }}
            />
          </label>
          <div className={styles.stickerPriorityEditorActions}>
            <button type="button" className="btn" onClick={() => setPriorityEditor(null)}>取消</button>
            <button type="submit" className="btn btn--primary">保存</button>
          </div>
        </form>
      </div>,
      document.body,
    )}


    {strokeEditor && createPortal(
      <div
        className={styles.stickerOptionEditorClickAway}
        onMouseDown={() => setStrokeEditor(null)}
        onDoubleClick={(event) => event.stopPropagation()}
      >
        <div
          className={styles.stickerRotationEditor}
          style={{
            left: strokeEditor.x + 336 <= window.innerWidth
              ? strokeEditor.x
              : Math.max(12, strokeEditor.x - 320),
            top: Math.min(Math.max(12, strokeEditor.y - 90), Math.max(12, window.innerHeight - 250)),
          }}
          onMouseDown={(event) => event.stopPropagation()}
          onDoubleClick={(event) => event.stopPropagation()}
        >
          <div className={styles.stickerOptionEditorTitle}>描边边距</div>
          <p>控制描边向外扩展的视觉像素。贴纸放大或缩小时，这个边距保持不变，不再跟随尺寸一起变粗。</p>
          <div className={styles.stickerRotationValueRow}>
            <input
              type="range" className="range"
              min={1}
              max={20}
              step={1}
              value={strokeDraft}
              onChange={(event) => updateStickerStrokeWidth(Number(event.target.value))}
            />
            <label className="field-shell">
              <input
                className="field-shell__input"
                autoFocus
                type="number"
                min={1}
                max={20}
                step={1}
                value={strokeInputDraft}
                onChange={(event) => {
                  const nextValue = event.target.value;
                  setStrokeInputDraft(nextValue);
                  if (nextValue.trim() === '') return;
                  const parsed = Number(nextValue);
                  if (Number.isFinite(parsed)) updateStickerStrokeWidth(parsed);
                }}
                onBlur={() => setStrokeInputDraft(String(strokeDraft))}
                onKeyDown={(event) => {
                  if (event.key === 'Escape') setStrokeEditor(null);
                  if (event.key === 'Enter') {
                    setStrokeInputDraft(String(strokeDraft));
                    event.currentTarget.blur();
                  }
                }}
              />
              <span>px</span>
            </label>
          </div>
          <div className={styles.stickerRotationActions}>
            <button type="button" onClick={() => updateStickerStrokeWidth(3)}>3px</button>
            <button type="button" onClick={() => updateStickerStrokeWidth(6)}>6px</button>
            <button type="button" onClick={() => updateStickerStrokeWidth(10)}>10px</button>
            <button type="button" className={styles.stickerRotationDoneButton} onClick={() => setStrokeEditor(null)}>完成</button>
          </div>
        </div>
      </div>,
      document.body,
    )}

    {cornerRadiusEditor && createPortal(
      <div
        className={styles.stickerOptionEditorClickAway}
        onMouseDown={() => setCornerRadiusEditor(null)}
        onDoubleClick={(event) => event.stopPropagation()}
      >
        <div
          className={styles.stickerRotationEditor}
          style={{
            left: cornerRadiusEditor.x + 336 <= window.innerWidth
              ? cornerRadiusEditor.x
              : Math.max(12, cornerRadiusEditor.x - 320),
            top: Math.min(Math.max(12, cornerRadiusEditor.y - 90), Math.max(12, window.innerHeight - 250)),
          }}
          onMouseDown={(event) => event.stopPropagation()}
          onDoubleClick={(event) => event.stopPropagation()}
        >
          <div className={styles.stickerOptionEditorTitle}>图片贴纸圆角</div>
          <p>控制图片边角的视觉半径。和描边一样，贴纸放大或缩小时圆角不会跟着变粗。</p>
          <div className={styles.stickerRotationValueRow}>
            <input
              type="range" className="range"
              min={0}
              max={STICKER_CORNER_RADIUS_MAX}
              step={1}
              value={cornerRadiusDraft}
              onChange={(event) => updateStickerCornerRadius(Number(event.target.value))}
            />
            <label className="field-shell">
              <input
                className="field-shell__input"
                autoFocus
                type="number"
                min={0}
                max={STICKER_CORNER_RADIUS_MAX}
                step={1}
                value={cornerRadiusInputDraft}
                onChange={(event) => {
                  const nextValue = event.target.value;
                  setCornerRadiusInputDraft(nextValue);
                  if (nextValue.trim() === '') return;
                  const parsed = Number(nextValue);
                  if (Number.isFinite(parsed)) updateStickerCornerRadius(parsed);
                }}
                onBlur={() => setCornerRadiusInputDraft(String(cornerRadiusDraft))}
                onKeyDown={(event) => {
                  if (event.key === 'Escape') setCornerRadiusEditor(null);
                  if (event.key === 'Enter') {
                    setCornerRadiusInputDraft(String(cornerRadiusDraft));
                    event.currentTarget.blur();
                  }
                }}
              />
              <span>px</span>
            </label>
          </div>
          <div className={styles.stickerRotationActions}>
            <button type="button" onClick={() => updateStickerCornerRadius(0)}>0px</button>
            <button type="button" onClick={() => updateStickerCornerRadius(12)}>12px</button>
            <button type="button" onClick={() => updateStickerCornerRadius(24)}>24px</button>
            <button type="button" className={styles.stickerRotationDoneButton} onClick={() => setCornerRadiusEditor(null)}>完成</button>
          </div>
        </div>
      </div>,
      document.body,
    )}
  </>
);
