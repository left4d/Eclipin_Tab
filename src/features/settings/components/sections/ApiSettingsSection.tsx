import { BookmarkPermissionCard } from '../permissions/BookmarkPermissionCard';
import { BaiduTranslationSettingsCard } from './BaiduTranslationSettingsCard';
import styles from '../Modal/SettingsModal.module.css';
import apiStyles from './ApiSettingsSection.module.css';

export const ApiSettingsSection = () => (
  <section className={styles.settingsSection}>
    <div className={styles.sectionHeader}>
      <h2>接口</h2>
      <p>集中管理小组件可能用到的浏览器权限、API Key 和个人信息相关凭据。</p>
    </div>
    <div className={`card ${styles.settingsCard}`}>
      <div className={apiStyles.apiCardHeader}>
        <div>
          <div className={styles.cardTitle}>浏览器权限</div>
          <p>浏览器原生能力不需要填写密钥，只需要授权扩展权限。</p>
        </div>
      </div>
      <BookmarkPermissionCard />
    </div>
    <BaiduTranslationSettingsCard />
  </section>
);
