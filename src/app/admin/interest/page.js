'use client';
import { useState, useEffect, useCallback } from 'react';
import { getInterestRequests, updateInterestStatus, createPartnerAccount } from '@/lib/api';
import PermissionGate from '@/components/PermissionGate';
import { useI18n } from '@/lib/i18n';
import styles from '../admin.module.css';

export default function InterestPage() {
  const { t } = useI18n();
  const [interest, setInterest] = useState([]);
  const [interestLoading, setInterestLoading] = useState(true);
  const [busy, setBusy] = useState(null);
  const [toast, setToast] = useState(null);
  const [accountModal, setAccountModal] = useState(null);
  const [rejectModal, setRejectModal] = useState(null);

  const loadInterest = useCallback(() => {
    setInterestLoading(true);
    getInterestRequests()
      .then((d) => setInterest(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setInterestLoading(false));
  }, []);
  useEffect(() => { loadInterest(); }, [loadInterest]);

  function notify(message, ok = true) {
    setToast({ message, ok });
    setTimeout(() => setToast(null), 3000);
  }

  async function handleInterestStatus(item, status) {
    const id = item.id;
    setBusy(id);
    try {
      await updateInterestStatus(id, { status, adminNote: null });
      notify(t('admin_interest.status_updated'));
      loadInterest();
    } catch (err) {
      notify(err.message || t('admin_interest.status_update_failed'), false);
    } finally {
      setBusy(null);
    }
  }

  async function handleCreateAccount(form) {
    setBusy(accountModal?.id);
    try {
      await createPartnerAccount(form);
      if (form.interestId) {
        try { await updateInterestStatus(form.interestId, { status: 2, adminNote: 'account created: ' + form.email }); } catch {}
      }
      notify(t('admin_interest.invite_sent', { email: form.email }));
      setAccountModal(null);
      loadInterest();
    } catch (err) {
      notify(err.message || t('admin_interest.invite_failed'), false);
    } finally {
      setBusy(null);
    }
  }

  return (
    <PermissionGate permission="interest.manage">
      <div className={styles.topbar}>
        <h1>{t('admin_nav.interest')}</h1>
        <span className={styles.env}>{t('overview.env_prod')}</span>
      </div>
      <div className={styles.content}>
        <div className={styles.card}>
          <div className={styles.cardHead}><span>{t('admin_nav.interest')}</span></div>
          <table className={styles.table}>
            <thead><tr><th>{t('admin_interest.col_name')}</th><th>{t('admin_interest.col_company')}</th><th>{t('admin_interest.col_email')}</th><th>{t('orders.col_status')}</th><th>{t('access.col_action')}</th></tr></thead>
            <tbody>
              {interest.filter((it) => {
                const s = it.status;
                return s === 0 || s === 1 || s === 'new' || s === undefined || s === null;
              }).map((it, i) => (
                <tr key={i}>
                  <td>{it.fullName || it.name || it.FullName || `${it.firstName||''} ${it.lastName||''}`.trim() || '—'}</td>
                  <td>{it.company || it.companyName}</td>
                  <td style={{ direction: 'ltr' }}>{it.email}</td>
                  <td>{interestLabel(t, it.status)}</td>
                  <td>
                    <button className={styles.ok} onClick={() => setAccountModal(it)} disabled={busy === it.id}>
                      {t('admin_interest.accept_invite')}
                    </button>{' '}
                    <button className={styles.no} onClick={() => setRejectModal(it)} disabled={busy === it.id}>
                      {t('access.reject')}
                    </button>
                  </td>
                </tr>
              ))}
              {interestLoading && <tr><td colSpan="5" className={styles.empty}>{t('access.loading_requests')}</td></tr>}
              {!interestLoading && !interest.length && <tr><td colSpan="5" className={styles.empty}>{t('admin_interest.empty')}</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {accountModal && (
        <AccountModal
          interest={accountModal}
          onClose={() => setAccountModal(null)}
          onCreate={handleCreateAccount}
        />
      )}
      {rejectModal && (
        <div className={styles.overlay} onClick={() => setRejectModal(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()} style={{ maxWidth: '380px' }}>
            <h2>{t('promotions.confirm_reject')}</h2>
            <p className={styles.modalNote}>
              {t('admin_interest.confirm_reject_note', { name: rejectModal.companyName || rejectModal.company || rejectModal.email })}
            </p>
            <div className={styles.modalActions}>
              <button
                className={styles.no}
                onClick={async () => { await handleInterestStatus(rejectModal, 3); setRejectModal(null); }}
                disabled={busy === rejectModal.id}
              >
                {busy === rejectModal.id ? '…' : t('promotions.confirm_reject')}
              </button>
              <button className={styles.cancel} onClick={() => setRejectModal(null)}>{t('common.cancel')}</button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className={`${styles.toast} ${toast.ok ? styles.toastOk : styles.toastErr}`}>
          {toast.message}
        </div>
      )}
    </PermissionGate>
  );
}

function AccountModal({ interest, onClose, onCreate }) {
  const { t } = useI18n();
  // Interest data stores the full name in a single field (fullName), and the organization in companyName.
  const defaultName = interest.fullName || interest.name || interest.FullName || '';
  const defaultCompany = interest.companyName || interest.company || interest.CompanyName || '';
  const defaultEmail = interest.email || interest.Email || '';

  const [email, setEmail] = useState(defaultEmail);
  const [fullName, setFullName] = useState(defaultName);
  const [company, setCompany] = useState(defaultCompany);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function submit() {
    if (!email.trim()) { setErr(t('admin_interest.email_required')); return; }
    setBusy(true); setErr('');
    // The backend expects firstName/lastName — split the full name
    const parts = fullName.trim().split(/\s+/).filter(Boolean);
    const firstName = parts[0] || '';
    const lastName = parts.length > 1 ? parts.slice(1).join(' ') : '';
    try {
      await onCreate({
        email: email.trim(),
        firstName,
        lastName,
        companyName: company.trim(),
        interestId: interest.id,
      });
    } catch (e) {
      setErr(e.message || t('admin_interest.invite_failed'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h2>{t('admin_interest.account_modal_title')}</h2>
        <p className={styles.modalNote}>
          {t('admin_interest.account_modal_note')}
        </p>
        <label className={styles.label}>{t('interest.email')}
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} style={{ direction: 'ltr', textAlign: 'left' }} />
        </label>
        <label className={styles.label}>{t('interest.full_name')}
          <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </label>
        <label className={styles.label}>{t('admin_interest.org_label')}
          <input type="text" value={company} onChange={(e) => setCompany(e.target.value)} />
        </label>
        {err && <div className={styles.error}>{err}</div>}
        <div className={styles.modalActions}>
          <button className="btn btn-primary" onClick={submit} disabled={busy || !email.trim()}>
            {busy ? t('admin_interest.sending_invite') : t('admin_interest.send_invite')}
          </button>
          <button className={styles.cancel} onClick={onClose}>{t('common.cancel')}</button>
        </div>
      </div>
    </div>
  );
}

function interestLabel(t, status) {
  const map = {
    0: t('admin_interest.label_new'),
    1: t('admin_interest.label_contacted'),
    2: t('promotions.status_approved'),
    3: t('promotions.status_rejected'),
  };
  if (typeof status === 'number') return map[status] || t('admin_interest.label_new');
  return status || t('admin_interest.label_new');
}
