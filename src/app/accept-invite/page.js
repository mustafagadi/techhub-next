'use client';
import { useState, useEffect, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { getInvite, acceptInvite, saveProfile } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import styles from './accept-invite.module.css';

// شروط قوة كلمة المرور — تُحسب حيًّا أثناء الكتابة (تطابق تصميم Figma)
function passwordRules(pw) {
  return {
    latin: /^[A-Za-z0-9!@#$%^&*_\-]*$/.test(pw) && /[A-Za-z]/.test(pw),
    length: pw.length >= 10,
    number: /\d/.test(pw),
    special: /[!@#$%^&*_\-]/.test(pw),
  };
}

function AcceptInviteInner() {
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

  // جلب بيانات الدعوة عند فتح الصفحة
  useEffect(() => {
    if (!token) {
      setInvalidReason('missing');
      setLoading(false);
      return;
    }
    getInvite(token)
      .then((data) => setInvite(data))
      .catch(() => setInvalidReason('invalid'))
      .finally(() => setLoading(false));
  }, [token]);

  const rules = useMemo(() => passwordRules(password), [password]);
  const rulesPassed = Object.values(rules).filter(Boolean).length;
  // 3 مقاطع تقوية: على الأقل مقطع واحد أحمر بمجرد الكتابة، ثم تتدرّج مع اكتمال الشروط
  const strengthFilled = password.length === 0 ? 0 : Math.max(1, Math.ceil((rulesPassed / 4) * 3));
  const strengthLevel = rulesPassed === 4 ? styles.strengthStrong : rulesPassed >= 3 ? styles.strengthMedium : styles.strengthWeak;

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!Object.values(rules).every(Boolean)) { setError(t('accept_invite.password_requirements_not_met')); return; }
    if (password !== confirm) { setError(t('accept_invite.password_mismatch')); return; }

    setBusy(true);
    try {
      await acceptInvite(token, password);
      // حفظ بيانات الدعوة في الملف الشخصي، فتُملأ تلقائيًّا عند أول دخول
      if (invite) {
        saveProfile({
          firstName: invite.firstName || '',
          lastName: invite.lastName || '',
          companyName: invite.companyName || '',
        });
      }
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

  return (
    <div className={styles.card}>
      <h1>{t('accept_invite.title')}</h1>
      <p className={styles.sub}>
        {t('accept_invite.welcome', { name: invite?.firstName ? ` ${invite.firstName}` : '' })}
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
          {busy ? t('accept_invite.creating') : t('accept_invite.create_account')}
        </button>
      </form>
    </div>
  );
}

export default function AcceptInvitePage() {
  const { t } = useI18n();
  return (
    <div className={styles.wrap}>
      <Suspense fallback={<div className={styles.card}><p>{t('common.loading')}</p></div>}>
        <AcceptInviteInner />
      </Suspense>
    </div>
  );
}
