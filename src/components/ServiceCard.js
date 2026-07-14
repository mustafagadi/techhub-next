'use client';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n';
import styles from './ServiceCard.module.css';

// Matches known category names to a real partner logo (same mapping as getCategoryImage in the real site),
// otherwise falls back to a generic icon — we don't invent a logo for an unknown category.
const CATEGORY_LOGOS = {
  sakani: '/images/partner-sakani.svg',
  ejar: '/images/partner-ejar.svg',
  baladi: '/images/partner-baladi.svg',
  balady: '/images/partner-baladi.svg',
  fal: '/images/partner-fal.svg',
  farz: '/images/partner-farz.svg',
  mullak: '/images/partner-mullak.svg',
};

function categoryLogo(tag) {
  if (!tag) return null;
  const key = String(tag).toLowerCase().trim();
  return CATEGORY_LOGOS[key] || null;
}

export default function ServiceCard({ service }) {
  const { t, locale } = useI18n();

  // We handle both the real backend fields (ApiProduct) and sample data together
  const name = service.name;
  const title = service.displayName || service.name;
  const tag = service.tag || service.category;
  const desc = service.description || service.desc || '';
  const ops = service.operationCount ?? service.ops ?? (service.apiProxies?.length);
  const price = service.price;
  const billingType = service.billingType;
  const logo = categoryLogo(tag);

  // Billing type label depending on the language
  const billingLabel = {
    'subscription': t('service_card.billing_subscription'),
    'one-time': t('service_card.billing_one_time'),
    'quota': t('service_card.billing_usage'),
  }[billingType];

  // Numbers follow the language: Latin digits in English, Arabic-Indic digits in Arabic
  const numLocale = locale === 'ar' ? 'ar-SA' : 'en-US';

  return (
    <div className={styles.card}>
      <div className={styles.top}>
        <div className={styles.imgCard}>
          {logo ? <img src={logo} alt="" /> : <span className={styles.imgFallback}>{title.charAt(0)}</span>}
        </div>
        {service.source === 'apic' && <span className={styles.sourceApic}>IBM APIC</span>}
        {service.source === 'apigee' && <span className={styles.sourceApigee}>Apigee</span>}
      </div>
      <h3>{title}</h3>
      <p>{desc}</p>
      <div className={styles.tagsRow}>
        {tag && <span className={styles.tag}>{tag}</span>}
        <span className={styles.tag}>{t('service_card.published')}</span>
      </div>
      <div className={styles.meta}>
        {ops != null && <span>{t('service_card.operations', { count: ops })}</span>}
        {price ? (
          <span className={styles.price}>
            {price.toLocaleString(numLocale)} {t('service_card.currency')}
            {billingLabel && <span className={styles.billing}> · {billingLabel}</span>}
          </span>
        ) : (
          <span className={styles.free}>{t('service_card.free')}</span>
        )}
      </div>
      {/* The real .linkAPI — a black button with an arrow icon, the card's only actual link */}
      <div className={styles.linkApi}>
        <Link href={`/services/${encodeURIComponent(name)}`}>{t('service_card.browse_api')}</Link>
      </div>
    </div>
  );
}
