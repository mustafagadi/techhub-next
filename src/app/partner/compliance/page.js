'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { getComplianceStatus, submitNdaMou, submitCybersecurity } from '@/lib/api';
import RequireAuth from '@/components/RequireAuth';
import Header from '@/components/Header';
import { useI18n } from '@/lib/i18n';
import styles from './compliance.module.css';

const ALLOWED_DOC_TYPES = '.pdf,.png,.jpg,.jpeg';

export default function PartnerCompliancePage() {
  return (
    <RequireAuth role="portal-partner">
      <ComplianceDashboard />
    </RequireAuth>
  );
}

function ComplianceDashboard() {
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [exists, setExists] = useState(false);
  const [view, setView] = useState(null);
  const [toast, setToast] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    getComplianceStatus()
      .then((d) => {
        setExists(!!d?.exists);
        setView(d?.view || null);
      })
      .catch(() => { setExists(false); setView(null); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  function notify(message, ok = true) {
    setToast({ message, ok });
    setTimeout(() => setToast(null), 3000);
  }

  return (
    <>
      <Header />
      <div className={styles.page}>
        <div className="container">
          <div className={styles.head}>
            <h1>{t('partner_compliance.title')}</h1>
            <p>{t('partner_compliance.subtitle')}</p>
          </div>

          {loading ? (
            <div className={styles.empty}>{t('common.loading')}</div>
          ) : !exists ? (
            <div className={styles.empty}>{t('partner_compliance.not_applicable')}</div>
          ) : (
            <>
              {view?.isComplete && (
                <div className={styles.completeBanner}>{t('partner_compliance.all_complete')}</div>
              )}

              <NdaMouCard
                view={view}
                t={t}
                onSubmitted={() => { notify(t('partner_compliance.nda_mou_submitted')); load(); }}
                onError={(msg) => notify(msg, false)}
              />

              <CybersecurityCard
                view={view}
                t={t}
                onSubmitted={() => { notify(t('partner_compliance.cybersecurity_submitted')); load(); }}
                onError={(msg) => notify(msg, false)}
              />

              <ServerAuthStatus view={view} t={t} />
            </>
          )}
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

function StepBadge({ submitted, approved, t }) {
  if (approved) return <span className={`${styles.badge} ${styles.badgeOk}`}>{t('partner_compliance.status_approved')}</span>;
  if (submitted) return <span className={`${styles.badge} ${styles.badgePending}`}>{t('partner_compliance.status_pending_review')}</span>;
  return <span className={`${styles.badge} ${styles.badgeTodo}`}>{t('partner_compliance.status_not_submitted')}</span>;
}

function NdaMouCard({ view, t, onSubmitted, onError }) {
  const [nda, setNda] = useState(null);
  const [mou, setMou] = useState(null);
  const [busy, setBusy] = useState(false);
  const ndaRef = useRef(null);
  const mouRef = useRef(null);

  const submitted = !!view?.ndaMouSubmitted;
  const approved = !!view?.ndaMouApproved;
  const locked = submitted; // Once submitted, the form is read-only (admin review happens next)

  async function handleSubmit() {
    if (!nda || !mou) { onError(t('partner_compliance.nda_mou_files_required')); return; }
    setBusy(true);
    try {
      await submitNdaMou({ nda, mou });
      onSubmitted();
    } catch (err) {
      onError(err.message || t('partner_compliance.submit_failed'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.card}>
      <div className={styles.cardHead}>
        <h3>{t('partner_compliance.step1_title')}</h3>
        <StepBadge submitted={submitted} approved={approved} t={t} />
      </div>
      <p className={styles.cardHint}>{t('partner_compliance.step1_hint')}</p>

      <div className={styles.templateLinks}>
        <a href="/documents/nda-template.docx" download className={styles.templateLink}>{t('partner_compliance.download_nda_template')}</a>
        <a href="/documents/mou-template.docx" download className={styles.templateLink}>{t('partner_compliance.download_mou_template')}</a>
      </div>

      {locked ? (
        <p className={styles.lockedNote}>{approved ? t('partner_compliance.step_approved_note') : t('partner_compliance.awaiting_review')}</p>
      ) : (
        <>
          <FileField label={t('partner_compliance.nda_file_label')} file={nda} inputRef={ndaRef} onChange={setNda} t={t} />
          <FileField label={t('partner_compliance.mou_file_label')} file={mou} inputRef={mouRef} onChange={setMou} t={t} />
          <button className="btn btn-primary" onClick={handleSubmit} disabled={busy}>
            {busy ? t('partner_compliance.submitting') : t('partner_compliance.submit_button')}
          </button>
        </>
      )}
    </div>
  );
}

function CybersecurityCard({ view, t, onSubmitted, onError }) {
  const [fields, setFields] = useState({
    platformName: '', platformLink: '', stagingIpAddress: '', unifiedEstablishmentNumber: '',
    commercialRegistrationNumber: '', managerIdNumber: '', managerHijriBirthDate: '', managerMobile: '',
  });
  const [doc, setDoc] = useState(null);
  const [busy, setBusy] = useState(false);
  const docRef = useRef(null);

  const submitted = !!view?.cybersecuritySubmitted;
  const approved = !!view?.cybersecurityApproved;
  const locked = submitted;

  function setField(key, value) { setFields((f) => ({ ...f, [key]: value })); }

  async function handleSubmit() {
    if (Object.values(fields).some((v) => !v.trim()) || !doc) {
      onError(t('partner_compliance.cybersecurity_fields_required'));
      return;
    }
    // Saudi mobile format: starts with 05, exactly 10 digits (mirrors the backend check)
    const mobileDigits = fields.managerMobile.replace(/\D/g, '');
    if (mobileDigits.length !== 10 || !mobileDigits.startsWith('05')) {
      onError(t('partner_compliance.manager_mobile_invalid'));
      return;
    }
    setBusy(true);
    try {
      await submitCybersecurity(fields, doc);
      onSubmitted();
    } catch (err) {
      onError(err.message || t('partner_compliance.submit_failed'));
    } finally {
      setBusy(false);
    }
  }

  const FIELD_KEYS = [
    ['platformName', 'platform_name'],
    ['platformLink', 'platform_link'],
    ['stagingIpAddress', 'staging_ip'],
    ['unifiedEstablishmentNumber', 'unified_establishment_number'],
    ['commercialRegistrationNumber', 'commercial_registration_number'],
    ['managerIdNumber', 'manager_id_number'],
    ['managerHijriBirthDate', 'manager_hijri_birth_date'],
    ['managerMobile', 'manager_mobile'],
  ];

  return (
    <div className={styles.card}>
      <div className={styles.cardHead}>
        <h3>{t('partner_compliance.step2_title')}</h3>
        <StepBadge submitted={submitted} approved={approved} t={t} />
      </div>
      <p className={styles.cardHint}>{t('partner_compliance.step2_hint')}</p>

      <div className={styles.templateLinks}>
        <a href="/documents/cybersecurity-template.pdf" download className={styles.templateLink}>{t('partner_compliance.download_cybersecurity_template')}</a>
      </div>

      {locked ? (
        <>
          <p className={styles.lockedNote}>{approved ? t('partner_compliance.step_approved_note') : t('partner_compliance.awaiting_review')}</p>
          {/* The submitted values, read-only — so the partner can always see exactly what they sent. */}
          <div className={styles.fieldsGrid} style={{ marginTop: 16 }}>
            {FIELD_KEYS.map(([key, labelKey]) => (
              <label key={key} className={styles.label}>
                {t(`partner_compliance.field_${labelKey}`)}
                <input
                  type="text"
                  value={view?.[key] || ''}
                  disabled
                  style={key === 'platformLink' || key === 'stagingIpAddress' || key === 'managerMobile' ? { direction: 'ltr', textAlign: 'left' } : undefined}
                />
              </label>
            ))}
          </div>
        </>
      ) : (
        <>
          <div className={styles.fieldsGrid}>
            {FIELD_KEYS.map(([key, labelKey]) => (
              <label key={key} className={styles.label}>
                {t(`partner_compliance.field_${labelKey}`)}
                <input
                  type="text"
                  value={fields[key]}
                  onChange={(e) => setField(key, e.target.value)}
                  style={key === 'platformLink' || key === 'stagingIpAddress' || key === 'managerMobile' ? { direction: 'ltr', textAlign: 'left' } : undefined}
                />
              </label>
            ))}
          </div>
          <FileField label={t('partner_compliance.cybersecurity_file_label')} file={doc} inputRef={docRef} onChange={setDoc} t={t} />
          <button className="btn btn-primary" onClick={handleSubmit} disabled={busy}>
            {busy ? t('partner_compliance.submitting') : t('partner_compliance.submit_button')}
          </button>
        </>
      )}
    </div>
  );
}

function ServerAuthStatus({ view, t }) {
  const submitted = !!view?.serverAuthorizationSubmitted;
  return (
    <div className={styles.card}>
      <div className={styles.cardHead}>
        <h3>{t('partner_compliance.step3_title')}</h3>
        <span className={`${styles.badge} ${submitted ? styles.badgeOk : styles.badgeTodo}`}>
          {submitted ? t('partner_compliance.status_done') : t('partner_compliance.status_awaiting_admin')}
        </span>
      </div>
      <p className={styles.cardHint}>{t('partner_compliance.step3_hint')}</p>
    </div>
  );
}

function FileField({ label, file, inputRef, onChange, t }) {
  return (
    <div className={styles.fileField}>
      <label className={styles.label}>{label}</label>
      <div className={styles.fileRow}>
        <button type="button" className={styles.browseBtn} onClick={() => inputRef.current?.click()}>
          {t('signup.browse')}
        </button>
        <span className={`${styles.fileName} ${!file ? styles.fileNamePlaceholder : ''}`}>
          {file ? file.name : t('signup.no_file_selected')}
        </span>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED_DOC_TYPES}
        className={styles.fileInput}
        onChange={(e) => onChange(e.target.files?.[0] || null)}
      />
    </div>
  );
}
