import { useState } from 'react';
import styles from './OpenTabsWidget.module.css';

export const FloppyIcon = ({ filled = false }: { filled?: boolean }) => (
  <svg className={styles.actionSvg} viewBox="0 0 24 24" aria-hidden="true">
    <path
      d="M4.25 3.75h11.9l3.6 3.6v12.9H4.25V3.75Zm3 0v6h8v-6m-8 10h9.5v6.5h-9.5v-6.5Z"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.55"
      strokeLinejoin="round"
    />
    {filled ? <rect x="8.5" y="15.2" width="7" height="3.8" rx="0.8" fill="currentColor" opacity="0.34" /> : null}
  </svg>
);

export const RestoreIcon = () => (
  <svg className={styles.actionSvg} viewBox="0 0 24 24" aria-hidden="true">
    <path d="M8 7.5h9.25v9.25M17 7.75 7.25 17.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const TrashIcon = () => (
  <svg className={styles.actionSvg} viewBox="0 0 24 24" aria-hidden="true">
    <path d="M8.25 8.5v9.25m3.75-9.25v9.25m3.75-9.25v9.25M5.5 6.25h13M9 6.25l.65-2h4.7l.65 2m-8 0 .75 14h8.5l.75-14" fill="none" stroke="currentColor" strokeWidth="1.55" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const PencilIcon = () => (
  <svg className={styles.actionSvg} viewBox="0 0 24 24" aria-hidden="true">
    <path d="m6.25 16.9-.65 2.65 2.65-.65L17.7 9.45l-2.05-2.05-9.4 9.5ZM14.55 8.5l2.05 2.05M14.9 6.45l1.15-1.15a1.35 1.35 0 0 1 1.9 0l.75.75a1.35 1.35 0 0 1 0 1.9L17.55 9.1" fill="none" stroke="currentColor" strokeWidth="1.55" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const CloseIcon = () => (
  <svg className={styles.actionSvg} viewBox="0 0 24 24" aria-hidden="true">
    <path d="m7.5 7.5 9 9m0-9-9 9" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

export const TabIcon = ({ tab }: { tab: { displayDomain: string; title: string; favIconUrl?: string } }) => {
  const [failed, setFailed] = useState(false);
  const first = (tab.displayDomain || tab.title || '?').trim().charAt(0).toUpperCase() || '?';
  if (!tab.favIconUrl || failed) return <span className={styles.faviconFallback}>{first}</span>;
  return <img className={styles.favicon} src={tab.favIconUrl} alt="" onError={() => setFailed(true)} />;
};
