'use client';
import { useState, useEffect, useCallback } from 'react';
import { getAllPromotions, approvePromotion, rejectPromotion } from '@/lib/api';
import { fmtDateTime } from '@/lib/dates';
import PermissionGate from '@/components/PermissionGate';
import { useI18n } from '@/lib/i18n';
import styles from '../admin.module.css';

// The backend may return status as a number (0/1/2) or as text — we normalize it here.
const STATUS_BY_NUM = { 0: 'Pending', 1: 'Approved', 2: 'Rejected' };
function normStatus(s) {
  if (typeof s === 'number') return STATUS_BY_NUM[s] ?? String(s);
  if (typeof s === 'string' && /^[0-2]$/.test(s)) return STATUS_BY_NUM[Number(s)];
  return s;
}

export default function PromotionsPage() {
  const { t } = useI18n();
  const STATUS_LABEL = {
    Pending: t('promotions.status_pending'),
    Approved: t('promotions.status_approved'),
    Rejected: t('promotions.status_rejected'),
  };
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);
  const [toast, setToast] = useState(null);
  const [filter, setFilter] = useState('Pending');
  const [rejectModal, setRejectModal] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    getAllPromotions(filter || undefined)
      .then((d) => setRequests(Array.isArray(d?.requests) ? d.requests : []))
      .catch(() => setRequests([]))
      .finally(() => setLoading(false));
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  function notify(message, ok = true) {
    setToast({ message, ok });
    setTimeout(() => setToast(null), 3500);
  }

  async function handleApprove(item) {
    setBusy(item.id);
    try {
      await approvePromotion(item.id);
      notify(t('promotions.approve_success', { product: item.productName, email: item.developerEmail }));
      load();
    } catch (err) {
      notify(err.message || t('promotions.approve_failed'), false);
    } finally {
      setBusy(null);
    }
  }

  async function handleReject(item, note) {
    setBusy(item.id);
    try {
      await rejectPromotion(item.id, note);
      notify(t('promotions.reject_success', { product: item.productName }));
      setRejectModal(null);
      load();
    } catch (err) {
      notify(err.message || t('promotions.reject_failed'), false);
    } finally {
      setBusy(null);
    }
  }

  return (
    <PermissionGate permission="promotions.approve">
      <div className={styles.topbar}>
        <h1>{t('admin_nav.promotions')}</h1>
      </div>

      <div className={styles.content}>
        <div className={styles.card}>
          <div className={styles.cardHead}>
            <span>{t('promotions.requests_count', { count: requests.length })}</span>
            <div className={styles.filterChips}>
              {[
                { v: 'Pending', l: t('promotions.status_pending') },
                { v: 'Approved', l: t('promotions.filter_approved') },
                { v: 'Rejected', l: t('promotions.filter_rejected') },
                { v: '', l: t('catalog.filter_all') },
              ].map((f) => (
                <button
                  key={f.v || 'all'}
                  className={`${styles.filterChip} ${filter === f.v ? styles.filterChipOn : ''}`}
                  onClick={() => setFilter(f.v)}
                >
                  {f.l}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className={styles.empty}>{t('access.loading_requests')}</div>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>{t('promotions.col_partner')}</th>
                  <th>{t('orders.col_service')}</th>
                  <th>{t('promotions.col_test_app')}</th>
                  <th>{t('promotions.col_request_date')}</th>
                  <th>{t('orders.col_status')}</th>
                  <th>{t('access.col_action')}</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((r) => {
                  const st = normStatus(r.status);
                  return (
                  <tr key={r.id}>
                    <td>{r.developerEmail}</td>
                    <td>{r.productName}</td>
                    <td>{r.appName || '—'}</td>
                    <td>{fmtDateTime(r.createdAt)}</td>
                    <td>
                      <span className={
                        st === 'Approved' ? styles.badgeOk
                          : st === 'Rejected' ? styles.badgeBad
                            : styles.badgeWait
                      }>
                        {STATUS_LABEL[st] || st}
                      </span>
                    </td>
                    <td>
                      {st === 'Pending' ? (
                        <div className={styles.rowActions}>
                          <button
                            className={styles.approveBtn}
                            onClick={() => handleApprove(r)}
                            disabled={busy === r.id}
                          >
                            {busy === r.id ? t('promotions.working') : t('promotions.accept')}
                          </button>
                          <button
                            className={styles.rejectBtn}
                            onClick={() => setRejectModal(r)}
                            disabled={busy === r.id}
                          >
                            {t('access.reject')}
                          </button>
                        </div>
                      ) : (
                        <span className={styles.muted}>{r.adminNote || '—'}</span>
                      )}
                    </td>
                  </tr>
                  );
                })}
                {!requests.length && (
                  <tr><td colSpan="6" className={styles.empty}>{t('promotions.empty')}</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {rejectModal && (
        <RejectModal
          item={rejectModal}
          busy={busy === rejectModal.id}
          onCancel={() => setRejectModal(null)}
          onConfirm={(note) => handleReject(rejectModal, note)}
        />
      )}

      {toast && (
        <div className={toast.ok ? styles.toastOk : styles.toastErr}>{toast.message}</div>
      )}
    </PermissionGate>
  );
}

// Rejection confirmation modal with an optional reason
function RejectModal({ item, busy, onCancel, onConfirm }) {
  const { t } = useI18n();
  const [note, setNote] = useState('');
  return (
    <div className={styles.overlay} onClick={onCancel}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h2>{t('promotions.modal_title')}</h2>
        <p className={styles.modalNote}>
          {t('promotions.modal_note', { product: item.productName, email: item.developerEmail })}
        </p>
        <label className={styles.label}>
          {t('promotions.reject_reason_label')}
          <textarea
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t('promotions.reject_reason_placeholder')}
          />
        </label>
        <div className={styles.modalActions}>
          <button className={styles.cancel} onClick={onCancel} disabled={busy}>{t('common.cancel')}</button>
          <button className={styles.rejectBtn} onClick={() => onConfirm(note)} disabled={busy}>
            {busy ? t('promotions.rejecting') : t('promotions.confirm_reject')}
          </button>
        </div>
      </div>
    </div>
  );
}
