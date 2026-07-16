'use client';
import { useState, useEffect, useCallback } from 'react';
import { getPartnerSignups, approvePartnerSignup, rejectPartnerSignup, downloadPartnerSignupDocument } from '@/lib/api';
import PermissionGate from '@/components/PermissionGate';
import { useI18n } from '@/lib/i18n';
import styles from '../admin.module.css';

const BADGE_BY_STATUS = {
  PendingEmailVerification: 'badgeWait',
  PendingReview: 'badgeWait',
  Approved: 'badgeOk',
  Rejected: 'badgeBad',
};

export default function PartnerSignupsPage() {
  const { t } = useI18n();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);
  const [toast, setToast] = useState(null);
  const [rejectModal, setRejectModal] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    getPartnerSignups()
      .then((d) => setRequests(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  function notify(message, ok = true) {
    setToast({ message, ok });
    setTimeout(() => setToast(null), 3000);
  }

  function statusLabel(status) {
    return t(`admin_partner_signups.status_${status}`) || status;
  }

  async function handleApprove(item) {
    setBusy(item.id);
    try {
      await approvePartnerSignup(item.id);
      notify(t('admin_partner_signups.approve_success', { name: item.companyName }));
      load();
    } catch (err) {
      notify(err.message || t('admin_partner_signups.approve_failed'), false);
    } finally {
      setBusy(null);
    }
  }

  async function handleReject(item, note) {
    setBusy(item.id);
    try {
      await rejectPartnerSignup(item.id, note);
      notify(t('admin_partner_signups.reject_success', { name: item.companyName }));
      setRejectModal(null);
      load();
    } catch (err) {
      notify(err.message || t('admin_partner_signups.reject_failed'), false);
    } finally {
      setBusy(null);
    }
  }

  async function handleDownload(id, docType) {
    try {
      await downloadPartnerSignupDocument(id, docType);
    } catch (err) {
      notify(err.message || t('admin_partner_signups.download_failed'), false);
    }
  }

  return (
    <PermissionGate permission="partnersignups.manage">
      <div className={styles.topbar}>
        <h1>{t('admin_nav.partner_signups')}</h1>
      </div>
      <div className={styles.content}>
        <div className={styles.card}>
          <div className={styles.cardHead}><span>{t('admin_nav.partner_signups')}</span></div>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>{t('admin_interest.col_name')}</th>
                <th>{t('admin_interest.col_company')}</th>
                <th>{t('admin_interest.col_email')}</th>
                <th>{t('orders.col_status')}</th>
                <th>{t('admin_partner_signups.col_documents')}</th>
                <th>{t('access.col_action')}</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r.id}>
                  <td>{r.fullName}</td>
                  <td>{r.companyName}</td>
                  <td style={{ direction: 'ltr' }}>{r.email}</td>
                  <td><span className={styles[BADGE_BY_STATUS[r.status] || 'badgeWait']}>{statusLabel(r.status)}</span></td>
                  <td>
                    <button className={styles.priceBtn} onClick={() => handleDownload(r.id, 'cr')}>{t('admin_partner_signups.doc_cr')}</button>{' '}
                    <button className={styles.priceBtn} onClick={() => handleDownload(r.id, 'vat')}>{t('admin_partner_signups.doc_vat')}</button>{' '}
                    <button className={styles.priceBtn} onClick={() => handleDownload(r.id, 'authLetter')}>{t('admin_partner_signups.doc_auth_letter')}</button>
                  </td>
                  <td>
                    {r.status === 'PendingReview' ? (
                      <>
                        <button className={styles.ok} onClick={() => handleApprove(r)} disabled={busy === r.id}>
                          {t('access.approve')}
                        </button>{' '}
                        <button className={styles.no} onClick={() => setRejectModal(r)} disabled={busy === r.id}>
                          {t('access.reject')}
                        </button>
                      </>
                    ) : (
                      <span className={styles.muted}>{r.adminNote || '—'}</span>
                    )}
                  </td>
                </tr>
              ))}
              {loading && <tr><td colSpan="6" className={styles.empty}>{t('access.loading_requests')}</td></tr>}
              {!loading && !requests.length && <tr><td colSpan="6" className={styles.empty}>{t('admin_partner_signups.empty')}</td></tr>}
            </tbody>
          </table>
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
        <div className={`${styles.toast} ${toast.ok ? styles.toastOk : styles.toastErr}`}>
          {toast.message}
        </div>
      )}
    </PermissionGate>
  );
}

function RejectModal({ item, busy, onCancel, onConfirm }) {
  const { t } = useI18n();
  const [note, setNote] = useState('');
  return (
    <div className={styles.overlay} onClick={onCancel}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h2>{t('admin_partner_signups.reject_modal_title')}</h2>
        <p className={styles.modalNote}>
          {t('admin_partner_signups.reject_modal_note', { name: item.companyName })}
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
          <button className={styles.no} onClick={() => onConfirm(note)} disabled={busy}>
            {busy ? t('promotions.rejecting') : t('promotions.confirm_reject')}
          </button>
        </div>
      </div>
    </div>
  );
}
