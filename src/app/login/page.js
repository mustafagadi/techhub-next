'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { login, verifyOtp, setAuth } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import styles from './login.module.css';

const RESEND_COOLDOWN_SECONDS = 45;

export default function LoginPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [step, setStep] = useState('form'); // 'form' | 'otp' | 'admin-success'

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [code, setCode] = useState('');
  const [otpError, setOtpError] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resending, setResending] = useState(false);

  const cooldownTimer = useRef(null);
  useEffect(() => () => clearInterval(cooldownTimer.current), []);

  function startCooldown() {
    setResendCooldown(RESEND_COOLDOWN_SECONDS);
    clearInterval(cooldownTimer.current);
    cooldownTimer.current = setInterval(() => {
      setResendCooldown((s) => {
        if (s <= 1) { clearInterval(cooldownTimer.current); return 0; }
        return s - 1;
      });
    }, 1000);
  }

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
      await login(email, password);
      setCode('');
      setOtpError('');
      setStep('otp');
      startCooldown();
    } catch (err) {
      // Backend messages currently come back in Arabic (scope: frontend only)
      setError(err.message || t('login.failed'));
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(e) {
    e.preventDefault();
    setOtpError('');
    setOtpLoading(true);
    try {
      const res = await verifyOtp(email, code);
      if (res.role === 'portal-admin' || res.role === 'portal-superadmin') {
        setStep('admin-success');
      } else if (res.role === 'portal-partner') {
        router.push('/partner');
      } else {
        router.push('/');
      }
    } catch (err) {
      setOtpError(err.status === 429 ? t('login.otp_rate_limited') : (err.message || t('login.otp_invalid')));
    } finally {
      setOtpLoading(false);
    }
  }

  async function handleResend() {
    if (resendCooldown > 0 || resending) return;
    setResending(true);
    setOtpError('');
    try {
      await login(email, password);
      startCooldown();
    } catch (err) {
      setOtpError(err.status === 429 ? t('login.otp_rate_limited') : (err.message || t('login.failed')));
    } finally {
      setResending(false);
    }
  }

  if (step === 'admin-success') {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <Link href="/" className={styles.logo}>
            <span>{t('common.brand')}</span>
          </Link>
          <h1>{t('login.otp_success_title')}</h1>
          <button
            type="button"
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center', marginTop: '10px' }}
            onClick={() => router.push('/admin')}
          >
            {t('login.otp_go_to_admin')}
          </button>
        </div>
      </div>
    );
  }

  if (step === 'otp') {
    return (
      <div className={styles.page}>
        {otpError && (
          <div className={styles.banner} role="alert">
            <span className={styles.bannerIcon}>!</span>
            <span>{otpError}</span>
            <button type="button" className={styles.bannerClose} onClick={() => setOtpError('')} aria-label={t('common.close')}>×</button>
          </div>
        )}
        <div className={styles.card}>
          <Link href="/" className={styles.logo}>
            <span>{t('common.brand')}</span>
          </Link>
          <h1>{t('login.otp_title')}</h1>
          <p className={styles.sub}>{t('login.otp_subtitle')}</p>

          <form onSubmit={handleVerifyOtp} noValidate>
            <label className={styles.label}>
              {t('login.otp_code_label')}
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder={t('login.otp_code_placeholder')}
                style={{ direction: 'ltr', textAlign: 'center', letterSpacing: '6px', fontSize: '1.3rem' }}
                required
                autoFocus
              />
            </label>

            <button type="submit" className="btn btn-primary" disabled={otpLoading || code.length < 6} style={{ width: '100%', justifyContent: 'center' }}>
              {otpLoading ? t('login.otp_verifying') : t('login.otp_verify')}
            </button>
          </form>

          <button
            type="button"
            className={styles.back}
            onClick={handleResend}
            disabled={resendCooldown > 0 || resending}
            style={{ background: 'none', border: 'none', cursor: resendCooldown > 0 ? 'default' : 'pointer', width: '100%' }}
          >
            {resendCooldown > 0 ? t('login.otp_resend_wait', { seconds: resendCooldown }) : t('login.otp_resend')}
          </button>
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

          <Link href="/forgot-password" className={styles.back} style={{ display: 'block', textAlign: 'end', marginTop: '-10px', marginBottom: '18px' }}>
            {t('login.forgot_password_link')}
          </Link>

          <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
            {loading ? t('login.submitting') : t('login.submit')}
          </button>
        </form>

        {/* Quick login for local development only — saves a fake session without a database, bypassing OTP. */}
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
