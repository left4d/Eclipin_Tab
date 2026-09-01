import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { StickerDrawing } from '@/shared/types';
import styles from './ZenShelf.module.css';
import { DrawingShape } from './DrawingShape';
import { DEFAULT_STICKER_COLOR, STICKER_COLOR_PRESETS } from '@/features/shelf/constants/colorPresets';
import { createId } from '@/shared/utils/id';

interface DrawingInputProps {
    onCreateDrawing: (drawing: StickerDrawing, position: { x: number; y: number }, size: { width: number; height: number }) => void;
    onUndo: () => void;
    canUndo: boolean;
    onCancel: () => void;
}


export const DrawingInput: React.FC<DrawingInputProps> = ({ onCreateDrawing, onUndo, canUndo, onCancel }) => {
    const [drawMode, setDrawMode] = useState<'line' | 'ellipse' | 'rectangle'>('line');
    const [drawingColor, setDrawingColor] = useState(DEFAULT_STICKER_COLOR);
    const [strokeWidth, setStrokeWidth] = useState(4);
    const [draftDrawing, setDraftDrawing] = useState<StickerDrawing | null>(null);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                onCancel();
                return;
            }

            if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z' && canUndo) {
                event.preventDefault();
                onUndo();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [canUndo, onCancel, onUndo]);

    const getDrawingPoint = (event: React.PointerEvent<SVGSVGElement>) => {
        const rect = event.currentTarget.getBoundingClientRect();
        return {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top,
        };
    };

    const startDrawing = (event: React.PointerEvent<SVGSVGElement>) => {
        event.preventDefault();
        event.stopPropagation();
        event.currentTarget.setPointerCapture(event.pointerId);
        const point = getDrawingPoint(event);
        const base = {
            id: createId('drawing'),
            // 保存用户原始选择；显示时由 DrawingShape 按当前主题动态反转黑/白。
            color: drawingColor,
            strokeWidth,
        };
        const nextDrawing: StickerDrawing = drawMode === 'line'
            ? { ...base, type: 'line', x1: point.x, y1: point.y, x2: point.x, y2: point.y }
            : { ...base, type: drawMode, x: point.x, y: point.y, width: 0, height: 0 };
        setDraftDrawing(nextDrawing);
    };

    const updateDrawing = (event: React.PointerEvent<SVGSVGElement>) => {
        if (!draftDrawing) return;
        event.preventDefault();
        event.stopPropagation();
        const point = getDrawingPoint(event);
        setDraftDrawing((current) => {
            if (!current) return current;
            return current.type === 'line'
                ? { ...current, x2: point.x, y2: point.y }
                : { ...current, width: point.x - current.x, height: point.y - current.y };
        });
    };

    const finishDrawing = (event: React.PointerEvent<SVGSVGElement>) => {
        if (!draftDrawing) return;
        event.preventDefault();
        event.stopPropagation();
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
        }
        const point = getDrawingPoint(event);
        const completedDrawing: StickerDrawing = draftDrawing.type === 'line'
            ? { ...draftDrawing, x2: point.x, y2: point.y }
            : { ...draftDrawing, width: point.x - draftDrawing.x, height: point.y - draftDrawing.y };
        const isEmpty = completedDrawing.type === 'line'
            ? Math.hypot(completedDrawing.x2 - completedDrawing.x1, completedDrawing.y2 - completedDrawing.y1) < 4
            : Math.abs(completedDrawing.width) < 4 || Math.abs(completedDrawing.height) < 4;

        if (!isEmpty) {
            const padding = Math.max(3, Math.ceil((completedDrawing.strokeWidth + 2) / 2) + 1);
            if (completedDrawing.type === 'line') {
                const minX = Math.min(completedDrawing.x1, completedDrawing.x2);
                const minY = Math.min(completedDrawing.y1, completedDrawing.y2);
                const width = Math.abs(completedDrawing.x2 - completedDrawing.x1);
                const height = Math.abs(completedDrawing.y2 - completedDrawing.y1);
                onCreateDrawing({
                    ...completedDrawing,
                    x1: completedDrawing.x1 - minX + padding,
                    y1: completedDrawing.y1 - minY + padding,
                    x2: completedDrawing.x2 - minX + padding,
                    y2: completedDrawing.y2 - minY + padding,
                }, { x: minX - padding, y: minY - padding }, { width: width + padding * 2, height: height + padding * 2 });
            } else {
                const minX = Math.min(completedDrawing.x, completedDrawing.x + completedDrawing.width);
                const minY = Math.min(completedDrawing.y, completedDrawing.y + completedDrawing.height);
                const width = Math.abs(completedDrawing.width);
                const height = Math.abs(completedDrawing.height);
                onCreateDrawing({
                    ...completedDrawing,
                    x: padding,
                    y: padding,
                    width,
                    height,
                }, { x: minX - padding, y: minY - padding }, { width: width + padding * 2, height: height + padding * 2 });
            }
        }

        setDraftDrawing(null);
    };

    const cancelDraftDrawing = (event: React.PointerEvent<SVGSVGElement>) => {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
        }
        setDraftDrawing(null);
    };

    return createPortal(
        <>
            <svg
                className={styles.fullscreenDrawingCanvas}
                onPointerDown={startDrawing}
                onPointerMove={updateDrawing}
                onPointerUp={finishDrawing}
                onPointerCancel={cancelDraftDrawing}
            >
                {draftDrawing && <DrawingShape drawing={draftDrawing} />}
            </svg>

            <div className={styles.drawingToolbar} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
                <div className={`${styles.toolbarPanel} ${styles.drawingToolbarPanel}`}>
                    <section className={styles.drawingToolbarSection} aria-label="画笔颜色">
                        <span className={styles.drawingToolbarLabel}>颜色</span>
                        <div className={`${styles.toolbarColorGroup} ${styles.drawingColorGrid}`} role="group">
                            {STICKER_COLOR_PRESETS.map((preset) => (
                                <button
                                    key={preset.value}
                                    type="button"
                                    className={`${styles.toolbarColorBtn} ${drawingColor === preset.value ? styles.active : ''}`}
                                    style={{ backgroundColor: preset.value }}
                                    onClick={() => setDrawingColor(preset.value)}
                                    title={preset.label}
                                    aria-label={`画笔颜色：${preset.label}`}
                                    aria-pressed={drawingColor === preset.value}
                                />
                            ))}
                        </div>
                    </section>

                    <section className={styles.drawingToolbarSection} aria-label="绘图形状">
                        <span className={styles.drawingToolbarLabel}>形状</span>
                        <div className={styles.drawingShapeGroup}>
                            <button type="button" className={`icon-btn ${styles.toolbarDrawBtn} ${drawMode === 'line' ? styles.active : ''}`} aria-pressed={drawMode === 'line'} onClick={() => setDrawMode('line')} title="直线">／</button>
                            <button type="button" className={`icon-btn ${styles.toolbarDrawBtn} ${drawMode === 'ellipse' ? styles.active : ''}`} aria-pressed={drawMode === 'ellipse'} onClick={() => setDrawMode('ellipse')} title="椭圆">◯</button>
                            <button type="button" className={`icon-btn ${styles.toolbarDrawBtn} ${drawMode === 'rectangle' ? styles.active : ''}`} aria-pressed={drawMode === 'rectangle'} onClick={() => setDrawMode('rectangle')} title="矩形">▭</button>
                        </div>
                    </section>

                    <label className={`${styles.drawingToolbarSection} ${styles.drawingStrokeControl}`}>
                        <span className={styles.drawingToolbarLabel}>线宽</span>
                        <div className={styles.drawingStrokeRow}>
                            <input type="range" className="range" min="1" max="12" value={strokeWidth} onChange={(e) => setStrokeWidth(Number(e.target.value))} />
                            <output>{strokeWidth}px</output>
                        </div>
                    </label>

                    <div className={styles.drawingActionGroup}>
                        <button type="button" className={`icon-btn ${styles.toolbarDrawBtn}`} onClick={onUndo} disabled={!canUndo} title="撤回（Ctrl/Cmd + Z）">↶</button>
                        <button type="button" className="btn btn--primary" onClick={onCancel} title="完成绘图（Esc）">完成</button>
                    </div>
                </div>
            </div>
        </>,
        document.body
    );
};
