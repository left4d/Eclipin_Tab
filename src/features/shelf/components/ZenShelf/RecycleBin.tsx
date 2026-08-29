import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import styles from './RecycleBin.module.css';
import { useZenShelf } from '@/features/shelf/context/ZenShelfContext';
import TrashCanEmpty from '@/assets/icons/TrashCan-empty.svg';
import TrashCanFull from '@/assets/icons/TrashCan-full.svg';
import TrashCanHalf from '@/assets/icons/TrashCan-half.svg';
import { useThemeData } from '@/features/theme/context/ThemeContext';
import { DELETED_WIDGETS_CHANGED_EVENT, getDeletedWidgetCount } from '@/features/widgets/services/widgetRecycleBinService';

interface RecycleBinProps {
    isVisible: boolean;
    allowProximityReveal?: boolean;
    onClick?: () => void;
}

export const RecycleBin: React.FC<RecycleBinProps> = ({ isVisible, allowProximityReveal = false, onClick }) => {
    const [isNearCorner, setIsNearCorner] = useState(false);
    const [isWidgetDragging, setIsWidgetDragging] = useState(false);
    const [isWidgetOverBin, setIsWidgetOverBin] = useState(false);
    const { deletedStickers } = useZenShelf();
    const { pageSlideDirection } = useThemeData();
    const [deletedWidgetCount, setDeletedWidgetCount] = useState(() => getDeletedWidgetCount(pageSlideDirection));

    useEffect(() => {
        const refreshDeletedWidgetCount = (event?: Event) => {
            const detail = (event as CustomEvent<{ mode?: string }> | undefined)?.detail;
            if (detail?.mode && detail.mode !== pageSlideDirection) return;
            setDeletedWidgetCount(getDeletedWidgetCount(pageSlideDirection));
        };
        refreshDeletedWidgetCount();
        window.addEventListener(DELETED_WIDGETS_CHANGED_EVENT, refreshDeletedWidgetCount);
        return () => window.removeEventListener(DELETED_WIDGETS_CHANGED_EVENT, refreshDeletedWidgetCount);
    }, [pageSlideDirection]);

    useEffect(() => {
        const handleWidgetTrashDrag = (event: Event) => {
            const detail = (event as CustomEvent<{ dragging?: boolean; over?: boolean }>).detail;
            setIsWidgetDragging(Boolean(detail?.dragging));
            setIsWidgetOverBin(Boolean(detail?.dragging && detail?.over));
        };
        window.addEventListener('eclipin:widget-trash-drag', handleWidgetTrashDrag);
        return () => window.removeEventListener('eclipin:widget-trash-drag', handleWidgetTrashDrag);
    }, []);

    // 只有编辑模式允许“靠近右下角自动显示”。普通模式下回收站只会在拖拽贴纸或组件时出现。
    useEffect(() => {
        if (!allowProximityReveal || isVisible) {
            setIsNearCorner(false);
            return;
        }

        const handleMouseMove = (e: MouseEvent) => {
            const { innerWidth, innerHeight } = window;
            const threshold = 150;
            const dist = Math.hypot(innerWidth - e.clientX, innerHeight - e.clientY);
            setIsNearCorner(dist < threshold);
        };

        window.addEventListener('mousemove', handleMouseMove, { passive: true });
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, [allowProximityReveal, isVisible]);

    const getClassName = () => {
        const dragOverClass = isWidgetOverBin ? ` ${styles.dragOver}` : '';
        if (isVisible || isWidgetDragging) return `${styles.recycleBin} ${styles.visible}${dragOverClass}`;
        if (allowProximityReveal && isNearCorner) return `${styles.recycleBin} ${styles.active}`;
        return styles.recycleBin;
    };

    let icon = TrashCanEmpty;
    const deletedCount = deletedStickers.length + deletedWidgetCount;
    if (deletedCount >= 30) {
        icon = TrashCanFull;
    } else if (deletedCount > 0) {
        icon = TrashCanHalf;
    }

    return ReactDOM.createPortal(
        <div
            id="sticker-recycle-bin"
            className={getClassName()}
            onClick={onClick}
        >
            <img src={icon} alt="Trash Can" className={styles.recycleIcon} />
        </div>,
        document.body
    );
};
