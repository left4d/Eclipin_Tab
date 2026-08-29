import { useState } from 'react';
import {
  BAIDU_TRANSLATE_API_URL,
  loadBaiduTranslationCredentials,
  saveBaiduTranslationCredentials,
} from '@/features/translation/services/translationProviders';
import { requestHostPermissionForUrl } from '@/shared/utils/hostPermission';
import { navigateToUrl } from '@/shared/utils/url';
import sharedStyles from '../Modal/SettingsModal.module.css';
import styles from './ApiSettingsSection.module.css';

export const BaiduTranslationSettingsCard = () => {
  const initial = loadBaiduTranslationCredentials();
  const [appId, setAppId] = useState(initial.appId);
  const [secretKey, setSecretKey] = useState(initial.secretKey);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(initial.appId && initial.secretKey
    ? '已保存百度翻译凭据，可在翻译小组件中切换到百度。'
    : '填写百度翻译开放平台的 APP ID 与密钥后，可在小组件内直接翻译。');

  const saveAndAuthorize = async () => {
    if (!appId.trim() || !secretKey.trim() || saving) return;
    setSaving(true);
    saveBaiduTranslationCredentials({ appId, secretKey });
    const granted = await requestHostPermissionForUrl(BAIDU_TRANSLATE_API_URL);
    saveBaiduTranslationCredentials({ appId, secretKey });
    setStatus(granted
      ? '已保存并授权百度翻译接口。'
      : '凭据已保存，但网络权限未授权；可稍后再次点击“保存并授权”。');
    setSaving(false);
  };

  return (
    <div className={sharedStyles.settingsCard}>
      <div className={styles.apiCardHeader}>
        <div>
          <div className={sharedStyles.cardTitle}>百度翻译</div>
          <p>使用百度通用文本翻译 API。凭据仅保存在当前浏览器本地，不写入组件布局。</p>
        </div>
      </div>
      <div className={styles.apiCredentialGrid}>
        <label className={styles.apiCredentialField}>
          <span>APP ID</span>
          <input value={appId} onChange={(event) => setAppId(event.target.value)} autoComplete="off" placeholder="百度翻译 APP ID" />
        </label>
        <label className={styles.apiCredentialField}>
          <span>密钥</span>
          <input type="password" value={secretKey} onChange={(event) => setSecretKey(event.target.value)} autoComplete="new-password" placeholder="百度翻译密钥" />
        </label>
      </div>
      <div className={styles.apiActions}>
        <span className={styles.apiStatus}>{status}</span>
        <div className={styles.apiButtons}>
          <button type="button" onClick={() => navigateToUrl('https://fanyi-api.baidu.com/', { openInNewTab: true })}>开放平台 ↗</button>
          <button type="button" disabled={!appId.trim() || !secretKey.trim() || saving} onClick={() => void saveAndAuthorize()}>
            {saving ? '授权中…' : '保存并授权'}
          </button>
        </div>
      </div>
      <p className={styles.apiHint}>百度官方接口要求 APP ID、随机 salt 与 MD5 签名；项目会在浏览器本地完成签名后请求接口。</p>
    </div>
  );
};
