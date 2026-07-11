'use client';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n';
import styles from './ServiceCard.module.css';

export default function ServiceCard({ service }) {
  const { t, locale } = useI18n();

  // نتعامل مع حقول الخلفية الحقيقية (ApiProduct) والعيّنات معًا
  const name = service.name;
  const title = service.displayName || service.name;
  const tag = service.tag || service.category;
  const desc = service.description || service.desc || '';
  const ops = service.operationCount ?? service.ops ?? (service.apiProxies?.length);
  const price = service.price;
  const billingType = service.billingType;

  // تسمية نوع الفوترة حسب اللغة
  const billingLabel = {
    'subscription': t('service_card.billing_subscription'),
    'one-time': t('service_card.billing_one_time'),
    'quota': t('service_card.billing_usage'),
  }[billingType];

  // الأرقام تتبع اللغة: لاتينية بالإنجليزية، عربية-هندية بالعربية
  const numLocale = locale === 'ar' ? 'ar-SA' : 'en-US';

  return (
    <Link href={`/services/${encodeURIComponent(name)}`} className={styles.card}>
      <div className={styles.top}>
        {tag && <span className={styles.tag}>{tag}</span>}
        {service.source === 'apic' && <span className={styles.sourceApic}>IBM APIC</span>}
        {service.source === 'apigee' && <span className={styles.sourceApigee}>Apigee</span>}
        <span className={styles.status}>{t('service_card.published')}</span>
      </div>
      <h3>{title}</h3>
      <p>{desc}</p>
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
    </Link>
  );
}
