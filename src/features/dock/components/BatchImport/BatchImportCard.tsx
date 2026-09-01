import React, { useState, useEffect, useRef, useCallback } from 'react';
import { fetchAndProcessIcon, generateTextIcon } from '@/features/dock/utils/iconFetcher';
import { compressIcon } from '@/features/theme/utils/imageCompression';
import { normalizeUrl } from '@/shared/utils/url';
import { isFaviconRef, getDomainFromRef, resolveIconUrl } from '@/features/dock/utils/iconCache';
import { useLanguage } from '@/shared/context/LanguageContext';
import styles from './BatchImport.module.css';

export interface CardData {
    id: string;
    name: string;
    url: string;
    icon: string;
    iconSmall: boolean;
}

interface BatchImportCardProps {
    data: CardData;
    index: number;
    canRemove: boolean;
    onChange: (id: string, data: Partial<CardData>) => void;
    onRemove: (id: string) => void;
}

export const BatchImportCard: React.FC<BatchImportCardProps> = ({
    data,
    index,
    canRemove,
    onChange,
    onRemove,
}) => {
    const { t } = useLanguage();
    const [iconPreviewUrl, setIconPreviewUrl] = useState('');
    const [isFetchingIcon, setIsFetchingIcon] = useState(false);
    const [isRemoving, setIsRemoving] = useState(false);
    const [isEntering, setIsEntering] = useState(true);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);
    // 用于防抖的计时器
    const debounceTimerRef = useRef<ReturnType<typeof setTimeout>>();
    // 保持最新的 data 引用，避免异步回调中的闭包陈旧问题
    const dataRef = useRef(data);
    dataRef.current = data;

    // 入场动画：挂载时先设置初始状态，下一帧移除
    useEffect(() => {
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                setIsEntering(false);
            });
        });
    }, []);

    // 组件卸载时清理防抖计时器
    useEffect(() => {
        return () => {
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
        };
    }, []);

    const handleRemove = useCallback(() => {
        setIsRemoving(true);
        setTimeout(() => onRemove(data.id), 300);
    }, [data.id, onRemove]);

    // 解析 icon 为可预览的 URL
    useEffect(() => {
        if (!data.icon) {
            setIconPreviewUrl('');
            return;
        }
        if (isFaviconRef(data.icon)) {
            let cancelled = false;
            const domain = getDomainFromRef(data.icon);
            resolveIconUrl(domain).then(url => {
                if (!cancelled) setIconPreviewUrl(url || '');
            });
            return () => { cancelled = true; };
        }
        setIconPreviewUrl(data.icon);
    }, [data.icon]);

    // 防抖获取图标的核心逻辑
    const debouncedFetchIcon = useCallback((value: string) => {
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }
        debounceTimerRef.current = setTimeout(async () => {
            const normalized = normalizeUrl(value);
            if (!normalized.includes('.') && !normalized.includes('localhost')) return;

            setIsFetchingIcon(true);
            try {
                const { url: processedIcon, isFallback, iconSmall: isSmall } = await fetchAndProcessIcon(normalized, 100);
                // 使用 dataRef 读取最新的 data，避免闭包陈旧
                const currentData = dataRef.current;
                if (currentData.icon) return; // 用户已手动设置图标，跳过
                if (isFallback) {
                    const hue = Math.floor(Math.random() * 360);
                    const textToUse = currentData.name.trim() || value;
                    if (textToUse) {
                        onChange(currentData.id, { icon: generateTextIcon(textToUse, hue), iconSmall: false });
                    }
                } else {
                    onChange(currentData.id, { icon: processedIcon, iconSmall: !!isSmall });
                }
            } catch {
                // 静默失败
            } finally {
                setIsFetchingIcon(false);
            }
        }, 400);
    }, [onChange]);

    const handleUrlChange = useCallback((value: string) => {
        onChange(data.id, { url: value });

        if (value && !data.icon) {
            debouncedFetchIcon(value);
        }
    }, [data.id, data.icon, onChange, debouncedFetchIcon]);

    const handleFetchIcon = async () => {
        if (!data.url) return;
        setIsFetchingIcon(true);
        try {
            const normalized = normalizeUrl(data.url);
            const { url: processedIcon, isFallback, iconSmall: isSmall } = await fetchAndProcessIcon(normalized, 0, true, true);
            const currentData = dataRef.current;
            if (isFallback) {
                const hue = Math.floor(Math.random() * 360);
                const textToUse = currentData.name.trim() || currentData.url;
                if (textToUse) {
                    onChange(currentData.id, { icon: generateTextIcon(textToUse, hue), iconSmall: false });
                }
            } else {
                onChange(currentData.id, { icon: processedIcon, iconSmall: !!isSmall });
            }
        } catch {
            // 静默失败
        } finally {
            setIsFetchingIcon(false);
        }
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = async (event) => {
                const dataUrl = event.target?.result as string;
                const compressed = await compressIcon(dataUrl);
                onChange(data.id, { icon: compressed, iconSmall: false });
            };
            reader.readAsDataURL(file);
        }
    };

    const handleUseTextIcon = () => {
        const hue = Math.floor(Math.random() * 360);
        const textToUse = data.name.trim() || data.url;
        if (textToUse) {
            onChange(data.id, { icon: generateTextIcon(textToUse, hue), iconSmall: false });
        }
    };

    return (
        <div
            ref={wrapperRef}
            className={`${styles.cardWrapper} ${isRemoving ? styles.removing : ''}`}
            style={isEntering ? { opacity: 0, transform: 'scale(0.92)' } : undefined}
        >
            <div className={`card ${styles.card}`}>
                <div className={styles.cardHeader}>
                    <span>#{index + 1}</span>
                    {canRemove && (
                        <button className={styles.cardRemove} onClick={handleRemove}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            </svg>
                        </button>
                    )}
                </div>
                <div className={styles.cardDivider} />

                <div className={styles.formGroup}>
                    <label className={styles.label}>{t.modal.address}</label>
                    <input
                        type="text"
                        className={`field ${styles.input}`}
                        value={data.url}
                        onChange={e => handleUrlChange(e.target.value)}
                        placeholder="https://"
                    />
                </div>

                <div className={styles.formGroup}>
                    <label className={styles.label}>{t.modal.name}</label>
                    <input
                        type="text"
                        className={`field ${styles.input}`}
                        value={data.name}
                        onChange={e => onChange(data.id, { name: e.target.value })}
                        placeholder="Name"
                    />
                </div>

                <div className={styles.formGroup}>
                    <label className={styles.label}>{t.modal.icon}</label>
                    <div className={styles.iconSection}>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*,.svg"
                            onChange={handleFileSelect}
                            style={{ display: 'none' }}
                        />
                        <div className={styles.iconPreview}>
                            {iconPreviewUrl ? (
                                <img src={iconPreviewUrl} alt="Icon" className={styles.iconImage} />
                            ) : (
                                <div className={styles.iconPlaceholder} />
                            )}
                        </div>
                        <div className={styles.iconActions}>
                            <button
                                type="button"
                                className={styles.actionButton}
                                onClick={handleFetchIcon}
                                disabled={isFetchingIcon || !data.url}
                            >
                                <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                                    <path d="M3.65 6.35L5.65 8.35C5.74 8.45 5.87 8.5 6 8.5C6.13 8.5 6.26 8.45 6.35 8.35L8.35 6.35C8.54 6.16 8.54 5.84 8.35 5.65C8.16 5.46 7.84 5.46 7.65 5.65L6.5 6.79V4C6.5 3.72 6.28 3.5 6 3.5C5.72 3.5 5.5 3.72 5.5 4V6.79L4.35 5.65C4.16 5.46 3.84 5.46 3.65 5.65C3.46 5.84 3.46 6.16 3.65 6.35Z" fill="currentColor" />
                                    <path d="M0.5 6C0.5 2.96 2.96 0.5 6 0.5C9.04 0.5 11.5 2.96 11.5 6C11.5 9.04 9.04 11.5 6 11.5C2.96 11.5 0.5 9.04 0.5 6ZM6 1.5C3.52 1.5 1.5 3.52 1.5 6C1.5 8.48 3.52 10.5 6 10.5C8.48 10.5 10.5 8.48 10.5 6C10.5 3.52 8.48 1.5 6 1.5Z" fill="currentColor" />
                                </svg>
                                {t.modal.getFromWebsite}
                            </button>
                            <button type="button" className={styles.actionButton} onClick={handleUseTextIcon}>
                                <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
                                    <path d="M2.5 3.5C2.5 2.95 2.95 2.5 3.5 2.5H12.5C13.05 2.5 13.5 2.95 13.5 3.5V4.5C13.5 4.78 13.28 5 13 5H12.5C12.22 5 12 4.78 12 4.5V4H9V12H10C10.28 12 10.5 12.22 10.5 12.5V13C10.5 13.28 10.28 13.5 10 13.5H6C5.72 13.5 5.5 13.28 5.5 13V12.5C5.5 12.22 5.72 12 6 12H7V4H4V4.5C4 4.78 3.78 5 3.5 5H3C2.72 5 2.5 4.78 2.5 4.5V3.5Z" fill="currentColor" />
                                </svg>
                                {t.modal.useTextIcon}
                            </button>
                            <button type="button" className={styles.actionButton} onClick={() => fileInputRef.current?.click()}>
                                <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                                    <path d="M3.65 5.65L5.65 3.65C5.74 3.55 5.87 3.5 6 3.5C6.13 3.5 6.26 3.55 6.35 3.65L8.35 5.65C8.54 5.84 8.54 6.16 8.35 6.35C8.16 6.54 7.84 6.54 7.65 6.35L6.5 5.21V8C6.5 8.28 6.28 8.5 6 8.5C5.72 8.5 5.5 8.28 5.5 8V5.21L4.35 6.35C4.16 6.54 3.84 6.54 3.65 6.35C3.46 6.16 3.46 5.84 3.65 5.65Z" fill="currentColor" />
                                    <path d="M0.5 6C0.5 2.96 2.96 0.5 6 0.5C9.04 0.5 11.5 2.96 11.5 6C11.5 9.04 9.04 11.5 6 11.5C2.96 11.5 0.5 9.04 0.5 6ZM6 1.5C3.52 1.5 1.5 3.52 1.5 6C1.5 8.48 3.52 10.5 6 10.5C8.48 10.5 10.5 8.48 10.5 6C10.5 3.52 8.48 1.5 6 1.5Z" fill="currentColor" />
                                </svg>
                                {t.modal.uploadNewIcon}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
