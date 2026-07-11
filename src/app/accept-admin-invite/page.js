'use client';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { getAdminInvite, acceptAdminInvite } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import styles from '../accept-invite/accept-invite.module.css';

function AcceptAdminInviteInner() {
  const { t } = useI18n();
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get('token');

  const [loading, setLoading] = useState(true);
  const [invite, setInvite] = useState(null);
  const [invalidReason, setInvalidReason] = useState(''); // '' | 'missing' | 'invalid'

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token) {
      setInvalidReason('missing');
      setLoading(false);
      return;
    }
    getAdminInvite(token)
      .then((data) => setInvite(data))
      .catch(() => setInvalidReason('invalid'))
      .finally(() => setLoading(false));
  }, [token]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (password.length < 8) { setError(t('accept_invite.password_too_short')); return; }
    if (password !== confirm) { setError(t('accept_invite.password_mismatch')); return; }

    setBusy(true);
    try {
      await acceptAdminInvite(token, password);
      setDone(true);
      setTimeout(() => router.push('/login'), 2500);
    } catch (err) {
      setError(err.message || t('accept_invite.account_failed'));
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <div className={styles.card}><p>{t('accept_invite.checking')}</p></div>;
  }

  if (invalidReason) {
    return (
      <div className={styles.card}>
        <h1>{t('accept_invite.invalid_title')}</h1>
        <p className={styles.sub}>
          {t(invalidReason === 'missing' ? 'accept_invite.link_missing' : 'accept_invite.invite_invalid')}
        </p>
        <Link href="/" className="btn btn-primary">{t('accept_invite.back_home_btn')}</Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className={styles.card}>
        <h1>{t('accept_invite.done_title')}</h1>
        <p className={styles.sub}>{t('accept_invite.redirecting')}</p>
      </div>
    );
  }

  const roleLabel = invite?.role === 'portal-superadmin'
    ? t('admin_users.role_superadmin')
    : t('admin_users.role_admin');

  return (
    <div className={styles.card}>
      <h1>{t('admin_invite.title')}</h1>
      <p className={styles.sub}>
        {t('admin_invite.welcome', { role: roleLabel })}
      </p>

      <form onSubmit={handleSubmit}>
        <label className={styles.label}>
          {t('login.email')}
          <input type="email" value={invite?.email || ''} disabled style={{ direction: 'ltr', textAlign: 'left', opacity: 0.7 }} />
        </label>
        <label className={styles.label}>
          {t('login.password')}
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t('accept_invite.password_placeholder')}
            style={{ direction: 'ltr', textAlign: 'left' }}
            autoFocus
          />
        </label>
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
          {busy ? t('accept_invite.creating') : t('accept_invite.create_account')}
        </button>
      </form>
    </div>
  );
}

export default function AcceptAdminInvitePage() {
  const { t } = useI18n();
  return (
    <div className={styles.wrap}>
      <Suspense fallback={<div className={styles.card}><p>{t('common.loading')}</p></div>}>
        <AcceptAdminInviteInner />
      </Suspense>
    </div>
  );
}
