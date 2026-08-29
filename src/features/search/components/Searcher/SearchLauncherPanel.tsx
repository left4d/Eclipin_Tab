import React from 'react';
import styles from './SearchLauncherPanel.module.css';

export interface SearchLauncherItem {
  id: string;
  title: string;
  description?: string;
  badge?: string;
  meta?: string;
}

interface SearchLauncherPanelProps {
  title: string;
  items: SearchLauncherItem[];
  activeIndex: number;
  placement?: 'above' | 'below';
  onSelect: (item: SearchLauncherItem, index: number) => void;
  onHover: (index: number) => void;
  headerActionLabel?: string;
  onHeaderAction?: () => void;
  shortcutChips?: Array<{ token: string; label: string }>;
  onShortcutChipClick?: (token: string) => void;
  footerHint?: string;
}

export const SearchLauncherPanel: React.FC<SearchLauncherPanelProps> = ({
  title,
  items,
  activeIndex,
  placement = 'above',
  onSelect,
  onHover,
  headerActionLabel,
  onHeaderAction,
  shortcutChips = [],
  onShortcutChipClick,
  footerHint,
}) => {
  if (items.length === 0 && shortcutChips.length === 0) return null;

  return (
    <div
      id="search-launcher"
      className={`${styles.panel} ${placement === 'below' ? styles.panelBelow : styles.panelAbove}`}
      role="listbox"
      aria-label={title}
      data-page-scroll-lock="true"
    >
      <div className={styles.header}>
        <span>{title}</span>
        {headerActionLabel && onHeaderAction && (
          <button type="button" className={styles.headerAction} onMouseDown={(event) => event.preventDefault()} onClick={onHeaderAction}>
            {headerActionLabel}
          </button>
        )}
      </div>

      {items.length > 0 && (
        <div className={styles.items}>
          {items.map((item, index) => (
            <button
              key={item.id}
              type="button"
              role="option"
              aria-selected={activeIndex === index}
              className={`${styles.item} ${activeIndex === index ? styles.itemActive : ''}`}
              onMouseDown={(event) => event.preventDefault()}
              onMouseEnter={() => onHover(index)}
              onClick={() => onSelect(item, index)}
            >
              <span className={styles.badge}>{item.badge ?? '→'}</span>
              <span className={styles.itemCopy}>
                <strong>{item.title}</strong>
                {item.description && <small>{item.description}</small>}
              </span>
              {item.meta && <kbd className={styles.meta}>{item.meta}</kbd>}
            </button>
          ))}
        </div>
      )}

      {(shortcutChips.length > 0 || footerHint) && (
        <div className={styles.footer}>
          {shortcutChips.length > 0 && (
            <div className={styles.chips} aria-label="Search shortcuts">
              {shortcutChips.map((shortcut) => (
                <button
                  key={shortcut.token}
                  type="button"
                  className={styles.chip}
                  title={shortcut.label}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => onShortcutChipClick?.(shortcut.token)}
                >
                  <code>{shortcut.token}</code>
                  <span>{shortcut.label}</span>
                </button>
              ))}
            </div>
          )}
          {footerHint && <span className={styles.footerHint}>{footerHint}</span>}
        </div>
      )}
    </div>
  );
};
