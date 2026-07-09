import Link from 'next/link';
import styles from './ServiceCard.module.css';

export default function ServiceCard({ service }) {
  // نتعامل مع حقول الخلفية الحقيقية (ApiProduct) والعيّنات معًا
  const name = service.name;
  const title = service.displayName || service.name;
  const tag = service.tag || service.category;
  const desc = service.description || service.desc || '';
  const ops = service.operationCount ?? service.ops ?? (service.apiProxies?.length);
  const price = service.price;
  const billingType = service.billingType;

  // تسمية نوع الفوترة بالعربية
  const billingLabel = {
    'subscription': 'اشتراك',
    'one-time': 'مرة واحدة',
    'quota': 'حسب الاستهلاك',
  }[billingType];

  return (
    <Link href={`/services/${encodeURIComponent(name)}`} className={styles.card}>
      <div className={styles.top}>
        {tag && <span className={styles.tag}>{tag}</span>}
        {service.source === 'apic' && <span className={styles.sourceApic}>IBM APIC</span>}
        {service.source === 'apigee' && <span className={styles.sourceApigee}>Apigee</span>}
        <span className={styles.status}>منشورة</span>
      </div>
      <h3>{title}</h3>
      <p>{desc}</p>
      <div className={styles.meta}>
        {ops != null && <span>{ops} عمليات</span>}
        {price ? (
          <span className={styles.price}>
            {price.toLocaleString('ar-SA')} ر.س
            {billingLabel && <span className={styles.billing}> · {billingLabel}</span>}
          </span>
        ) : (
          <span className={styles.free}>مجانية</span>
        )}
      </div>
    </Link>
  );
}
