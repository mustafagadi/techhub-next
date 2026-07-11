'use client';
import { useI18n } from '@/lib/i18n';
import styles from './Footer.module.css';

export default function Footer() {
  const { t } = useI18n();
  return (
    <footer className={styles.footer}>
      <div className="container">
        <div className={styles.top}>
          <div className={styles.brand}>
            <div className={styles.logo}>
              <span className={styles.mark}>T</span>
              <span>{t('common.brand')}</span>
            </div>
            <p>{t('footer.tagline')}</p>
          </div>
        </div>
        <div className={styles.bottom}>
          <span>{t('footer.rights')}</span>
        </div>
      </div>
    </footer>
  );
}
