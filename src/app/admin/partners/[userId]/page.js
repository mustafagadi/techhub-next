'use client';
import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getPartnerOverview, downloadPartnerSignupDocument, downloadComplianceDocument, hasPermission } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { fmtDateTime } from '@/lib/dates';
import styles from '../../admin.module.css';

// Read-only combined view of a partner's signup + compliance status — for context only. All actions
// (approve/reject/mark-complete/deactivate) stay on their own pages with their own permissions; this
// page never calls a mutating endpoint.
export default function PartnerOverviewPage() {
  const { t } = useI18n();
  const { userId } = useParams();
  const [view, setView] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    getPartnerOverview(userId)
      .then(setView)
      .catch((err) => setError(err.message || t('admin_partner_overview.load_failed')))
      .finally(() => setLoading(false));
  }, [userId, t]);
  useEffect(() => { load(); }, [load]);

  function notify(message, ok = true) {
    setToast({ message, ok });
    setTimeout(() => setToast(null), 3000);
  }

  async function handleDownloadSignup(docType) {
    try { await downloadPartnerSignupDocument(view.signup.id, docType); }
    catch (err) { notify(err.message || t('admin_partner_signups.download_failed'), false); }
  }

  async function handleDownloadCompliance(docType) {
    try { await downloadComplianceDocument(userId, docType); }
    catch (err) { notify(err.message || t('admin_partner_signups.download_failed'), false); }
  }

  const canManageSignups = hasPermission('partnersignups.manage');
  const canManageCompliance = hasPermission('partnercompliance.manage');

  return (
    <>
      <div className={styles.topbar}>
        <h1>{t('admin_partner_overview.title')}</h1>
      </div>
      <div className={styles.content}>
        {loading && <p className={styles.muted}>{t('access.loading_requests')}</p>}
        {error && <div className={styles.card}><div className={styles.cardHead}><span className={styles.badgeBad}>{error}</span></div></div>}

        {view && (
          <>
            <div className={styles.card} style={{ marginBottom: 20 }}>
              <div className={styles.cardHead}>
                <span>{view.companyName}</span>
                <span className={styles[view.isDeactivated ? 'badgeBad' : 'badgeOk']}>
                  {view.isDeactivated ? t('admin_partner_compliance.account_deactivated') : t('admin_partner_compliance.account_active')}
                </span>
              </div>
              <div style={{ padding: '18px 24px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span>{view.fullName}</span>
                <span style={{ direction: 'ltr', unicodeBidi: 'isolate', textAlign: 'start' }} className={styles.muted}>{view.email}</span>
              </div>
            </div>

            <div className={styles.card} style={{ marginBottom: 20 }}>
              <div className={styles.cardHead}>
                <span>{t('admin_nav.partner_signups')}</span>
                {canManageSignups && (
                  <Link href="/admin/partner-signups" className={styles.priceBtn}>
                    {t('admin_partner_overview.manage_link')}
                  </Link>
                )}
              </div>
              {!view.signup ? (
                <p className={styles.muted} style={{ padding: '18px 24px' }}>{t('admin_partner_overview.no_signup')}</p>
              ) : (
                <div style={{ padding: '18px 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div>
                    <span className={styles[view.signup.status === 'Approved' ? 'badgeOk' : view.signup.status === 'Rejected' ? 'badgeBad' : 'badgeWait']}>
                      {t(`admin_partner_signups.status_${view.signup.status}`) || view.signup.status}
                    </span>
                  </div>
                  <span className={styles.muted}>{t('admin_partner_signups.col_documents')}: {fmtDateTime(view.signup.createdAt)}</span>
                  {view.signup.adminNote && <span className={styles.muted}>{view.signup.adminNote}</span>}
                  <div className={styles.cellRow}>
                    <button className={styles.priceBtn} onClick={() => handleDownloadSignup('cr')}>{t('admin_partner_signups.doc_cr')}</button>
                    <button className={styles.priceBtn} onClick={() => handleDownloadSignup('vat')}>{t('admin_partner_signups.doc_vat')}</button>
                    <button className={styles.priceBtn} onClick={() => handleDownloadSignup('authLetter')}>{t('admin_partner_signups.doc_auth_letter')}</button>
                  </div>
                </div>
              )}
            </div>

            <div className={styles.card}>
              <div className={styles.cardHead}>
                <span>{t('admin_nav.partner_compliance')}</span>
                {canManageCompliance && (
                  <Link href="/admin/partner-compliance" className={styles.priceBtn}>
                    {t('admin_partner_overview.manage_link')}
                  </Link>
                )}
              </div>
              {!view.compliance ? (
                <p className={styles.muted} style={{ padding: '18px 24px' }}>{t('admin_partner_overview.no_compliance')}</p>
              ) : (
                <div style={{ padding: '18px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div className={styles.cellStack}>
                    <span className={styles.muted}>{t('admin_partner_compliance.col_nda_mou')}</span>
                    <span className={styles[view.compliance.ndaMouApproved ? 'badgeOk' : view.compliance.ndaMouSubmitted ? 'badgeWait' : 'badgeBad']}>
                      {t(`admin_partner_compliance.status_${view.compliance.ndaMouApproved ? 'approved' : view.compliance.ndaMouSubmitted ? 'pending' : 'not_submitted'}`)}
                    </span>
                    {view.compliance.ndaMouSubmitted && (
                      <div className={styles.cellRow}>
                        <button className={styles.priceBtn} onClick={() => handleDownloadCompliance('nda')}>{t('admin_partner_compliance.doc_nda')}</button>
                        <button className={styles.priceBtn} onClick={() => handleDownloadCompliance('mou')}>{t('admin_partner_compliance.doc_mou')}</button>
                      </div>
                    )}
                  </div>
                  <div className={styles.cellStack}>
                    <span className={styles.muted}>{t('admin_partner_compliance.col_cybersecurity')}</span>
                    <span className={styles[view.compliance.cybersecurityApproved ? 'badgeOk' : view.compliance.cybersecuritySubmitted ? 'badgeWait' : 'badgeBad']}>
                      {t(`admin_partner_compliance.status_${view.compliance.cybersecurityApproved ? 'approved' : view.compliance.cybersecuritySubmitted ? 'pending' : 'not_submitted'}`)}
                    </span>
                    {view.compliance.cybersecuritySubmitted && (
                      <button className={styles.priceBtn} onClick={() => handleDownloadCompliance('cybersecurity')}>{t('admin_partner_compliance.doc_cybersecurity')}</button>
                    )}
                  </div>
                  <div className={styles.cellStack}>
                    <span className={styles.muted}>{t('admin_partner_compliance.col_server_auth')}</span>
                    <span className={styles[view.compliance.serverAuthorizationSubmitted ? 'badgeOk' : 'badgeBad']}>
                      {view.compliance.serverAuthorizationSubmitted
                        ? t('admin_partner_compliance.status_done')
                        : t('admin_partner_compliance.status_not_submitted')}
                    </span>
                    {view.compliance.serviceNowTicketNumber && (
                      <span className={styles.muted} style={{ direction: 'ltr', unicodeBidi: 'isolate' }}>{view.compliance.serviceNowTicketNumber}</span>
                    )}
                  </div>
                  <div>
                    <span className={styles[view.compliance.isComplete ? 'badgeOk' : 'badgeWait']}>
                      {view.compliance.isComplete ? t('admin_partner_compliance.status_complete') : t('admin_partner_compliance.status_incomplete')}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {toast && (
        <div className={`${styles.toast} ${toast.ok ? styles.toastOk : styles.toastErr}`}>
          {toast.message}
        </div>
      )}
    </>
  );
}
