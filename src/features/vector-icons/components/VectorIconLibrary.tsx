import type { DragEvent } from 'react';
import type { VectorIconMeta } from '../types/vectorIcon';
import { LazySvgThumbnail } from './LazySvgThumbnail';
import styles from './VectorIconStudio.module.css';

interface VectorIconLibraryProps {
  icons: VectorIconMeta[];
  selectedId: string | null;
  loading: boolean;
  onSelect: (id: string) => void;
  onAddToCanvas: (id: string) => void;
  onDelete: (id: string) => void;
}

export const VectorIconLibrary = ({
  icons, selectedId, loading, onSelect, onAddToCanvas, onDelete,
}: VectorIconLibraryProps) => {
  const handleDragStart = (event: DragEvent<HTMLDivElement>, id: string) => {
    event.dataTransfer.effectAllowed = 'copy';
    event.dataTransfer.setData('application/x-eclipin-vector-icon', id);
  };

  if (loading) return <div className={styles.libraryEmpty}>正在读取图标库…</div>;
  if (icons.length === 0) {
    return <div className={styles.libraryEmpty}><strong>还没有保存的图标</strong><span>从 SVG 文件或代码导入一个，或者在画布中拼接后保存。</span></div>;
  }

  return (
    <div className={styles.libraryGrid}>
      {icons.map(icon => (
        <div
          key={icon.id}
          className={`${styles.libraryItem} ${selectedId === icon.id ? styles.libraryItemActive : ''}`}
          draggable
          onDragStart={event => handleDragStart(event, icon.id)}
        >
          <button type="button" className={styles.libraryPreviewButton} onClick={() => onSelect(icon.id)} title={`编辑 ${icon.name}`}>
            <LazySvgThumbnail iconId={icon.id} className={styles.libraryPreview} />
            <span className={styles.libraryName}>{icon.name}</span>
          </button>
          <div className={styles.libraryActions}>
            <button type="button" onClick={() => onAddToCanvas(icon.id)} title="加入画布">＋</button>
            <button type="button" onClick={() => onDelete(icon.id)} title="删除">×</button>
          </div>
        </div>
      ))}
    </div>
  );
};
