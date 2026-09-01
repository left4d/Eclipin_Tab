import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { createId } from '@/shared/utils/id';
import { deleteVectorIcon, getVectorIcon, listVectorIconMetadata, releaseVectorIconStore, saveVectorIcon } from '../services/vectorIconStore';
import type { CanvasVectorItem, VectorIconMeta, VectorStyleOptions } from '../types/vectorIcon';
import { composeCanvasSvg, VECTOR_CANVAS_SIZE } from '../utils/svgCompose';
import { getViewBoxAspectRatio } from '../utils/vectorCanvasGeometry';
import { VECTOR_ICON_DEFAULT_DISPLAY_SIZE } from '../utils/vectorIconSizing';
import { sanitizeSvg } from '../utils/svgSanitizer';
import { applyVectorStyle, inferVectorStyle } from '../utils/svgStyle';
import { VectorCanvas } from './VectorCanvas';
import { VectorIconLibrary } from './VectorIconLibrary';
import styles from './VectorIconStudio.module.css';
import { useLanguage } from '@/shared/context/LanguageContext';

interface DraftIcon {
  id: string | null;
  name: string;
  svg: string;
  viewBox: string;
  createdAt: number;
}

const EMPTY_STYLE: VectorStyleOptions = {
  color: '#1f2937',
  strokeWidth: 2,
  roundness: 8,
  paintMode: 'existing',
};

function fileBaseName(name: string, language: 'en' | 'zh'): string {
  const clean = name.replace(/\.svg$/i, '').trim();
  return clean || (language === 'zh' ? '未命名图标' : 'Untitled icon');
}

export default function VectorIconStudio() {
  const { language } = useLanguage();
  const [icons, setIcons] = useState<VectorIconMeta[]>([]);
  const [libraryLoading, setLibraryLoading] = useState(true);
  const [draft, setDraft] = useState<DraftIcon | null>(null);
  const [styleOptions, setStyleOptions] = useState<VectorStyleOptions>(EMPTY_STYLE);
  const [codeInput, setCodeInput] = useState('');
  const [status, setStatus] = useState('');
  const [canvasItems, setCanvasItems] = useState<CanvasVectorItem[]>([]);
  const [selectedCanvasIds, setSelectedCanvasIds] = useState<string[]>([]);
  const [canvasPast, setCanvasPast] = useState<CanvasVectorItem[][]>([]);
  const [canvasFuture, setCanvasFuture] = useState<CanvasVectorItem[][]>([]);
  const canvasTransformStartRef = useRef<CanvasVectorItem[] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const refreshLibrary = async () => {
    const metadata = await listVectorIconMetadata();
    setIcons(metadata);
  };

  useEffect(() => {
    let cancelled = false;
    void listVectorIconMetadata().then(metadata => {
      if (cancelled) return;
      setIcons(metadata);
      setLibraryLoading(false);
    });
    return () => {
      cancelled = true;
      releaseVectorIconStore();
    };
  }, []);

  const styledSvg = useMemo(() => {
    if (!draft) return '';
    try {
      return applyVectorStyle(draft.svg, styleOptions);
    } catch {
      return draft.svg;
    }
  }, [draft, styleOptions]);

  const loadDraft = (record: { id?: string | null; name: string; svg: string; viewBox: string; createdAt?: number }) => {
    setDraft({
      id: record.id ?? null,
      name: record.name,
      svg: record.svg,
      viewBox: record.viewBox,
      createdAt: record.createdAt ?? Date.now(),
    });
    setStyleOptions(inferVectorStyle(record.svg));
  };

  const handleSelectIcon = async (id: string) => {
    const record = await getVectorIcon(id);
    if (!record) {
      setStatus('没有找到这个图标，图标库可能刚刚发生了变化。');
      void refreshLibrary();
      return;
    }
    loadDraft(record);
    setStatus(`已载入「${record.name}」。`);
  };

  const handleFileImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';
    if (files.length === 0) return;
    let firstRecord: Awaited<ReturnType<typeof getVectorIcon>> = null;
    let imported = 0;
    for (const file of files) {
      try {
        if (file.size > 300_000) throw new Error('文件超过 300 KB。');
        const sanitized = sanitizeSvg(await file.text());
        const now = Date.now();
        const record = {
          id: createId('vector'),
          name: fileBaseName(file.name, language),
          svg: sanitized.svg,
          viewBox: sanitized.viewBox,
          createdAt: now,
          updatedAt: now,
        };
        await saveVectorIcon(record);
        if (!firstRecord) firstRecord = record;
        imported += 1;
      } catch (error) {
        setStatus(`${file.name}: ${error instanceof Error ? error.message : '导入失败。'}`);
      }
    }
    await refreshLibrary();
    if (firstRecord) loadDraft(firstRecord);
    if (imported > 0) setStatus(`已导入 ${imported} 个 SVG 文件。`);
  };

  const handleCodeImport = () => {
    try {
      const sanitized = sanitizeSvg(codeInput);
      loadDraft({ name: '代码图标', svg: sanitized.svg, viewBox: sanitized.viewBox });
      setCodeInput('');
      setStatus('代码已载入编辑器，保存后会进入图标库。');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'SVG 代码无效。');
    }
  };

  const handleSaveDraft = async () => {
    if (!draft) return;
    try {
      const sanitized = sanitizeSvg(styledSvg);
      const now = Date.now();
      const record = {
        id: draft.id ?? createId('vector'),
        name: draft.name.trim() || '未命名图标',
        svg: sanitized.svg,
        viewBox: sanitized.viewBox,
        createdAt: draft.createdAt,
        updatedAt: now,
      };
      await saveVectorIcon(record);
      loadDraft(record);
      await refreshLibrary();
      setStatus(`「${record.name}」已保存。`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : '保存失败。');
    }
  };

  const recordCanvasHistory = (previous: CanvasVectorItem[]) => {
    setCanvasPast(history => [...history.slice(-39), previous]);
    setCanvasFuture([]);
  };

  const updateCanvasItems = (next: CanvasVectorItem[], mode: 'commit' | 'preview' = 'commit') => {
    if (mode === 'commit') recordCanvasHistory(canvasItems);
    setCanvasItems(next);
  };

  const beginCanvasTransform = () => {
    canvasTransformStartRef.current = canvasItems;
  };

  const commitCanvasTransform = () => {
    const start = canvasTransformStartRef.current;
    canvasTransformStartRef.current = null;
    if (!start || start === canvasItems) return;
    recordCanvasHistory(start);
  };

  const undoCanvas = () => {
    const previous = canvasPast[canvasPast.length - 1];
    if (!previous) return;
    setCanvasPast(history => history.slice(0, -1));
    setCanvasFuture(history => [canvasItems, ...history].slice(0, 40));
    setCanvasItems(previous);
    setSelectedCanvasIds([]);
  };

  const redoCanvas = () => {
    const next = canvasFuture[0];
    if (!next) return;
    setCanvasFuture(history => history.slice(1));
    setCanvasPast(history => [...history.slice(-39), canvasItems]);
    setCanvasItems(next);
    setSelectedCanvasIds([]);
  };

  const addVectorToCanvas = (record: { name: string; svg: string; viewBox: string }, x?: number, y?: number) => {
    const ratio = Math.max(0.25, Math.min(4, getViewBoxAspectRatio(record.viewBox)));
    const maxSide = VECTOR_ICON_DEFAULT_DISPLAY_SIZE;
    const width = ratio >= 1 ? maxSide : maxSide * ratio;
    const height = ratio >= 1 ? maxSide / ratio : maxSide;
    const item: CanvasVectorItem = {
      id: createId('vector-canvas'),
      name: record.name,
      svg: record.svg,
      viewBox: record.viewBox,
      x: Math.max(0, Math.min(VECTOR_CANVAS_SIZE.width - width, (x ?? VECTOR_CANVAS_SIZE.width / 2) - width / 2)),
      y: Math.max(0, Math.min(VECTOR_CANVAS_SIZE.height - height, (y ?? VECTOR_CANVAS_SIZE.height / 2) - height / 2)),
      width,
      height,
      rotation: 0,
      opacity: 1,
      flipX: false,
      flipY: false,
      lockAspectRatio: true,
    };
    recordCanvasHistory(canvasItems);
    setCanvasItems(current => [...current, item]);
    setSelectedCanvasIds([item.id]);
  };

  const handleAddSavedToCanvas = async (id: string, x?: number, y?: number) => {
    const record = await getVectorIcon(id);
    if (!record) return;
    addVectorToCanvas(record, x, y);
  };

  const handleAddDraftToCanvas = () => {
    if (!draft) return;
    addVectorToCanvas({ name: draft.name || '未命名图标', svg: styledSvg, viewBox: draft.viewBox });
  };

  const handleSaveCanvas = async () => {
    try {
      const composed = composeCanvasSvg(canvasItems);
      const now = Date.now();
      const record = {
        id: createId('vector'),
        name: `组合图标 ${icons.length + 1}`,
        svg: composed.svg,
        viewBox: composed.viewBox,
        createdAt: now,
        updatedAt: now,
      };
      await saveVectorIcon(record);
      await refreshLibrary();
      loadDraft(record);
      setStatus('画布组合已保存到图标库，可在编辑器里继续调整。');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : '画布保存失败。');
    }
  };

  const handleDelete = async (id: string) => {
    const target = icons.find(icon => icon.id === id);
    if (!target || !window.confirm(language === 'zh' ? `删除「${target.name}」？` : `Delete “${target.name}”?`)) return;
    await deleteVectorIcon(id);
    if (draft?.id === id) setDraft(null);
    await refreshLibrary();
    setStatus('图标已删除。');
  };

  const handleCopySvg = async () => {
    if (!styledSvg || !navigator.clipboard) return;
    await navigator.clipboard.writeText(styledSvg);
    setStatus('SVG 代码已复制。');
  };

  return (
    <section className={styles.studioSection}>
      <div className={styles.sectionHeader}>
        <div><h2>矢量图标</h2><p>导入、轻量编辑并在画布中拼接 SVG。工作台只在打开此页面时挂载。</p></div>
        <span className={styles.memoryBadge}>LAZY · DISPOSABLE</span>
      </div>

      <div className={`card ${styles.importCard}`}>
        <div className={styles.importHeader}>
          <div><strong>导入 SVG</strong><span>支持文件与代码；危险脚本、外链资源和事件属性会在导入时移除。</span></div>
          <div className={styles.importActions}>
            <input ref={fileInputRef} className={styles.hiddenInput} type="file" accept=".svg,image/svg+xml" multiple onChange={handleFileImport} />
            <button type="button" onClick={() => fileInputRef.current?.click()}>选择 SVG 文件</button>
          </div>
        </div>
        <div className={styles.codeImportRow}>
          <textarea className="field" value={codeInput} onChange={event => setCodeInput(event.target.value)} placeholder='<svg viewBox="0 0 24 24">…</svg>' spellCheck={false} />
          <button type="button" onClick={handleCodeImport} disabled={!codeInput.trim()}>载入代码</button>
        </div>
      </div>

      <div className={styles.workspaceGrid}>
        <div className={`card ${styles.editorCard}`}>
          <div className={styles.cardHeading}><div><strong>快速编辑</strong><span>颜色、线条粗细和圆角会直接作用到预览。</span></div>{draft && <small>{draft.id ? '已保存图标' : '未保存草稿'}</small>}</div>
          {draft ? (
            <>
              <div className={styles.editorMain}>
                <div className={styles.editorPreview} dangerouslySetInnerHTML={{ __html: styledSvg }} />
                <div className={styles.editorControls}>
                  <label className={styles.nameField}><span>名称</span><input className="field" value={draft.name} onChange={event => setDraft(current => current ? { ...current, name: event.target.value } : current)} /></label>
                  <label><span>颜色</span><div className={styles.colorControl}><input type="color" value={styleOptions.color} onChange={event => setStyleOptions(current => ({ ...current, color: event.target.value }))} /><code>{styleOptions.color}</code></div></label>
                  <label><span>颜色作用</span><select className="field" value={styleOptions.paintMode} onChange={event => setStyleOptions(current => ({ ...current, paintMode: event.target.value as VectorStyleOptions['paintMode'] }))}><option value="existing">原有线/面</option><option value="stroke">线条</option><option value="fill">填充</option></select></label>
                  <label><span>线条粗细 {styleOptions.strokeWidth.toFixed(1)}</span><input type="range" className="range" min="0.5" max="12" step="0.5" value={styleOptions.strokeWidth} onChange={event => setStyleOptions(current => ({ ...current, strokeWidth: Number(event.target.value) }))} /></label>
                  <label><span>圆角 {styleOptions.roundness}</span><input type="range" className="range" min="0" max="24" step="1" value={styleOptions.roundness} onChange={event => setStyleOptions(current => ({ ...current, roundness: Number(event.target.value) }))} /></label>
                </div>
              </div>
              <div className={styles.editorActions}><button type="button" onClick={handleCopySvg}>复制 SVG</button><button type="button" onClick={handleAddDraftToCanvas}>加入画布</button><button type="button" className={styles.primaryButton} onClick={handleSaveDraft}>保存图标</button></div>
            </>
          ) : <div className={styles.editorEmpty}><strong>选择或导入一个图标</strong><span>编辑器不会预先加载图标内容；点击图标后才从存储读取 SVG。</span></div>}
        </div>

        <div className={`card ${styles.libraryCard}`}>
          <div className={styles.cardHeading}><div><strong>图标库</strong><span>{icons.length} 个已保存图标 · 可直接拖到下方画布</span></div></div>
          <VectorIconLibrary icons={icons} selectedId={draft?.id ?? null} loading={libraryLoading} onSelect={handleSelectIcon} onAddToCanvas={id => void handleAddSavedToCanvas(id)} onDelete={id => void handleDelete(id)} />
        </div>
      </div>

      <div className={`card ${styles.canvasCard}`}>
        <div className={styles.cardHeading}><div><strong>拼接画布</strong><span>支持框选/多选、自由缩放、旋转、翻转、透明度、图层顺序、对齐分布、网格吸附、缩放视图与撤销重做；保存时自动裁掉外围空白。</span></div><small>{canvasItems.length} 个元素</small></div>
        <VectorCanvas
          items={canvasItems}
          selectedIds={selectedCanvasIds}
          onItemsChange={updateCanvasItems}
          onSelectedIdsChange={setSelectedCanvasIds}
          onDropLibraryIcon={(id, x, y) => void handleAddSavedToCanvas(id, x, y)}
          onSaveCanvas={() => void handleSaveCanvas()}
          onBeginTransform={beginCanvasTransform}
          onCommitTransform={commitCanvasTransform}
          onUndo={undoCanvas}
          onRedo={redoCanvas}
          canUndo={canvasPast.length > 0}
          canRedo={canvasFuture.length > 0}
        />
      </div>

      <div className={styles.runtimeNote}><strong>资源策略</strong><span>页面通过动态 import 按需加载；离开此设置页后编辑器、画布、SVG 草稿和观察器全部卸载。已保存图标存入 IndexedDB，列表先读取元数据，缩略图进入可视区时才读取 SVG 内容。</span></div>
      {status && <div className={styles.statusLine} role="status">{status}</div>}
    </section>
  );
}
