'use client';
import { useState, useRef, useMemo } from 'react';
import Link from 'next/link';
import { submitSignup } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import inviteStyles from '../accept-invite/accept-invite.module.css';
import styles from './signup.module.css';

// Same 4 rules as accept-invite's password step — kept identical on purpose.
function passwordRules(pw) {
  return {
    latin: /^[A-Za-z0-9!@#$%^&*_\-]*$/.test(pw) && /[A-Za-z]/.test(pw),
    length: pw.length >= 10,
    number: /\d/.test(pw),
    special: /[!@#$%^&*_\-]/.test(pw),
  };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ALLOWED_DOC_TYPES = '.pdf,.png,.jpg,.jpeg';

export default function SignupPage() {
  const { t } = useI18n();
  const [step, setStep] = useState('general'); // 'general' | 'institution' | 'sent'
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [cr, setCr] = useState(null);
  const [vat, setVat] = useState(null);
  const [authLetter, setAuthLetter] = useState(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const crInputRef = useRef(null);
  const vatInputRef = useRef(null);
  const authLetterInputRef = useRef(null);

  const rules = useMemo(() => passwordRules(password), [password]);
  const rulesPassed = Object.values(rules).filter(Boolean).length;
  const strengthFilled = password.length === 0 ? 0 : Math.max(1, Math.ceil((rulesPassed / 4) * 3));
  const strengthLevel = rulesPassed === 4 ? inviteStyles.strengthStrong : rulesPassed >= 3 ? inviteStyles.strengthMedium : inviteStyles.strengthWeak;

  function handleNext(e) {
    e.preventDefault();
    setError('');

    if (!fullName.trim() || !companyName.trim()) {
      setError(t('signup.fill_all_fields'));
      return;
    }
    if (!EMAIL_RE.test(email)) {
      setError(t('login.email_invalid'));
      return;
    }
    if (!Object.values(rules).every(Boolean)) {
      setError(t('accept_invite.password_requirements_not_met'));
      return;
    }
    if (password !== confirmPassword) {
      setError(t('accept_invite.password_mismatch'));
      return;
    }
    setStep('institution');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!cr || !vat || !authLetter) {
      setError(t('signup.all_documents_required'));
      return;
    }
    if (!termsAccepted) {
      setError(t('signup.must_accept_terms'));
      return;
    }

    setLoading(true);
    try {
      await submitSignup({ fullName, email, companyName, password }, { cr, vat, authLetter });
      setStep('sent');
    } catch (err) {
      setError(err.message || t('signup.submit_failed'));
    } finally {
      setLoading(false);
    }
  }

  if (step === 'sent') {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <Link href="/" className={styles.logo}>
            <span>{t('common.brand')}</span>
          </Link>
          <div className={styles.successBody}>
            <div className={styles.successIcon}>✉️</div>
            <h1>{t('signup.check_email_title')}</h1>
            <p>{t('signup.check_email_body')}</p>
          </div>
          <Link href="/login" className={styles.back}>{t('forgot_password.back_to_login')}</Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <Link href="/" className={styles.logo}>
          <span>{t('common.brand')}</span>
        </Link>

        <div className={styles.steps}>
          <div className={styles.step}>
            <span className={`${styles.stepCircle} ${step === 'general' ? styles.active : styles.done}`}>
              {step === 'general' ? '1' : '✓'}
            </span>
            <span className={`${styles.stepLabel} ${step === 'general' ? styles.active : ''}`}>{t('signup.step_general')}</span>
          </div>
          <span className={styles.stepDivider} />
          <div className={styles.step}>
            <span className={`${styles.stepCircle} ${step === 'institution' ? styles.active : ''}`}>2</span>
            <span className={`${styles.stepLabel} ${step === 'institution' ? styles.active : ''}`}>{t('signup.step_institution')}</span>
          </div>
        </div>

        <h1>{t('signup.title')}</h1>

        {error && <div className={styles.error}>{error}</div>}

        {step === 'general' && (
          <form onSubmit={handleNext} noValidate>
            <label className={styles.label}>
              {t('signup.full_name')}
              <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)}
                placeholder={t('signup.full_name_placeholder')} />
            </label>
            <label className={styles.label}>
              {t('login.email')}
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com" style={{ direction: 'ltr', textAlign: 'left' }} />
            </label>
            <label className={styles.label}>
              {t('signup.company_name')}
              <input type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)}
                placeholder={t('signup.company_name_placeholder')} />
            </label>
            <label className={styles.label}>
              {t('login.password')}
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder={t('accept_invite.password_placeholder')} style={{ direction: 'ltr', textAlign: 'left' }} />
            </label>

            {password && (
              <div className={inviteStyles.strengthMeter}>
                {[0, 1, 2].map((i) => (
                  <span key={i} className={`${inviteStyles.strengthSeg} ${i < strengthFilled ? strengthLevel : ''}`} />
                ))}
              </div>
            )}
            <div className={inviteStyles.rules}>
              <div className={inviteStyles.rulesTitle}>{t('accept_invite.password_rules_title')}</div>
              {[
                ['latin', 'accept_invite.password_rule_latin'],
                ['length', 'accept_invite.password_rule_length'],
                ['number', 'accept_invite.password_rule_number'],
                ['special', 'accept_invite.password_rule_special'],
              ].map(([key, labelKey]) => (
                <div key={key} className={`${inviteStyles.rule} ${rules[key] ? inviteStyles.ruleOk : ''}`}>
                  <span className={inviteStyles.ruleMark}>{rules[key] ? '✓' : '-'}</span>
                  {t(labelKey)}
                </div>
              ))}
            </div>

            <label className={styles.label}>
              {t('accept_invite.confirm_password_label')}
              <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                style={{ direction: 'ltr', textAlign: 'left' }} />
            </label>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
              {t('signup.next')}
            </button>
          </form>
        )}

        {step === 'institution' && (
          <form onSubmit={handleSubmit} noValidate>
            <FileField
              label={t('signup.cr_label')}
              hint={t('signup.file_hint')}
              file={cr}
              inputRef={crInputRef}
              onChange={setCr}
              t={t}
              styles={styles}
            />
            <FileField
              label={t('signup.vat_label')}
              hint={t('signup.file_hint')}
              file={vat}
              inputRef={vatInputRef}
              onChange={setVat}
              t={t}
              styles={styles}
            />
            <FileField
              label={t('signup.auth_letter_label')}
              hint={t('signup.file_hint')}
              file={authLetter}
              inputRef={authLetterInputRef}
              onChange={setAuthLetter}
              t={t}
              styles={styles}
            />

            <label className={styles.checkboxRow}>
              <input type="checkbox" checked={termsAccepted} onChange={(e) => setTermsAccepted(e.target.checked)} />
              <span>
                {t('signup.agree_prefix')} <Link href="/terms" target="_blank">{t('signup.terms_link')}</Link> {t('signup.and')} <Link href="/privacy" target="_blank">{t('signup.privacy_link')}</Link>
              </span>
            </label>

            <div className={styles.navRow}>
              <button type="button" className={styles.backBtn} onClick={() => { setStep('general'); setError(''); }}>
                {t('signup.back')}
              </button>
              <button type="submit" className="btn btn-primary" disabled={loading} style={{ justifyContent: 'center' }}>
                {loading ? t('signup.submitting') : t('signup.confirm')}
              </button>
            </div>
          </form>
        )}

        <Link href="/login" className={styles.back}>{t('signup.have_account')}</Link>
      </div>
    </div>
  );
}

function FileField({ label, hint, file, inputRef, onChange, t, styles }) {
  return (
    <div className={styles.fileField}>
      <label className={styles.label}>{label}</label>
      <p className={styles.fileHint}>{hint}</p>
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
