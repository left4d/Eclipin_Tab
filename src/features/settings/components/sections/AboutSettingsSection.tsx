import styles from '../Modal/SettingsModal.module.css';

export const AboutSettingsSection = () => (
  <section className={styles.settingsSection}>
    <div className={styles.sectionHeader}>
      <h2>关于</h2>
      <p>Eclipin 的项目来源、致谢与开源许可。</p>
    </div>

    <div className={`card ${styles.settingsCard}`}>
      <div className={styles.cardTitle}>项目来源与致谢</div>
      <p>Eclipin Tab 是基于 EclipseTab 的修改与延伸版本，自 2026 年起继续维护和扩展。</p>
      <p>感谢原作者 ENCRE0520 创建并开源 EclipseTab，为本项目提供了核心设计与实现基础。</p>
      <p>同时感谢原项目贡献者 SheepTAO（WebDAV 云端同步）、lycohana（文字贴纸超链接解析）以及其他贡献者。</p>
    </div>

    <div className={`card ${styles.settingsCard}`}>
      <div className={styles.cardTitle}>开源许可</div>
      <p>本项目继续按 GNU GPL v3.0（GPL-3.0-only）发布。你可以依照许可证复制、修改和再发布本项目。</p>
      <p>本程序不提供任何担保；完整许可证文本见项目根目录 LICENSE 文件。</p>
    </div>

    <div className={styles.footer}>
      <a className={styles.githubLink} href="https://github.com/left4d/Eclipin_Tab" target="_blank" rel="noopener noreferrer"><span>项目仓库</span></a>
      <span className={styles.footerDivider}>·</span>
      <a className={styles.githubLink} href="https://github.com/ENCRE0520/EclipseTab" target="_blank" rel="noopener noreferrer"><span>原项目 EclipseTab</span></a>
      <span className={styles.footerDivider}>·</span>
      <a className={styles.githubLink} href="https://www.gnu.org/licenses/gpl-3.0.html" target="_blank" rel="noopener noreferrer"><span>GNU GPL v3.0</span></a>
    </div>
  </section>
);
