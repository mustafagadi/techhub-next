'use client';
import { useState, useEffect, useCallback } from 'react';
import { getAccessRequests, approveAccess, rejectAccess } from '@/lib/api';
import PermissionGate from '@/components/PermissionGate';
import { useI18n } from '@/lib/i18n';
import EnvSwitcher from '@/components/EnvSwitcher';
import styles from '../admin.module.css';

export default function AccessPage() {
  const { t } = useI18n();
  const [access, setAccess] = useState([]);
  const [accessLoading, setAccessLoading] = useState(true);
  const [busy, setBusy] = useState(null);
  const [toast, setToast] = useState(null);

  const loadAccess = useCallback(() => {
    setAccessLoading(true);
    getAccessRequests()
      .then((d) => setAccess(Array.isArray(d) ? d : []))
      .catch(() => {})
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
        notify(t('access.approved'));
      } else {
        await rejectAccess(payload);
        notify(t('access.rejected'));
      }
      loadAccess();
    } catch (err) {
      notify(err.message || t('access.action_failed'), false);
    } finally {
      setBusy(null);
    }
  }

  return (
    <PermissionGate permission="access.approve">
      <div className={styles.topbar}>
        <h1>{t('admin_nav.access')}</h1>
        <EnvSwitcher />
      </div>
      <div className={styles.content}>
        <div className={styles.card}>
          <div className={styles.cardHead}><span>{t('access.pending_title')}</span></div>
          <table className={styles.table}>
            <thead><tr><th>{t('access.col_user')}</th><th>{t('orders.col_app')}</th><th>{t('orders.col_service')}</th><th>{t('access.col_action')}</th></tr></thead>
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
                        {busy === id ? '…' : t('access.approve')}
                      </button>{' '}
                      <button className={styles.no} onClick={() => handleAccess(a, false)} disabled={busy === id}>
                        {t('access.reject')}
                      </button>
                    </td>
                  </tr>
                );
              })}
              {accessLoading && <tr><td colSpan="4" className={styles.empty}>{t('access.loading_requests')}</td></tr>}
              {!accessLoading && !access.length && <tr><td colSpan="4" className={styles.empty}>{t('access.empty')}</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {toast && (
        <div className={`${styles.toast} ${toast.ok ? styles.toastOk : styles.toastErr}`}>
          {toast.message}
        </div>
      )}
    </PermissionGate>
  );
}
