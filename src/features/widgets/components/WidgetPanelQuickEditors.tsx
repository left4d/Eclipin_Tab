import { createPortal } from 'react-dom';
import type { BuiltInFontId } from '@/shared/constants/builtInFonts';
import { FontPicker } from '@/shared/components/FontPicker/FontPicker';
import type { WidgetLayout } from '../types/widget';
import styles from './WidgetPanel.module.css';

type AnchoredEditor = { id: string; anchorRect: DOMRect };

interface WidgetPanelQuickEditorsProps {
  widgets: WidgetLayout[];
  fontEditor: AnchoredEditor | null;
  onCloseFont: () => void;
  onChangeFont: (id: string, fontId: BuiltInFontId) => void;
  embedEditor: AnchoredEditor | null;
  embedUrlDraft: string;
  embedUrlError: string;
  isSavingEmbed: boolean;
  onEmbedDraftChange: (value: string) => void;
  onCloseEmbed: () => void;
  onSaveEmbed: () => void;
  onImportEmbedFile: (file: File) => void;
  onImportEmbedDirectory: (files: File[]) => void;
  onClearEmbed: (id: string) => void;
  priorityEditor: AnchoredEditor | null;
  priorityDraft: string;
  onPriorityDraftChange: (value: string) => void;
  onClosePriority: () => void;
  onSavePriority: () => void;
  linkTextWidget: WidgetLayout | null;
  linkTextAnchor: DOMRect | null;
  onCloseLinkText: () => void;
  onUpdateLinkText: (id: string, updates: Pick<Partial<WidgetLayout>, 'linkTextColor' | 'linkTextSize' | 'linkTextStroke' | 'linkTextHidden'>) => void;
}

export default function WidgetPanelQuickEditors({
  widgets,
  fontEditor,
  onCloseFont,
  onChangeFont,
  embedEditor,
  embedUrlDraft,
  embedUrlError,
  isSavingEmbed,
  onEmbedDraftChange,
  onCloseEmbed,
  onSaveEmbed,
  onImportEmbedFile,
  onImportEmbedDirectory,
  onClearEmbed,
  priorityEditor,
  priorityDraft,
  onPriorityDraftChange,
  onClosePriority,
  onSavePriority,
  linkTextWidget,
  linkTextAnchor,
  onCloseLinkText,
  onUpdateLinkText,
}: WidgetPanelQuickEditorsProps) {
  const clockWidget = fontEditor
    ? widgets.find((widget) => widget.id === fontEditor.id && (widget.type === 'clock' || widget.type === 'countdown')) ?? null
    : null;
  const embedWidget = embedEditor ? widgets.find((widget) => widget.id === embedEditor.id) ?? null : null;

  return (
    <>
      {fontEditor && clockWidget && createPortal((
        <div className={styles.fontEditorClickAway} onMouseDown={onCloseFont}>
          <div
            className={styles.widgetFontEditor}
            style={{
              left: fontEditor.anchorRect.right + 16 + 310 <= window.innerWidth
                ? fontEditor.anchorRect.right + 16
                : Math.max(12, fontEditor.anchorRect.left - 326),
              top: Math.min(Math.max(12, fontEditor.anchorRect.top + fontEditor.anchorRect.height / 2 - 126), Math.max(12, window.innerHeight - 520)),
            }}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className={styles.widgetFontEditorTitle}>切换字体</div>
            <p>字体选择会保存在当前组件中。</p>
            <FontPicker
              value={clockWidget.fontFamily}
              previewText={clockWidget.type === 'countdown' ? '倒数日字体预览 12:34' : '时钟字体预览 12:34'}
              onChange={(fontId) => onChangeFont(clockWidget.id, fontId)}
            />
          </div>
        </div>
      ), document.body)}

      {embedEditor && createPortal((
        <div className={styles.priorityEditorClickAway} onMouseDown={onCloseEmbed}>
          <form
            className={`${styles.priorityEditor} ${styles.embedEditor}`}
            style={{
              left: embedEditor.anchorRect.right + 16 + 420 <= window.innerWidth ? embedEditor.anchorRect.right + 16 : Math.max(12, embedEditor.anchorRect.left - 436),
              top: Math.min(Math.max(12, embedEditor.anchorRect.top + embedEditor.anchorRect.height / 2 - 150), Math.max(12, window.innerHeight - 332)),
            }}
            onMouseDown={(event) => event.stopPropagation()}
            onSubmit={(event) => { event.preventDefault(); onSaveEmbed(); }}
          >
            <div className={styles.priorityEditorTitle}>设置嵌入网页</div>
            <p>输入 NAS、Home Assistant、Grafana 或其他内部网页地址。局域网 IP、localhost 和 .local 地址在未填写协议时会优先使用 HTTP。</p>
            <label className={styles.embedInputRow}>
              <span>网页地址</span>
              <input
                className="field"
                autoFocus
                type="text"
                inputMode="url"
                placeholder="例如 192.168.1.20:5000 或 https://nas.example.com"
                value={embedUrlDraft}
                onChange={(event) => onEmbedDraftChange(event.target.value)}
                onKeyDown={(event) => { if (event.key === 'Escape') onCloseEmbed(); }}
              />
            </label>
            <div className={styles.embedLocalImport}>
              <span>{embedWidget?.embedLocalName ? `当前：${embedWidget.embedLocalName}` : '支持 HTML、ZIP，也可直接选择完整网页文件夹'}</span>
              <div className={styles.embedLocalImportActions}>
                <label>
                  HTML / ZIP
                  <input
                    type="file"
                    accept=".html,.htm,.zip,text/html,application/zip"
                    disabled={isSavingEmbed}
                    onChange={(event) => {
                      const file = event.currentTarget.files?.[0];
                      if (file) onImportEmbedFile(file);
                      event.currentTarget.value = '';
                    }}
                  />
                </label>
                <label>
                  网页文件夹
                  <input
                    type="file"
                    multiple
                    disabled={isSavingEmbed}
                    ref={(node) => {
                      if (!node) return;
                      node.setAttribute('webkitdirectory', '');
                      node.setAttribute('directory', '');
                    }}
                    onChange={(event) => {
                      const files = Array.from(event.currentTarget.files ?? []);
                      if (files.length > 0) onImportEmbedDirectory(files);
                      event.currentTarget.value = '';
                    }}
                  />
                </label>
              </div>
            </div>
            {embedUrlError && <div className={styles.embedEditorError}>{embedUrlError}</div>}
            <div className={styles.embedEditorNotice}>本地网页会保存到 IndexedDB，并在隔离的 sandbox iframe 中运行。ZIP/文件夹会自动选择最合适的 HTML 入口，并保留 CSS、JS、图片、字体、WebAssembly、Worker、SVG sprite 等相对路径资源；离开可视区域后 iframe 会短暂保活，持续离屏后再自动卸载释放内存。</div>
            <div className={styles.priorityEditorActions}>
              <button type="button" className="btn btn--sm" onClick={onCloseEmbed} disabled={isSavingEmbed}>取消</button>
              {(embedWidget?.embedUrl || embedWidget?.embedLocalId) && <button type="button" className={`btn btn--sm btn--danger ${styles.embedClearButton}`} onClick={() => onClearEmbed(embedEditor.id)}>移除嵌入</button>}
              <button type="submit" className={`btn btn--sm btn--primary ${styles.prioritySaveButton}`} disabled={isSavingEmbed}>{isSavingEmbed ? '正在授权…' : '保存'}</button>
            </div>
          </form>
        </div>
      ), document.body)}

      {priorityEditor && createPortal((
        <div className={styles.priorityEditorClickAway} onMouseDown={onClosePriority}>
          <form
            className={styles.priorityEditor}
            style={{
              left: priorityEditor.anchorRect.right + 16 + 280 <= window.innerWidth
                ? priorityEditor.anchorRect.right + 16
                : Math.max(12, priorityEditor.anchorRect.left - 296),
              top: Math.min(Math.max(12, priorityEditor.anchorRect.top + priorityEditor.anchorRect.height / 2 - 88), Math.max(12, window.innerHeight - 188)),
            }}
            onMouseDown={(event) => event.stopPropagation()}
            onSubmit={(event) => { event.preventDefault(); onSavePriority(); }}
          >
            <div className={styles.priorityEditorTitle}>设置层叠优先级</div>
            <p>组件重叠时，数字更大的组件显示在上方；优先级相同时，最近在编辑模式点击/拖动的组件位于上层。</p>
            <label className={styles.priorityInputRow}>
              <span>优先级</span>
              <input
                className="field"
                autoFocus
                type="number"
                min="-999"
                max="999"
                step="1"
                value={priorityDraft}
                onChange={(event) => onPriorityDraftChange(event.target.value)}
                onKeyDown={(event) => { if (event.key === 'Escape') onClosePriority(); }}
              />
            </label>
            <div className={styles.priorityEditorActions}>
              <button type="button" className="btn btn--sm" onClick={onClosePriority}>取消</button>
              <button type="submit" className={`btn btn--sm btn--primary ${styles.prioritySaveButton}`}>保存</button>
            </div>
          </form>
        </div>
      ), document.body)}

      {linkTextWidget && linkTextAnchor && createPortal((
        <div className={styles.linkTextClickAway} onMouseDown={onCloseLinkText}>
          <div
            className={styles.linkTextEditor}
            style={{
              left: linkTextAnchor.right + 16 + 360 <= window.innerWidth ? linkTextAnchor.right + 16 : Math.max(12, linkTextAnchor.left - 376),
              top: Math.min(Math.max(12, linkTextAnchor.top + linkTextAnchor.height / 2 - 132), Math.max(12, window.innerHeight - 276)),
            }}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className={styles.linkTextEditorTitle}>更改文字</div>
            <label className={styles.linkTextRow}>
              <span>字号</span>
              <input
                type="range" className="range"
                min="12"
                max="48"
                value={linkTextWidget.linkTextSize ?? 20}
                onChange={(event) => onUpdateLinkText(linkTextWidget.id, { linkTextSize: Number(event.target.value) })}
              />
              <strong>{linkTextWidget.linkTextSize ?? 20}</strong>
            </label>
            <label className={styles.linkTextRow}>
              <span>描边</span>
              <input
                type="range" className="range"
                min="0"
                max="20"
                value={linkTextWidget.linkTextStroke ?? 6}
                onChange={(event) => onUpdateLinkText(linkTextWidget.id, { linkTextStroke: Number(event.target.value) })}
              />
              <strong>{(linkTextWidget.linkTextStroke ?? 6) === 0 ? '无' : `${linkTextWidget.linkTextStroke ?? 6}`}</strong>
            </label>
            <div className={styles.linkTextButtonsRow}>
              <button
                type="button"
                className={`${styles.linkTextAuto} ${linkTextWidget.linkTextHidden ? styles.linkTextAutoActive : ''}`}
                onClick={() => onUpdateLinkText(linkTextWidget.id, { linkTextHidden: !linkTextWidget.linkTextHidden })}
              >
                {linkTextWidget.linkTextHidden ? '显示文字' : '不显示文字'}
              </button>
              <button
                type="button"
                className={`${styles.linkTextAuto} ${!linkTextWidget.linkTextColor ? styles.linkTextAutoActive : ''}`}
                onClick={() => onUpdateLinkText(linkTextWidget.id, { linkTextColor: undefined })}
              >
                跟随主题
              </button>
            </div>
            <div className={styles.linkTextColors}>
              {['#1C1C1E', '#FFFFFF', '#FF3B30', '#FF9500', '#34C759', 'var(--fusion-accent)', '#AF52DE'].map((color) => (
                <button
                  type="button"
                  key={color}
                  aria-label={`文字颜色 ${color}`}
                  className={`${styles.linkTextColor} ${linkTextWidget.linkTextColor === color ? styles.linkTextColorActive : ''}`}
                  style={{ background: color }}
                  onClick={() => onUpdateLinkText(linkTextWidget.id, { linkTextColor: color })}
                />
              ))}
            </div>
          </div>
        </div>
      ), document.body)}
    </>
  );
}
