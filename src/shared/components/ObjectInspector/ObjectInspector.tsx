import type { ReactNode } from 'react';
import styles from './ObjectInspector.module.css';

export type ObjectInspectorSection = 'appearance' | 'layout';

interface ObjectInspectorProps {
  kind: string;
  title: string;
  summary?: string;
  activeSection: ObjectInspectorSection;
  onSectionChange: (section: ObjectInspectorSection) => void;
  primaryActions?: ReactNode;
  children: ReactNode;
  onClose?: () => void;
}

export const ObjectInspector = ({
  kind,
  title,
  summary,
  activeSection,
  onSectionChange,
  primaryActions,
  children,
  onClose,
}: ObjectInspectorProps) => (
  <aside className={styles.inspector} data-ui-zone="object-inspector" aria-label={`${kind}编辑器`}>
    <div className={styles.header}>
      <div className={styles.heading}>
        <span className={styles.kind}>{kind}</span>
        <strong title={title}>{title}</strong>
        {summary && <small>{summary}</small>}
      </div>
      {onClose && (
        <button type="button" className={styles.closeButton} onClick={onClose} aria-label="关闭对象编辑器" title="取消选择">
          ×
        </button>
      )}
    </div>

    {primaryActions && <div className={styles.primaryActions}>{primaryActions}</div>}

    <div className={styles.sectionTabs} role="tablist" aria-label="对象编辑分类">
      <button
        type="button"
        role="tab"
        aria-selected={activeSection === 'appearance'}
        className={activeSection === 'appearance' ? styles.activeTab : ''}
        onClick={() => onSectionChange('appearance')}
      >
        外观
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={activeSection === 'layout'}
        className={activeSection === 'layout' ? styles.activeTab : ''}
        onClick={() => onSectionChange('layout')}
      >
        布局
      </button>
    </div>

    <div className={styles.content}>{children}</div>
  </aside>
);
