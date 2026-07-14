'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { login, setAuth } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import styles from './login.module.css';

export default function LoginPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
      const res = await login(email, password);
      // توجيه حسب الدور
      if (res.role === 'portal-admin' || res.role === 'portal-superadmin') router.push('/admin');
      else if (res.role === 'portal-partner') router.push('/partner');
      else router.push('/');
    } catch (err) {
      // رسائل الخلفية تعود بالعربية حاليًّا (النطاق: الواجهة فقط)
      setError(err.message || t('login.failed'));
    } finally {
      setLoading(false);
    }
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
        <h1>{t('login.title')}</h1>
        <p className={styles.sub}>{t('login.subtitle')}</p>

        <form onSubmit={handleSubmit} noValidate>
          <label className={styles.label}>
            {t('login.email')}
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
          <label className={styles.label}>
            {t('login.password')}
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />
          </label>

          <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
            {loading ? t('login.submitting') : t('login.submit')}
          </button>
        </form>

        {/* دخول سريع للتطوير المحلي فقط — يحفظ جلسة وهمية دون قاعدة بيانات. */}
        <div className={styles.devBox}>
          <div className={styles.devLabel}>{t('login.dev_quick')}</div>
          <div className={styles.devButtons}>
            <button
              type="button"
              className={styles.devBtn}
              onClick={() => {
                setAuth('localdev-token', 'partner@local.test', 'portal-partner');
                router.push('/partner');
              }}
            >
              {t('login.dev_as_partner')}
            </button>
            <button
              type="button"
              className={styles.devBtn}
              onClick={() => {
                setAuth('localdev-token', 'admin@local.test', 'portal-admin', []);
                router.push('/admin');
              }}
            >
              {t('login.dev_as_admin')}
            </button>
            <button
              type="button"
              className={styles.devBtn}
              onClick={() => {
                setAuth('localdev-token', 'superadmin@local.test', 'portal-superadmin', []);
                router.push('/admin');
              }}
            >
              {t('login.dev_as_superadmin')}
            </button>
          </div>
          <div className={styles.devHint}>{t('login.dev_only')}</div>
        </div>

        <Link href="/" className={styles.back}>{t('common.back_home')}</Link>
      </div>
    </div>
  );
}
