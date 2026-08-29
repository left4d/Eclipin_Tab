import React from 'react';
import { useThemeData } from '@/features/theme/context/ThemeContext';
import { StickerDrawing } from '@/shared/types';

interface DrawingShapeProps {
    drawing: StickerDrawing;
}

const BLACK_COLOR = '#1C1C1E';
const WHITE_COLOR = '#FFFFFF';
const DRAWING_OUTLINE_EXTRA_WIDTH = 2;

/**
 * 与文字贴纸保持一致：
 * - 深色模式中，黑色与白色互换；
 * - 浅色/默认模式中保留用户选择的颜色；
 * - 描边颜色使用 --color-sticker-stroke，随主题自动切换。
 */
const getThemeAwareColor = (color: string, theme: string): string => {
    if (theme !== 'dark') return color;

    const upperColor = color.toUpperCase();
    if (upperColor === BLACK_COLOR || upperColor === '#1C1C1E') {
        return WHITE_COLOR;
    }
    if (upperColor === WHITE_COLOR || upperColor === '#FFF') {
        return BLACK_COLOR;
    }
    return color;
};

/**
 * 统一渲染直线、椭圆和矩形。
 * 外层描边比主体线条总共宽 2px，即视觉上每侧约 1px，
 * 比文字贴纸描边更轻，同时沿用相同的主题颜色逻辑。
 */
export const DrawingShape: React.FC<DrawingShapeProps> = ({ drawing }) => {
    const { theme } = useThemeData();
    const strokeWidth = Number.isFinite(drawing.strokeWidth)
        ? Math.max(1, drawing.strokeWidth)
        : 4;
    const resolvedColor = getThemeAwareColor(drawing.color, theme);
    const outlineProps = {
        stroke: 'var(--color-sticker-stroke, #FFFFFF)',
        strokeWidth: strokeWidth + DRAWING_OUTLINE_EXTRA_WIDTH,
        fill: 'none',
    } as const;

    if (drawing.type === 'line') {
        return (
            <>
                <line
                    x1={drawing.x1}
                    y1={drawing.y1}
                    x2={drawing.x2}
                    y2={drawing.y2}
                    {...outlineProps}
                    strokeLinecap="round"
                />
                <line
                    x1={drawing.x1}
                    y1={drawing.y1}
                    x2={drawing.x2}
                    y2={drawing.y2}
                    stroke={resolvedColor}
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                />
            </>
        );
    }

    if (drawing.type === 'ellipse') {
        const cx = drawing.x + drawing.width / 2;
        const cy = drawing.y + drawing.height / 2;
        const rx = Math.abs(drawing.width / 2);
        const ry = Math.abs(drawing.height / 2);

        return (
            <>
                <ellipse cx={cx} cy={cy} rx={rx} ry={ry} {...outlineProps} />
                <ellipse
                    cx={cx}
                    cy={cy}
                    rx={rx}
                    ry={ry}
                    stroke={resolvedColor}
                    strokeWidth={strokeWidth}
                    fill="none"
                />
            </>
        );
    }

    return (
        <>
            <rect
                x={drawing.x}
                y={drawing.y}
                width={Math.abs(drawing.width)}
                height={Math.abs(drawing.height)}
                {...outlineProps}
                strokeLinejoin="round"
            />
            <rect
                x={drawing.x}
                y={drawing.y}
                width={Math.abs(drawing.width)}
                height={Math.abs(drawing.height)}
                stroke={resolvedColor}
                strokeWidth={strokeWidth}
                fill="none"
                strokeLinejoin="round"
            />
        </>
    );
};
