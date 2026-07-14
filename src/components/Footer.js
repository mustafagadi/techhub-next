'use client';
import { useI18n } from '@/lib/i18n';
import styles from './Footer.module.css';

// الروابط الحقيقية مأخوذة من HTML الموقع المنشور فعليًّا (لا حزر)
const LINK_COLUMNS = [
  {
    titleKey: 'footer.col_links_title',
    links: [
      { key: 'footer.link_ministry', href: 'https://momah.gov.sa/ar' },
      { key: 'footer.link_housing_program', href: 'https://www.vision2030.gov.sa/ar/explore/programs/housing-program' },
      { key: 'footer.link_real_estate_fund', href: 'https://redf.gov.sa/' },
      { key: 'footer.link_rega', href: 'https://rega.gov.sa/' },
      { key: 'footer.link_vision2030', href: 'https://www.vision2030.gov.sa/' },
    ],
  },
  {
    titleKey: 'footer.col_services_title',
    links: [
      { key: 'footer.link_opportunities', href: 'https://nhc.sa/ar/procurement-gate/' },
      { key: 'footer.link_careers', href: 'https://nhc.sa/ar/careers/' },
    ],
  },
  {
    titleKey: 'footer.col_nhc_title',
    links: [
      { key: 'footer.link_about', href: 'https://nhci.sa/nhc-innovation' },
      { key: 'footer.link_digital_products', href: 'https://nhci.sa/المنتجات-والخدمات' },
      { key: 'footer.link_media_center', href: 'https://nhci.sa/المركز-الإعلامي' },
    ],
  },
];

export default function Footer() {
  const { t } = useI18n();
  return (
    <footer className={styles.footer}>
      <div className="container">
        <div className={styles.top}>
          <div className={styles.brand}>
            {/* العلامة المعروضة في الفوتر الحقيقي هي شعار تيك هب نفسه، لا شعار NHC Innovation */}
            <img src="/images/techhub-logo.svg" alt={t('common.brand')} className={styles.brandLogo} />
          </div>

          {LINK_COLUMNS.map((col) => (
            <div key={col.titleKey} className={styles.col}>
              <h4>{t(col.titleKey)}</h4>
              <ul>
                {col.links.map((link) => (
                  <li key={link.key}>
                    <a href={link.href} target="_blank" rel="noopener noreferrer">{t(link.key)}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div className={styles.vision}>
            <img src="/images/vision2030-white.svg" alt={t('footer.vision2030_label')} className={styles.visionMark} />
          </div>
        </div>

        {/* الموقع الفعلي يعرض فقط X وLinkedIn — لا حساب إنستغرام */}
        <div className={styles.social}>
          <a href="https://x.com/NHCinnovation" target="_blank" rel="noopener noreferrer" aria-label={t('footer.social_x')} className={styles.socialBtn}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18.9 2H22l-7.6 8.7L23 22h-6.9l-5.4-6.7L4.5 22H1.3l8.1-9.3L1 2h7.1l4.9 6.1L18.9 2Zm-1.2 18h1.9L7.4 4H5.4l12.3 16Z"/></svg>
          </a>
          <a href="https://www.linkedin.com/company/nhcinnovation" target="_blank" rel="noopener noreferrer" aria-label={t('footer.social_linkedin')} className={styles.socialBtn}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM3 9h4v12H3V9Zm7 0h3.8v1.7h.05c.53-.95 1.83-1.95 3.77-1.95 4.03 0 4.78 2.55 4.78 5.86V21h-4v-5.7c0-1.36-.02-3.1-1.9-3.1-1.9 0-2.2 1.47-2.2 3v5.8h-4V9Z"/></svg>
          </a>
        </div>

        <div className={styles.bottom}>
          <span>{t('footer.rights')}</span>
        </div>
      </div>
    </footer>
  );
}
