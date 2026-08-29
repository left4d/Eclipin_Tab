import { useEffect, useMemo, useState } from 'react';
import { getVectorIcon, listVectorIconMetadata, releaseVectorIconStore } from '../services/vectorIconStore';
import type { VectorIconMeta, VectorIconRecord } from '../types/vectorIcon';
import { createRotatedVectorIconSvg, normalizeVectorRotation } from '../utils/svgIconExport';
import type { VectorIconPickerPurpose } from '../types/vectorIcon';
import { LazySvgThumbnail } from './LazySvgThumbnail';
import { VectorIconColorControls } from './VectorIconColorControls';
import styles from './VectorIconPickerPage.module.css';

interface VectorIconPickerPageProps {
  purpose?: VectorIconPickerPurpose;
  onBack: () => void;
  onChoose: (dataUrl: string, iconName: string) => void | Promise<void>;
}

export default function VectorIconPickerPage({ purpose = 'dock', onBack, onChoose }: VectorIconPickerPageProps) {
  const [icons, setIcons] = useState<VectorIconMeta[]>([]);
  const [selected, setSelected] = useState<VectorIconRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [rotation, setRotation] = useState(0);
  const [color, setColor] = useState<string | null>(null);
  const [status, setStatus] = useState('');

  useEffect(() => {
    let cancelled = false;
    void listVectorIconMetadata().then(items => {
      if (cancelled) return;
      setIcons(items);
      setLoading(false);
    });
    return () => {
      cancelled = true;
      releaseVectorIconStore();
    };
  }, []);

  const previewSvg = useMemo(() => {
    if (!selected) return '';
    try {
      return createRotatedVectorIconSvg(selected.svg, rotation, color);
    } catch {
      return '';
    }
  }, [color, rotation, selected]);

  const handleSelect = async (id: string) => {
    setStatus('');
    const record = await getVectorIcon(id);
    if (!record) {
      setStatus('图标不存在，可能已在其他页面中被删除。');
      return;
    }
    setSelected(record);
    setRotation(0);
    setColor(null);
  };

  const isSticker = purpose === 'sticker';
  const isNavigation = purpose === 'navigation';

  const handleChoose = async () => {
    if (!selected || !previewSvg) return;
    // 预览阶段直接渲染 SVG 字符串，只有确认使用时才生成体积更大的 percent-encoded data URL。
    const dataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(previewSvg)}`;
    setStatus(isSticker ? '正在添加图片贴纸…' : isNavigation ? '正在应用到导航栏…' : '正在应用 SVG…');
    try {
      await onChoose(dataUrl, selected.name);
    } catch (error) {
      setStatus(error instanceof Error ? `添加失败：${error.message}` : '添加 SVG 失败。');
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button type="button" className={styles.backButton} onClick={onBack} aria-label={isSticker ? '返回贴纸画布' : isNavigation ? '返回导航栏编辑' : '返回快捷链接编辑'}>←</button>
        <div>
          <strong>{isSticker ? 'SVG 图标库' : isNavigation ? '导航栏 SVG 图标' : '使用 SVG 图标'}</strong>
          <span>{isSticker ? '选择已保存的 SVG，可调整颜色与旋转后添加为图片贴纸。' : isNavigation ? '从已保存的矢量图标库选择，并在应用到导航栏前调整颜色与旋转。' : '从已保存的矢量图标库选择，并在应用到网站前调整颜色与旋转。'}</span>
        </div>
      </div>

      <div className={styles.layout}>
        <div className={styles.libraryPanel}>
          <div className={styles.panelTitle}><span>图标库</span><small>{icons.length} 个</small></div>
          {loading ? (
            <div className={styles.empty}>正在读取图标库…</div>
          ) : icons.length === 0 ? (
            <div className={styles.empty}><strong>还没有保存的 SVG</strong><span>请先到「设置 → 矢量图标」导入或制作图标。</span></div>
          ) : (
            <div className={styles.grid}>
              {icons.map(icon => (
                <button
                  type="button"
                  key={icon.id}
                  className={`${styles.iconCard} ${selected?.id === icon.id ? styles.iconCardActive : ''}`}
                  onClick={() => void handleSelect(icon.id)}
                  title={icon.name}
                >
                  <LazySvgThumbnail iconId={icon.id} className={styles.thumbnail} />
                  <span>{icon.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className={styles.previewPanel}>
          <div className={styles.panelTitle}><span>预览</span><small>{selected?.name ?? '未选择'}</small></div>
          <div className={styles.previewBox}>
            {previewSvg ? <div className={styles.previewSvg} dangerouslySetInnerHTML={{ __html: previewSvg }} aria-label={selected?.name ?? 'SVG 图标'} /> : <span>选择一个 SVG 图标</span>}
          </div>

          <VectorIconColorControls color={color} disabled={!selected} onChange={setColor} />

          <label className={styles.rotationControl}>
            <div><span>旋转角度</span><strong>{normalizeVectorRotation(rotation)}°</strong></div>
            <input
              type="range"
              min="-180"
              max="180"
              step="1"
              value={rotation}
              disabled={!selected}
              onChange={event => setRotation(Number(event.target.value))}
            />
          </label>
          <div className={styles.quickAngles}>
            {[-90, 0, 90, 180].map(angle => (
              <button type="button" key={angle} disabled={!selected} onClick={() => setRotation(angle)}>{angle}°</button>
            ))}
          </div>
        </div>
      </div>

      {status && <div className={styles.status} role="status">{status}</div>}
      <div className={styles.footer}>
        <button type="button" onClick={onBack}>取消</button>
        <button type="button" className={styles.primaryButton} disabled={!selected || !previewSvg} onClick={() => void handleChoose()}>
          {isSticker ? '添加为图片贴纸' : isNavigation ? '用于导航栏' : '使用此 SVG'}
        </button>
      </div>
    </div>
  );
}
