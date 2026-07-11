'use client';
import { useState, useEffect } from 'react';
import { getMyOrders } from '@/lib/api';
import { fmtDate } from '@/lib/dates';
import RequireAuth from '@/components/RequireAuth';
import Header from '@/components/Header';
import { useI18n } from '@/lib/i18n';
import styles from './orders.module.css';

export default function OrdersPage() {
  return (
    <RequireAuth role="portal-partner">
      <Orders />
    </RequireAuth>
  );
}

// حالة الطلب + لون — يتعامل مع الرقم أو النص
function statusInfo(t, status) {
  const map = {
    0: [t('orders.status_pending'), 'pending'], Pending: [t('orders.status_pending'), 'pending'],
    1: [t('orders.status_paid'), 'paid'], Paid: [t('orders.status_paid'), 'paid'],
    2: [t('orders.status_failed'), 'failed'], Failed: [t('orders.status_failed'), 'failed'],
    3: [t('orders.status_cancelled'), 'cancelled'], Cancelled: [t('orders.status_cancelled'), 'cancelled'],
  };
  return map[status] || ['—', 'pending'];
}

function billingLabel(t, type) {
  return { 0: t('orders.billing_one_time'), 1: t('orders.billing_subscription'), 2: t('orders.billing_usage'),
           OneTime: t('orders.billing_one_time'), Subscription: t('orders.billing_subscription'), Quota: t('orders.billing_usage') }[type] || '';
}

function Orders() {
  const { t } = useI18n();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    getMyOrders()
      .then((d) => setOrders(Array.isArray(d) ? d : (d?.orders || [])))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <Header />
      <div className={styles.page}>
        <div className="container">
          <h1>{t('orders.title')}</h1>
          <p className={styles.sub}>{t('orders.subtitle')}</p>

          {loading ? (
            <div className={styles.state}>{t('common.loading')}</div>
          ) : error ? (
            <div className={styles.error}>{t('orders.error')}</div>
          ) : orders.length === 0 ? (
            <div className={styles.state}>{t('orders.empty')}</div>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>{t('orders.col_service')}</th><th>{t('orders.col_app')}</th><th>{t('orders.col_amount')}</th><th>{t('orders.col_type')}</th><th>{t('orders.col_status')}</th><th>{t('orders.col_date')}</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o, i) => {
                  const [label, cls] = statusInfo(t, o.status);
                  return (
                    <tr key={i}>
                      <td>{o.productName}</td>
                      <td>{o.appName || '—'}</td>
                      <td>{o.amount ? `${o.amount.toLocaleString('ar-SA')} ${o.currency || t('service.currency')}` : t('orders.free')}</td>
                      <td>{billingLabel(t, o.billingType)}</td>
                      <td><span className={`${styles.badge} ${styles[cls]}`}>{label}</span></td>
                      <td>{fmtDate(o.createdAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
