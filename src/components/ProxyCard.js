'use client';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n';
import styles from './ServiceCard.module.css';

// Proxy card in the catalog [Approach B]
// Shows the proxy and its status: subscribable (a product includes it) or view-only.
export default function ProxyCard({ proxy }) {
  const { t } = useI18n();
  const name = proxy.name;
  const subscribable = proxy.isSubscribable;

  return (
    <Link href={`/services/${encodeURIComponent(name)}`} className={styles.card}>
      <div className={styles.top}>
        <span className={styles.tag}>{t('proxy_card.tag')}</span>
        <span className={subscribable ? styles.status : styles.statusMuted}>
          {subscribable ? t('proxy_card.subscribable') : t('proxy_card.view_only')}
        </span>
      </div>
      <h3>{name}</h3>
      <p>{t('proxy_card.description')}</p>
      <div className={styles.meta}>
        {subscribable
          ? <span className={styles.free}>{t('proxy_card.express_interest')}</span>
          : <span className={styles.muted}>{t('proxy_card.view_docs')}</span>}
      </div>
    </Link>
  );
}
