'use client';
import ServiceCard from './ServiceCard';
import { useI18n } from '@/lib/i18n';
import styles from '@/app/page.module.css';

// أقسام الصفحة الرئيسية — مكوّن عميل ليستطيع استخدام الترجمة.
// جلب البيانات يبقى في الصفحة (خادمي) وتُمرَّر إليه.
export default function HomeSections({ featured }) {
  const { t } = useI18n();

  const advantages = [
    { t: t('home.adv_1_t'), d: t('home.adv_1_d') },
    { t: t('home.adv_2_t'), d: t('home.adv_2_d') },
    { t: t('home.adv_3_t'), d: t('home.adv_3_d') },
    { t: t('home.adv_4_t'), d: t('home.adv_4_d') },
  ];

  return (
    <>
      <section className={styles.hero}>
        <div className={styles.heroGrid} />
        <div className="container">
          <div className={styles.heroInner}>
            <span className={styles.eyebrow}>{t('home.eyebrow')}</span>
            <h1>
              {t('home.hero_title_1')}{' '}
              <span className={styles.accent}>{t('home.hero_title_accent')}</span>{' '}
              {t('home.hero_title_2')}
            </h1>
            <p>{t('home.hero_sub')}</p>
            <div className={styles.actions}>
              <a href="/services" className="btn btn-primary">{t('home.cta_browse')}</a>
              <a href="#advantages" className="btn btn-ghost">{t('home.cta_advantages')}</a>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.block} id="services">
        <div className="container">
          <div className={styles.head}>
            <h2>{t('home.services_title')}</h2>
            <p>{t('home.services_sub')}</p>
          </div>
          <div className={styles.grid}>
            {featured.map((s) => <ServiceCard key={s.name} service={s} />)}
          </div>
          <div className={styles.more}>
            <a href="/services" className="btn btn-primary">{t('home.all_services')}</a>
          </div>
        </div>
      </section>

      <section className={`${styles.block} ${styles.cloud}`} id="advantages">
        <div className="container">
          <div className={styles.head}>
            <h2>{t('home.adv_title')}</h2>
            <p>{t('home.adv_sub')}</p>
          </div>
          <div className={styles.advGrid}>
            {advantages.map((a) => (
              <div key={a.t} className={styles.adv}>
                <div className={styles.advIcon} />
                <h3>{a.t}</h3>
                <p>{a.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
