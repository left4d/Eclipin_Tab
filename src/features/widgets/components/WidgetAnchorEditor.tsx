import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { normalizeInternalAnchorId } from '@/shared/utils/internalAnchor';
import { storage } from '@/shared/utils/storage';
import { useThemeData } from '@/features/theme/context/ThemeContext';
import type { WidgetLayout } from '../types/widget';
import styles from './WidgetAnchorEditor.module.css';

interface WidgetAnchorEditorProps {
  widget: WidgetLayout;
  widgets: WidgetLayout[];
  onClose: () => void;
  onSave: (anchorId?: string) => void;
}

export const WidgetAnchorEditor = ({ widget, widgets, onClose, onSave }: WidgetAnchorEditorProps) => {
  const { pageSlideDirection } = useThemeData();
  const [draft, setDraft] = useState(widget.anchorId ?? '');
  const [error, setError] = useState('');
  const occupiedAnchors = useMemo(() => new Set([
    ...widgets
      .filter((item) => item.id !== widget.id)
      .map((item) => normalizeInternalAnchorId(item.anchorId ?? '')),
    ...storage.getStickers(pageSlideDirection).map((item) => normalizeInternalAnchorId(item.anchorId ?? '')),
  ].filter(Boolean)), [pageSlideDirection, widget.id, widgets]);

  const save = () => {
    const normalized = normalizeInternalAnchorId(draft);
    if (normalized && occupiedAnchors.has(normalized)) {
      setError(`标签 #${normalized} 已被其他贴纸或组件使用。`);
      return;
    }
    onSave(normalized || undefined);
  };

  return createPortal(
    <div className={styles.backdrop} data-page-scroll-lock="true" data-modal="true" onMouseDown={onClose}>
      <section className={styles.modal} role="dialog" aria-modal="true" aria-label="组件内部标签" onMouseDown={(event) => event.stopPropagation()}>
        <header className={styles.header}>
          <div>
            <h2>组件标签 ID</h2>
            <p>设置后，任意贴纸都可以使用 <b>#{normalizeInternalAnchorId(draft) || '标签'}</b> 跳转到这个组件。</p>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="关闭">×</button>
        </header>
        <label className={styles.label}>
          <span>标签 ID</span>
          <input
            className="field"
            autoFocus
            value={draft}
            onChange={(event) => { setDraft(event.target.value); setError(''); }}
            placeholder="例如：weather-main"
            onKeyDown={(event) => {
              if (event.key === 'Escape') onClose();
              if (event.key === 'Enter') save();
            }}
          />
        </label>
        <p className={styles.help}>支持 <b>weather-main</b>、<b>#weather-main</b> 或 <b>&lt;span id="weather-main"&gt;</b>。</p>
        {error && <div className={styles.error}>{error}</div>}
        <div className={styles.actions}>
          <button type="button" className={`btn btn--danger ${styles.clear}`} onClick={() => onSave(undefined)}>清除标签</button>
          <button type="button" className="btn" onClick={onClose}>取消</button>
          <button type="button" className={`btn btn--primary ${styles.primary}`} onClick={save}>保存</button>
        </div>
      </section>
    </div>,
    document.body,
  );
};
