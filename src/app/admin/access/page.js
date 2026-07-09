'use client';
import { useState, useEffect, useCallback } from 'react';
import { getAccessRequests, approveAccess, rejectAccess } from '@/lib/api';
import styles from '../admin.module.css';

export default function AccessPage() {
  const [access, setAccess] = useState([]);
  const [accessLoading, setAccessLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [busy, setBusy] = useState(null);
  const [toast, setToast] = useState(null);

  const loadAccess = useCallback(() => {
    setAccessLoading(true);
    setLoadError(false);
    getAccessRequests()
      .then((d) => setAccess(Array.isArray(d) ? d : []))
      .catch(() => setLoadError(true))
      .finally(() => setAccessLoading(false));
  }, []);
  useEffect(() => { loadAccess(); }, [loadAccess]);

  function notify(message, ok = true) {
    setToast({ message, ok });
    setTimeout(() => setToast(null), 3000);
  }

  async function handleAccess(req, approve) {
    const id = req.id || req.consumerKey || `${req.developerEmail}-${req.appName}`;
    setBusy(id);
    try {
      const payload = {
        developerEmail: req.developerEmail,
        appName: req.appName,
        consumerKey: req.consumerKey,
        productName: req.productName,
      };
      if (approve) {
        await approveAccess(payload);
        notify('تمت الموافقة على الطلب.');
      } else {
        await rejectAccess(payload);
        notify('تم رفض الطلب.');
      }
      loadAccess();
    } catch (err) {
      notify(err.message || 'تعذّر تنفيذ العملية.', false);
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <div className={styles.topbar}>
        <h1>طلبات الاشتراك</h1>
        <span className={styles.env}>● بيئة prod</span>
      </div>
      <div className={styles.content}>
        <div className={styles.card}>
          <div className={styles.cardHead}><span>طلبات الاشتراك المعلّقة</span></div>
          <table className={styles.table}>
            <thead><tr><th>المستخدم</th><th>التطبيق</th><th>الخدمة</th><th>الإجراء</th></tr></thead>
            <tbody>
              {access.map((a, i) => {
                const id = a.id || a.consumerKey || `${a.developerEmail}-${a.appName}`;
                return (
                  <tr key={i}>
                    <td>{a.developerEmail || a.partner}</td>
                    <td>{a.appName || a.app}</td>
                    <td>{a.productName || '—'}</td>
                    <td>
                      <button className={styles.ok} onClick={() => handleAccess(a, true)} disabled={busy === id}>
                        {busy === id ? '…' : 'موافقة'}
                      </button>{' '}
                      <button className={styles.no} onClick={() => handleAccess(a, false)} disabled={busy === id}>
                        رفض
                      </button>
                    </td>
                  </tr>
                );
              })}
              {accessLoading && <tr><td colSpan="4" className={styles.empty}>جارٍ تحميل الطلبات…</td></tr>}
              {!accessLoading && loadError && (
                <tr><td colSpan="4" className={styles.empty}>تعذّر تحميل الطلبات. <button className={styles.priceBtn} onClick={loadAccess}>إعادة المحاولة</button></td></tr>
              )}
              {!accessLoading && !loadError && !access.length && <tr><td colSpan="4" className={styles.empty}>لا توجد طلبات معلّقة.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {toast && (
        <div className={`${styles.toast} ${toast.ok ? styles.toastOk : styles.toastErr}`}>
          {toast.message}
        </div>
      )}
    </>
  );
}
