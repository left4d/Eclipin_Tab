import type { Sticker } from '@/shared/types';
import { copyBlobToClipboard, createImageStickerImage, createTextStickerImage, downloadBlob } from '@/features/theme/utils/canvasUtils';
import { db } from '@/shared/utils/db';
import { ContextMenu } from './ContextMenu';
import type { StickerContextMenuState } from './zenShelfTypes';
import { getStickerLinkTarget } from '@/features/shelf/utils/stickerNavigation';
import { getStickerLogicalSize } from '@/features/shelf/utils/stickerSizing';
import { copyElementSize, formatElementSize, readElementSizeClipboard } from '@/shared/utils/elementSizeClipboard';
import { getStickerCornerRadius, getStickerStrokeWidth } from '@/features/shelf/utils/stickerAppearance';

interface StickerContextMenuLayerProps {
    contextMenu: StickerContextMenuState;
    stickers: Sticker[];
    isEditMode: boolean;
    onClose: () => void;
    onAddSticker: (x: number, y: number) => void;
    onStartDrawing: () => void;
    onUploadImage: () => void;
    onOpenSvgLibrary: (x: number, y: number) => void;
    onChooseIconSwap: (sticker: Sticker) => void;
    onToggleEditMode: () => void;
    onEditSticker: (sticker: Sticker) => void;
    onDeleteSticker: (stickerId: string) => void;
    onOpenSettings?: (position: { x: number; y: number }) => void;
    onOpenAddWidget?: () => void;
    onClearAllStickers: () => void;
    onChangeFont: (sticker: Sticker, x: number, y: number) => void;
    onRotateSticker: (sticker: Sticker, x: number, y: number) => void;
    onSetStickerLink: (sticker: Sticker, x: number, y: number) => void;
    onToggleScreenFixed: (sticker: Sticker) => void;
    onSetPriority: (sticker: Sticker, x: number, y: number) => void;
    onEditSize: (sticker: Sticker, x: number, y: number) => void;
    onPasteSize: (sticker: Sticker) => void;
    onEditStroke: (sticker: Sticker, x: number, y: number, currentWidth: number) => void;
    onEditCornerRadius: (sticker: Sticker, x: number, y: number, currentRadius: number) => void;
    onUpdateSticker: (stickerId: string, updates: Partial<Sticker>) => void;
}

export const StickerContextMenuLayer = ({
    contextMenu,
    stickers,
    isEditMode,
    onClose,
    onAddSticker,
    onStartDrawing,
    onUploadImage,
    onOpenSvgLibrary,
    onChooseIconSwap,
    onToggleEditMode,
    onEditSticker,
    onDeleteSticker,
    onOpenSettings,
    onOpenAddWidget,
    onClearAllStickers,
    onChangeFont,
    onRotateSticker,
    onSetStickerLink,
    onToggleScreenFixed,
    onSetPriority,
    onEditSize,
    onPasteSize,
    onEditStroke,
    onEditCornerRadius,
    onUpdateSticker,
}: StickerContextMenuLayerProps) => {
    const activeSticker = contextMenu.stickerId
        ? stickers.find((sticker) => sticker.id === contextMenu.stickerId)
        : undefined;
    const activeSize = activeSticker ? getStickerLogicalSize(activeSticker) : null;
    const copiedSize = readElementSizeClipboard();
    const activeStickerElement = activeSticker
        ? document.querySelector<HTMLElement>(`[data-sticker-id="${activeSticker.id}"]`)
        : null;
    const activeIsSvgImage = activeStickerElement?.dataset.stickerSvg === 'true';
    const strokeWidth = activeSticker ? getStickerStrokeWidth(activeSticker, activeIsSvgImage) : 6;
    const cornerRadius = activeSticker?.type === 'image' ? getStickerCornerRadius(activeSticker) : 0;

    return (
        <ContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            type={contextMenu.type}
            stickerId={contextMenu.stickerId}
            isImageSticker={activeSticker?.type === 'image'}
            isTextSticker={activeSticker?.type === 'text'}
            onClose={onClose}
            onAddSticker={() => onAddSticker(contextMenu.x, contextMenu.y)}
            onStartDrawing={onStartDrawing}
            onUploadImage={onUploadImage}
            onOpenSvgLibrary={() => onOpenSvgLibrary(contextMenu.x, contextMenu.y)}
            onToggleEditMode={onToggleEditMode}
            onOpenAddWidget={onOpenAddWidget}
            isEditMode={isEditMode}
            onEditSticker={() => {
                if (activeSticker) onEditSticker(activeSticker);
            }}
            onDeleteSticker={() => {
                if (contextMenu.stickerId) onDeleteSticker(contextMenu.stickerId);
            }}
            onCopyImage={async () => {
                if (activeSticker?.type !== 'image') return;
                try {
                    const item = await db.getStickerImage(activeSticker.content);
                    if (item) await copyBlobToClipboard(item.data);
                } catch (error) {
                    console.error('Failed to copy image:', error);
                }
            }}
            onExportImage={async () => {
                if (activeSticker?.type !== 'text') return;
                try {
                    const blob = await createTextStickerImage(activeSticker);
                    if (blob) downloadBlob(blob, `sticker-${Date.now()}.png`);
                } catch (error) {
                    console.error('Failed to export sticker:', error);
                }
            }}
            onCopyText={() => {
                if (activeSticker?.type === 'text') {
                    void navigator.clipboard.writeText(activeSticker.content);
                }
            }}
            onExportImageSticker={async () => {
                if (activeSticker?.type !== 'image') return;
                try {
                    const item = await db.getStickerImage(activeSticker.content);
                    if (!item) return;
                    const blobUrl = URL.createObjectURL(item.data);
                    try {
                        const blob = await createImageStickerImage({ ...activeSticker, content: blobUrl });
                        if (blob) downloadBlob(blob, `sticker-${Date.now()}.png`);
                    } finally {
                        URL.revokeObjectURL(blobUrl);
                    }
                } catch (error) {
                    console.error('Failed to export image sticker:', error);
                }
            }}
            onOpenSettings={() => onOpenSettings?.({ x: contextMenu.x, y: contextMenu.y })}
            onClearAllStickers={onClearAllStickers}
            rotation={activeSticker?.rotation ?? 0}
            hideStroke={activeSticker?.hideStroke}
            onToggleStroke={() => {
                if (contextMenu.stickerId && activeSticker && activeSticker.type !== 'drawing') {
                    onUpdateSticker(contextMenu.stickerId, { hideStroke: !activeSticker.hideStroke });
                }
            }}
            onChangeFont={() => {
                if (activeSticker) onChangeFont(activeSticker, contextMenu.x, contextMenu.y);
            }}
            onRotateSticker={() => {
                if (activeSticker) onRotateSticker(activeSticker, contextMenu.x, contextMenu.y);
            }}
            linkTarget={activeSticker ? getStickerLinkTarget(activeSticker) : ''}
            anchorId={activeSticker?.anchorId}
            onSetStickerLink={() => {
                if (activeSticker) onSetStickerLink(activeSticker, contextMenu.x, contextMenu.y);
            }}
            isScreenFixed={activeSticker?.positionMode === 'viewport'}
            onToggleScreenFixed={() => {
                if (activeSticker) onToggleScreenFixed(activeSticker);
            }}
            priority={activeSticker?.priority ?? 0}
            onSetPriority={() => {
                if (activeSticker) onSetPriority(activeSticker, contextMenu.x, contextMenu.y);
            }}
            sizeLabel={activeSize ? formatElementSize(activeSize) : undefined}
            canPasteSize={Boolean(copiedSize)}
            onEditSize={() => {
                if (activeSticker) onEditSize(activeSticker, contextMenu.x, contextMenu.y);
            }}
            onPasteSize={() => {
                if (activeSticker) onPasteSize(activeSticker);
            }}
            onCopySize={() => {
                if (activeSize) copyElementSize(activeSize);
            }}
            interactionEffect={activeSticker?.interactionEffect ?? 'none'}
            onSetInteractionEffect={(interactionEffect) => {
                if (activeSticker) onUpdateSticker(activeSticker.id, { interactionEffect });
            }}
            canIconSwap={activeSticker?.type === 'image' && activeSticker.imagePresentation === 'vectorIcon'}
            hasIconSwapContent={Boolean(activeSticker?.iconSwapContent)}
            onEnableIconSwap={() => {
                if (!activeSticker || activeSticker.type !== 'image' || activeSticker.imagePresentation !== 'vectorIcon') return;
                if (activeSticker.iconSwapContent) {
                    onUpdateSticker(activeSticker.id, { interactionEffect: 'iconSwap' });
                } else {
                    onChooseIconSwap(activeSticker);
                }
            }}
            onChooseIconSwap={() => {
                if (activeSticker?.type === 'image' && activeSticker.imagePresentation === 'vectorIcon') onChooseIconSwap(activeSticker);
            }}
            strokeWidth={strokeWidth}
            onEditStroke={() => {
                if (activeSticker) onEditStroke(activeSticker, contextMenu.x, contextMenu.y, strokeWidth);
            }}
            cornerRadius={cornerRadius}
            isDefaultCornerRadius={activeSticker?.cornerRadius === undefined}
            onEditCornerRadius={() => {
                if (activeSticker?.type === 'image') onEditCornerRadius(activeSticker, contextMenu.x, contextMenu.y, cornerRadius);
            }}
            onResetCornerRadius={() => {
                if (activeSticker?.type === 'image') onUpdateSticker(activeSticker.id, { cornerRadius: undefined });
            }}
            isPinned={activeSticker?.isPinned}
            onTogglePin={() => {
                if (contextMenu.stickerId && activeSticker) {
                    onUpdateSticker(contextMenu.stickerId, { isPinned: !activeSticker.isPinned });
                }
            }}
        />
    );
};
