'use client';
import { useState } from 'react';
import Link from 'next/link';
import { forgotPassword } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import styles from '../login/login.module.css';

export default function ForgotPasswordPage() {
  const { t } = useI18n();
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!EMAIL_RE.test(email)) {
      setEmailError(t('login.email_invalid'));
      return;
    }
    setEmailError('');

    setLoading(true);
    try {
      await forgotPassword(email);
      // Always show the same success message regardless of whether the account exists — avoid enumeration.
      setDone(true);
    } catch (err) {
      setError(err.message || t('forgot_password.failed'));
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <Link href="/" className={styles.logo}>
            <span>{t('common.brand')}</span>
          </Link>
          <h1>{t('forgot_password.title')}</h1>
          <p className={styles.sub}>{t('forgot_password.success_message')}</p>
          <Link href="/login" className={styles.back}>{t('forgot_password.back_to_login')}</Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {error && (
        <div className={styles.banner} role="alert">
          <span className={styles.bannerIcon}>!</span>
          <span>{error}</span>
          <button type="button" className={styles.bannerClose} onClick={() => setError('')} aria-label={t('common.close')}>×</button>
        </div>
      )}
      <div className={styles.card}>
        <Link href="/" className={styles.logo}>
          <span>{t('common.brand')}</span>
        </Link>
        <h1>{t('forgot_password.title')}</h1>
        <p className={styles.sub}>{t('forgot_password.subtitle')}</p>

        <form onSubmit={handleSubmit} noValidate>
          <label className={styles.label}>
            {t('forgot_password.email_label')}
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); if (emailError) setEmailError(''); }}
              placeholder="you@example.com"
              required
              autoComplete="email"
              className={emailError ? styles.invalid : undefined}
            />
          </label>
          {emailError && (
            <div className={styles.fieldError}>
              <span className={styles.fieldErrorIcon}>!</span>
              {emailError}
            </div>
          )}

          <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
            {loading ? t('forgot_password.submitting') : t('forgot_password.submit')}
          </button>
        </form>

        <Link href="/login" className={styles.back}>{t('forgot_password.back_to_login')}</Link>
      </div>
    </div>
  );
}
