'use client';
import { useState, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { resetPassword } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import styles from './reset-password.module.css';

// Password strength requirements — computed live while typing (matches the accept-invite page).
function passwordRules(pw) {
  return {
    latin: /^[A-Za-z0-9!@#$%^&*_\-]*$/.test(pw) && /[A-Za-z]/.test(pw),
    length: pw.length >= 10,
    number: /\d/.test(pw),
    special: /[!@#$%^&*_\-]/.test(pw),
  };
}

function ResetPasswordInner() {
  const { t } = useI18n();
  const router = useRouter();
  const params = useSearchParams();
  const email = params.get('email');
  const token = params.get('token');

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const rules = useMemo(() => passwordRules(password), [password]);
  const rulesPassed = Object.values(rules).filter(Boolean).length;
  const strengthFilled = password.length === 0 ? 0 : Math.max(1, Math.ceil((rulesPassed / 4) * 3));
  const strengthLevel = rulesPassed === 4 ? styles.strengthStrong : rulesPassed >= 3 ? styles.strengthMedium : styles.strengthWeak;

  if (!email || !token) {
    return (
      <div className={styles.card}>
        <h1>{t('reset_password.invalid_title')}</h1>
        <p className={styles.sub}>{t('reset_password.link_missing')}</p>
        <Link href="/forgot-password" className="btn btn-primary">{t('reset_password.request_new')}</Link>
      </div>
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!Object.values(rules).every(Boolean)) { setError(t('accept_invite.password_requirements_not_met')); return; }
    if (password !== confirm) { setError(t('accept_invite.password_mismatch')); return; }

    setBusy(true);
    try {
      await resetPassword(email, token, password);
      setDone(true);
      setTimeout(() => router.push('/login'), 2500);
    } catch (err) {
      setError(err.message || t('reset_password.failed'));
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className={styles.card}>
        <h1>{t('reset_password.done_title')}</h1>
        <p className={styles.sub}>{t('reset_password.redirecting')}</p>
      </div>
    );
  }

  return (
    <div className={styles.card}>
      <h1>{t('reset_password.title')}</h1>
      <p className={styles.sub}>{t('reset_password.subtitle')}</p>

      <form onSubmit={handleSubmit}>
        <label className={styles.label}>
          {t('login.email')}
          <input type="email" value={email} disabled style={{ direction: 'ltr', textAlign: 'left', opacity: 0.7 }} />
        </label>
        <label className={styles.label}>
          {t('reset_password.new_password_label')}
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t('accept_invite.password_placeholder')}
            style={{ direction: 'ltr', textAlign: 'left' }}
            autoFocus
          />
        </label>

        {password && (
          <div className={styles.strengthMeter}>
            {[0, 1, 2].map((i) => (
              <span key={i} className={`${styles.strengthSeg} ${i < strengthFilled ? strengthLevel : ''}`} />
            ))}
          </div>
        )}
        <div className={styles.rules}>
          <div className={styles.rulesTitle}>{t('accept_invite.password_rules_title')}</div>
          {[
            ['latin', 'accept_invite.password_rule_latin'],
            ['length', 'accept_invite.password_rule_length'],
            ['number', 'accept_invite.password_rule_number'],
            ['special', 'accept_invite.password_rule_special'],
          ].map(([key, labelKey]) => (
            <div key={key} className={`${styles.rule} ${rules[key] ? styles.ruleOk : ''}`}>
              <span className={styles.ruleMark}>{rules[key] ? '✓' : '-'}</span>
              {t(labelKey)}
            </div>
          ))}
        </div>

        <label className={styles.label}>
          {t('accept_invite.confirm_password_label')}
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            style={{ direction: 'ltr', textAlign: 'left' }}
          />
        </label>

        {error && <div className={styles.error}>{error}</div>}

        <button type="submit" className="btn btn-primary" disabled={busy} style={{ width: '100%', justifyContent: 'center' }}>
          {busy ? t('reset_password.resetting') : t('reset_password.submit')}
        </button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  const { t } = useI18n();
  return (
    <div className={styles.wrap}>
      <Suspense fallback={<div className={styles.card}><p>{t('common.loading')}</p></div>}>
        <ResetPasswordInner />
      </Suspense>
    </div>
  );
}
