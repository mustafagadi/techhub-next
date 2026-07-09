'use client';
import { useState, useEffect } from 'react';
import { getMyOrders } from '@/lib/api';
import { fmtDate } from '@/lib/dates';
import RequireAuth from '@/components/RequireAuth';
import Header from '@/components/Header';
import styles from './orders.module.css';

export default function OrdersPage() {
  return (
    <RequireAuth role="portal-partner">
      <Orders />
    </RequireAuth>
  );
}

// حالة الطلب بالعربية + لون
function statusInfo(status) {
  // يتعامل مع الرقم أو النص
  const map = {
    0: ['بانتظار الدفع', 'pending'], Pending: ['بانتظار الدفع', 'pending'],
    1: ['مدفوع', 'paid'], Paid: ['مدفوع', 'paid'],
    2: ['فشل', 'failed'], Failed: ['فشل', 'failed'],
    3: ['ملغى', 'cancelled'], Cancelled: ['ملغى', 'cancelled'],
  };
  return map[status] || ['—', 'pending'];
}

function billingLabel(type) {
  return { 0: 'مرة واحدة', 1: 'اشتراك', 2: 'حسب الاستهلاك',
           OneTime: 'مرة واحدة', Subscription: 'اشتراك', Quota: 'حسب الاستهلاك' }[type] || '';
}

function Orders() {
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
          <h1>طلباتي وفواتيري</h1>
          <p className={styles.sub}>سجلّ اشتراكاتك ومدفوعاتك في الخدمات.</p>

          {loading ? (
            <div className={styles.state}>جارٍ التحميل…</div>
          ) : error ? (
            <div className={styles.error}>تعذّر الاتصال بالخادم. أعد المحاولة لاحقًا.</div>
          ) : orders.length === 0 ? (
            <div className={styles.state}>لا توجد طلبات بعد. اشترك في خدمة لتظهر هنا.</div>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>الخدمة</th><th>التطبيق</th><th>المبلغ</th><th>النوع</th><th>الحالة</th><th>التاريخ</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o, i) => {
                  const [label, cls] = statusInfo(o.status);
                  return (
                    <tr key={i}>
                      <td>{o.productName}</td>
                      <td>{o.appName || '—'}</td>
                      <td>{o.amount ? `${o.amount.toLocaleString('ar-SA')} ${o.currency || 'ر.س'}` : 'مجانية'}</td>
                      <td>{billingLabel(o.billingType)}</td>
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
