import { useEffect, useState } from 'react';
import { useLanguage } from '@/shared/context/LanguageContext';
import styles from '../Modal/SettingsModal.module.css';

const REQUIRED_ORIGINS = [
  'https://suggestqueries.google.com/*',
  'https://www.google.com/*',
  'https://suggestion.baidu.com/*',
];

export const PermissionToggle = () => {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const { t } = useLanguage();

  useEffect(() => {
    if (typeof chrome !== 'undefined' && chrome.permissions) {
      chrome.permissions.contains({ origins: REQUIRED_ORIGINS }, setEnabled);
      return;
    }
    setEnabled(localStorage.getItem('search_suggestions_enabled') === 'true');
  }, []);

  const handleToggle = () => {
    if (loading || enabled === null) return;
    setLoading(true);

    if (typeof chrome === 'undefined' || !chrome.permissions) {
      window.setTimeout(() => {
        const next = !enabled;
        setEnabled(next);
        localStorage.setItem('search_suggestions_enabled', String(next));
        setLoading(false);
      }, 300);
      return;
    }

    if (enabled) {
      chrome.permissions.remove({ origins: REQUIRED_ORIGINS }, (removed) => {
        if (removed) setEnabled(false);
        setLoading(false);
      });
      return;
    }

    chrome.permissions.request({ origins: REQUIRED_ORIGINS }, (granted) => {
      setEnabled(granted);
      setLoading(false);
    });
  };

  if (enabled === null) return <div className={styles.layoutToggleGroup}>...</div>;

  return (
    <div className={`${styles.layoutToggleGroup} ${loading ? styles.loading : ''}`}>
      <div className={styles.layoutHighlight} style={{ transform: `translateX(${enabled ? 0 : 100}%)` }} />
      <button className={styles.layoutToggleOption} onClick={enabled ? undefined : handleToggle} title={t.settings.on}>
        {t.settings.on}
      </button>
      <button className={styles.layoutToggleOption} onClick={!enabled ? undefined : handleToggle} title={t.settings.off}>
        {t.settings.off}
      </button>
    </div>
  );
};
