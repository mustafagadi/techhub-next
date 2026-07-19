'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  getPartnerComplianceList, approveNdaMou, approveCybersecurity, markServerAuthorized,
  downloadComplianceDocument, deactivatePartner, reactivatePartner,
} from '@/lib/api';
import PermissionGate from '@/components/PermissionGate';
import { useI18n } from '@/lib/i18n';
import styles from '../admin.module.css';

export default function AdminPartnerCompliancePage() {
  const { t } = useI18n();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);
  const [toast, setToast] = useState(null);
  const [ticketInputs, setTicketInputs] = useState({});

  const load = useCallback(() => {
    setLoading(true);
    getPartnerComplianceList()
      .then((d) => setRequests(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  function notify(message, ok = true) {
    setToast({ message, ok });
    setTimeout(() => setToast(null), 3000);
  }

  async function handleApproveNdaMou(item) {
    setBusy(item.userId);
    try {
      await approveNdaMou(item.userId);
      notify(t('admin_partner_compliance.approve_success', { name: item.companyName }));
      load();
    } catch (err) {
      notify(err.message || t('admin_partner_compliance.approve_failed'), false);
    } finally {
      setBusy(null);
    }
  }

  async function handleApproveCybersecurity(item) {
    setBusy(item.userId);
    try {
      await approveCybersecurity(item.userId);
      notify(t('admin_partner_compliance.approve_success', { name: item.companyName }));
      load();
    } catch (err) {
      notify(err.message || t('admin_partner_compliance.approve_failed'), false);
    } finally {
      setBusy(null);
    }
  }

  async function handleMarkServerAuthorized(item) {
    setBusy(item.userId);
    try {
      await markServerAuthorized(item.userId, ticketInputs[item.userId] || '');
      notify(t('admin_partner_compliance.server_auth_marked', { name: item.companyName }));
      load();
    } catch (err) {
      notify(err.message || t('admin_partner_compliance.approve_failed'), false);
    } finally {
      setBusy(null);
    }
  }

  async function handleDownload(userId, docType) {
    try {
      await downloadComplianceDocument(userId, docType);
    } catch (err) {
      notify(err.message || t('admin_partner_signups.download_failed'), false);
    }
  }

  async function handleDeactivate(item) {
    if (!window.confirm(t('admin_partner_compliance.deactivate_confirm', { name: item.companyName }))) return;
    setBusy(item.userId);
    try {
      await deactivatePartner(item.userId);
      notify(t('admin_partner_compliance.deactivate_success', { name: item.companyName }));
      load();
    } catch (err) {
      notify(err.message || t('admin_partner_compliance.deactivate_failed'), false);
    } finally {
      setBusy(null);
    }
  }

  async function handleReactivate(item) {
    setBusy(item.userId);
    try {
      await reactivatePartner(item.userId);
      notify(t('admin_partner_compliance.reactivate_success', { name: item.companyName }));
      load();
    } catch (err) {
      notify(err.message || t('admin_partner_compliance.deactivate_failed'), false);
    } finally {
      setBusy(null);
    }
  }

  return (
    <PermissionGate permission="partnercompliance.manage">
      <div className={styles.topbar}>
        <h1>{t('admin_nav.partner_compliance')}</h1>
      </div>
      <div className={styles.content}>
        <div className={styles.card}>
          <div className={styles.cardHead}><span>{t('admin_nav.partner_compliance')}</span></div>
          <table className={`${styles.table} ${styles.alignTop}`}>
            <thead>
              <tr>
                <th>{t('admin_interest.col_company')}</th>
                <th>{t('admin_interest.col_email')}</th>
                <th>{t('admin_partner_compliance.col_nda_mou')}</th>
                <th>{t('admin_partner_compliance.col_cybersecurity')}</th>
                <th>{t('admin_partner_compliance.col_server_auth')}</th>
                <th>{t('admin_partner_compliance.col_overall')}</th>
                <th>{t('admin_partner_compliance.col_account')}</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r.userId}>
                  <td>
                    <div className={styles.cellStack}>
                      <span>{r.companyName}</span>
                      <Link href={`/admin/partners/${encodeURIComponent(r.userId)}`} className={styles.priceBtn}>
                        {t('admin_partner_compliance.view_profile')}
                      </Link>
                    </div>
                  </td>
                  <td><span style={{ direction: 'ltr', unicodeBidi: 'isolate' }}>{r.email}</span></td>
                  <td>
                    <div className={styles.cellStack}>
                      <span className={styles[r.ndaMouApproved ? 'badgeOk' : r.ndaMouSubmitted ? 'badgeWait' : 'badgeBad']}>
                        {t(`admin_partner_compliance.status_${r.ndaMouApproved ? 'approved' : r.ndaMouSubmitted ? 'pending' : 'not_submitted'}`)}
                      </span>
                      {r.ndaMouSubmitted && (
                        <div className={styles.cellRow}>
                          <button className={styles.priceBtn} onClick={() => handleDownload(r.userId, 'nda')}>{t('admin_partner_compliance.doc_nda')}</button>
                          <button className={styles.priceBtn} onClick={() => handleDownload(r.userId, 'mou')}>{t('admin_partner_compliance.doc_mou')}</button>
                        </div>
                      )}
                      {r.ndaMouSubmitted && !r.ndaMouApproved && (
                        <button className={styles.ok} onClick={() => handleApproveNdaMou(r)} disabled={busy === r.userId}>
                          {t('access.approve')}
                        </button>
                      )}
                    </div>
                  </td>
                  <td>
                    <div className={styles.cellStack}>
                      <span className={styles[r.cybersecurityApproved ? 'badgeOk' : r.cybersecuritySubmitted ? 'badgeWait' : 'badgeBad']}>
                        {t(`admin_partner_compliance.status_${r.cybersecurityApproved ? 'approved' : r.cybersecuritySubmitted ? 'pending' : 'not_submitted'}`)}
                      </span>
                      {r.cybersecuritySubmitted && (
                        <button className={styles.priceBtn} onClick={() => handleDownload(r.userId, 'cybersecurity')}>{t('admin_partner_compliance.doc_cybersecurity')}</button>
                      )}
                      {r.cybersecuritySubmitted && !r.cybersecurityApproved && (
                        <button className={styles.ok} onClick={() => handleApproveCybersecurity(r)} disabled={busy === r.userId}>
                          {t('access.approve')}
                        </button>
                      )}
                    </div>
                  </td>
                  <td>
                    <div className={styles.cellStack}>
                      <span className={styles[r.serverAuthorizationSubmitted ? 'badgeOk' : 'badgeBad']}>
                        {r.serverAuthorizationSubmitted
                          ? t('admin_partner_compliance.status_done')
                          : t('admin_partner_compliance.status_not_submitted')}
                      </span>
                      {r.serverAuthorizationSubmitted ? (
                        <span className={styles.muted}>{r.serviceNowTicketNumber || '—'}</span>
                      ) : (
                        <div className={styles.cellRow}>
                          <input
                            type="text"
                            placeholder={t('admin_partner_compliance.ticket_placeholder')}
                            value={ticketInputs[r.userId] || ''}
                            onChange={(e) => setTicketInputs((s) => ({ ...s, [r.userId]: e.target.value }))}
                            style={{ width: 110, padding: '6px 8px', border: '1px solid var(--line)', borderRadius: 6, fontFamily: 'inherit', fontSize: '0.82rem' }}
                          />
                          <button className={styles.ok} onClick={() => handleMarkServerAuthorized(r)} disabled={busy === r.userId}>
                            {t('admin_partner_compliance.mark_done')}
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                  <td>
                    <span className={styles[r.isComplete ? 'badgeOk' : 'badgeWait']}>
                      {r.isComplete ? t('admin_partner_compliance.status_complete') : t('admin_partner_compliance.status_incomplete')}
                    </span>
                  </td>
                  <td>
                    <div className={styles.cellStack}>
                      <span className={styles[r.isDeactivated ? 'badgeBad' : 'badgeOk']}>
                        {r.isDeactivated ? t('admin_partner_compliance.account_deactivated') : t('admin_partner_compliance.account_active')}
                      </span>
                      {r.isDeactivated ? (
                        <button className={styles.ok} onClick={() => handleReactivate(r)} disabled={busy === r.userId}>
                          {t('admin_partner_compliance.reactivate')}
                        </button>
                      ) : (
                        <button className={styles.no} onClick={() => handleDeactivate(r)} disabled={busy === r.userId}>
                          {t('admin_partner_compliance.deactivate')}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {loading && <tr><td colSpan="7" className={styles.empty}>{t('access.loading_requests')}</td></tr>}
              {!loading && !requests.length && <tr><td colSpan="7" className={styles.empty}>{t('admin_partner_compliance.empty')}</td></tr>}
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
