'use client';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { verifyEmail, resendVerification } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import styles from '../reset-password/reset-password.module.css';

function VerifyEmailInner() {
  const { t } = useI18n();
  const params = useSearchParams();
  const email = params.get('email');
  const token = params.get('token');

  const [state, setState] = useState('loading'); // 'loading' | 'success' | 'error' | 'missing'
  const [errorMsg, setErrorMsg] = useState('');
  const [resent, setResent] = useState(false);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (!email || !token) {
      setState('missing');
      return;
    }
    verifyEmail(email, token)
      .then(() => setState('success'))
      .catch((err) => {
        setErrorMsg(err.message || '');
        setState('error');
      });
  }, [email, token]);

  async function handleResend() {
    if (!email || resending) return;
    setResending(true);
    try {
      await resendVerification(email);
      setResent(true);
    } finally {
      setResending(false);
    }
  }

  if (state === 'missing') {
    return (
      <div className={styles.card}>
        <h1>{t('verify_email.invalid_title')}</h1>
        <p className={styles.sub}>{t('verify_email.link_missing')}</p>
        <Link href="/signup" className="btn btn-primary">{t('verify_email.back_to_signup')}</Link>
      </div>
    );
  }

  if (state === 'loading') {
    return (
      <div className={styles.card}>
        <p>{t('common.loading')}</p>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className={styles.card}>
        <h1>{t('verify_email.failed_title')}</h1>
        <p className={styles.sub}>{errorMsg || t('verify_email.failed_body')}</p>
        {resent ? (
          <p className={styles.sub}>{t('verify_email.resent_message')}</p>
        ) : (
          <button type="button" className="btn btn-primary" onClick={handleResend} disabled={resending}>
            {resending ? t('verify_email.resending') : t('verify_email.resend')}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={styles.card}>
      <h1>{t('verify_email.success_title')}</h1>
      <p className={styles.sub}>{t('verify_email.success_body')}</p>
      <Link href="/login" className="btn btn-primary">{t('forgot_password.back_to_login')}</Link>
    </div>
  );
}

export default function VerifyEmailPage() {
  const { t } = useI18n();
  return (
    <div className={styles.wrap}>
      <Suspense fallback={<div className={styles.card}><p>{t('common.loading')}</p></div>}>
        <VerifyEmailInner />
      </Suspense>
    </div>
  );
}
