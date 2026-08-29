import React, { useRef, useState } from 'react';
import {
  addCustomFont,
  deleteCustomFont,
  ensureFontLoaded,
  getFontFamily,
  isCustomFontId,
  normalizeFontId,
  type CustomFontId,
  type FontId,
} from '@/shared/constants/builtInFonts';
import { useCustomFonts } from '@/shared/hooks/useCustomFonts';
import styles from './FontPicker.module.css';

interface FontPickerProps {
  value: FontId | undefined;
  onChange: (fontId: FontId) => void;
  previewText?: string;
}

export const FontPicker: React.FC<FontPickerProps> = ({ value, onChange, previewText = '字体预览 12:34' }) => {
  const selectedFont = normalizeFontId(value);
  const { fonts, isLoadingFonts } = useCustomFonts();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [message, setMessage] = useState('');

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setIsImporting(true);
    setMessage('');
    try {
      const font = await addCustomFont(file);
      await ensureFontLoaded(font.id);
      onChange(font.id);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '字体导入失败');
    } finally {
      setIsImporting(false);
    }
  };

  const handleDelete = async (fontId: CustomFontId) => {
    try {
      await deleteCustomFont(fontId);
      if (selectedFont === fontId) onChange('system');
    } catch {
      setMessage('字体删除失败');
    }
  };

  return (
    <div className={styles.root}>
      <input
        ref={inputRef}
        type="file"
        accept=".ttf,.otf,.woff,.woff2,font/ttf,font/otf,font/woff,font/woff2,application/font-woff"
        className={styles.hiddenInput}
        onChange={handleFileChange}
      />

      <button
        type="button"
        className={styles.importButton}
        onClick={() => inputRef.current?.click()}
        disabled={isImporting}
      >
        <span className={styles.importIcon}>＋</span>
        <span>
          <strong>{isImporting ? '正在导入字体…' : '添加本地字体'}</strong>
          <small>支持 TTF、OTF、WOFF、WOFF2，最大 20MB</small>
        </span>
      </button>

      {message && <div className={styles.message} role="status">{message}</div>}

      <div className={styles.list} aria-busy={isLoadingFonts}>
        {fonts.map((font) => {
          const isCustom = isCustomFontId(font.id);
          return (
            <div key={font.id} className={styles.optionRow}>
              <button
                type="button"
                className={`${styles.option} ${selectedFont === font.id ? styles.active : ''}`}
                style={{ fontFamily: getFontFamily(font.id) }}
                onMouseEnter={() => { void ensureFontLoaded(font.id); }}
                onFocus={() => { void ensureFontLoaded(font.id); }}
                onClick={() => onChange(font.id)}
              >
                <span className={styles.optionHeader}>
                  <span>{font.label}</span>
                  {isCustom && <em>本地</em>}
                </span>
                <strong>{isCustom ? previewText : font.preview}</strong>
              </button>
              {isCustom && (
                <button
                  type="button"
                  className={styles.deleteButton}
                  onClick={(event) => {
                    event.stopPropagation();
                    void handleDelete(font.id as CustomFontId);
                  }}
                  title="删除本地字体"
                  aria-label={`删除字体 ${font.label}`}
                >
                  ×
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
