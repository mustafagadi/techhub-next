'use client';
import { useState } from 'react';
import ServiceCard from './ServiceCard';
import { useI18n } from '@/lib/i18n';
import styles from '@/app/page.module.css';

const PARTNER_LOGOS = [
  { src: '/images/partner-sakani.svg', alt: 'Sakani' },
  { src: '/images/partner-ejar.svg', alt: 'Ejar' },
  { src: '/images/partner-baladi.svg', alt: 'Baladi' },
  { src: '/images/partner-fal.svg', alt: 'Fal' },
  { src: '/images/partner-farz.svg', alt: 'Farz' },
  { src: '/images/partner-mullak.svg', alt: 'Mullak' },
];

// Collapsible FAQ item — matches the real FaqItem behavior (clicking the title opens/closes the answer)
function FaqItem({ question, answer }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={styles.faqItem}>
      <button type="button" className={styles.faqQuestion} onClick={() => setOpen(!open)}>
        {question}
        <span className={`${styles.faqChevron} ${open ? styles.faqChevronOpen : ''}`}>⌄</span>
      </button>
      <div className={`${styles.faqAnswer} ${open ? styles.faqAnswerOpen : ''}`}>{answer}</div>
    </div>
  );
}

// Homepage sections — a client component so it can use translations.
// Data fetching stays in the page (server-side) and is passed down to it.
export default function HomeSections({ featured }) {
  const { t } = useI18n();

  const advantages = [
    { t: t('home.adv_1_t'), d: t('home.adv_1_d') },
    { t: t('home.adv_2_t'), d: t('home.adv_2_d') },
    { t: t('home.adv_3_t'), d: t('home.adv_3_d') },
    { t: t('home.adv_4_t'), d: t('home.adv_4_d') },
  ];

  const faqs = [
    { q: t('home.faq_1_q'), a: t('home.faq_1_a') },
    { q: t('home.faq_2_q'), a: t('home.faq_2_a') },
    { q: t('home.faq_3_q'), a: t('home.faq_3_a') },
  ];

  return (
    <>
      <section className={styles.hero}>
        <div className={styles.heroGrid} />
        <div className="container">
          <div className={styles.heroInner}>
            <span className={styles.eyebrow}>{t('home.eyebrow')}</span>
            <h1>{t('home.hero_title')}</h1>
            <p>{t('home.hero_sub')}</p>
            <div className={styles.actions}>
              <a href="/services" className="btn btn-primary">{t('home.cta_browse')}</a>
              <a href="#advantages" className="btn btn-ghost">{t('home.cta_advantages')}</a>
            </div>
            {/* An actual scroll link to the services section — not a non-functional decoration like before */}
            <a href="#services" className={styles.scrollDown} aria-label={t('home.scroll_to_services')}>
              <span className={styles.scrollDownIcon} />
            </a>
          </div>
        </div>
      </section>

      <section className={styles.block} id="services">
        <div className="container">
          <div className={styles.head}>
            <h2>{t('home.services_title')}</h2>
            <p>{t('home.services_sub')}</p>
          </div>
          {featured.length > 0 ? (
            <div className={styles.grid}>
              {featured.map((s) => <ServiceCard key={s.name} service={s} />)}
            </div>
          ) : (
            <div className={styles.empty}>{t('home.services_empty')}</div>
          )}
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

      <section className={styles.block}>
        <div className="container">
          <h2 className={styles.partnersTitle}>{t('partners.title')}</h2>
          <div className={styles.partnersGrid}>
            {PARTNER_LOGOS.map((p) => (
              <div key={p.src} className={styles.partnerCard}>
                <img src={p.src} alt={p.alt} />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.contact} id="Contact">
        <div className="container">
          <h2 className={styles.partnersTitle}>{t('home.contact_title')}</h2>
          <div className={styles.contactGrid}>
            <div className={styles.faqCol}>
              <h3 className={styles.contactColTitle}>{t('home.faq_title')}</h3>
              {faqs.map((f) => <FaqItem key={f.q} question={f.q} answer={f.a} />)}
            </div>
            <div className={styles.supportCol}>
              <h3 className={styles.contactColTitle}>{t('home.support_title')}</h3>
              <div className={styles.supportCard}>
                <div className={styles.supportIcon}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 6l8.91 5.917c1.55 1.028 2.62 1.028 4.17 0L24 6" strokeLinejoin="round" /><path d="M2.02 13.48c.06 3.06.1 4.59 1.23 5.73 1.13 1.13 2.7 1.17 5.85 1.25 1.94.05 3.86.05 5.8 0 3.15-.08 4.72-.12 5.85-1.25 1.13-1.14 1.17-2.67 1.23-5.73.02-.98.02-1.96 0-2.95-.06-3.06-.1-4.6-1.23-5.73C19.62 3.62 18.05 3.58 14.9 3.5a123 123 0 0 0-5.8 0C5.95 3.58 4.38 3.62 3.25 4.75 2.12 5.89 2.08 7.42 2.02 10.48c-.02.98-.02 1.96 0 2.95Z" strokeLinejoin="round" /></svg>
                </div>
                <div className={styles.supportTitle}>{t('home.email_title')}</div>
                <div className={styles.supportDesc}>
                  {t('home.email_desc')}{' '}
                  <a href="mailto:techhub@nhci.sa">techhub@nhci.sa</a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
