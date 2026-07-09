'use client';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { getInvite, acceptInvite, saveProfile } from '@/lib/api';
import styles from './accept-invite.module.css';

function AcceptInviteInner() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get('token');

  const [loading, setLoading] = useState(true);
  const [invite, setInvite] = useState(null);
  const [invalid, setInvalid] = useState('');

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  // جلب بيانات الدعوة عند فتح الصفحة
  useEffect(() => {
    if (!token) {
      setInvalid('رابط الدعوة ناقص.');
      setLoading(false);
      return;
    }
    getInvite(token)
      .then((data) => setInvite(data))
      .catch(() => setInvalid('الدعوة غير صالحة أو منتهية الصلاحية.'))
      .finally(() => setLoading(false));
  }, [token]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (password.length < 8) { setError('كلمة المرور يجب ألا تقل عن 8 أحرف.'); return; }
    if (password !== confirm) { setError('كلمة المرور غير متطابقة.'); return; }

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
      setError(err.message || 'تعذّر إنشاء الحساب.');
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <div className={styles.card}><p>جارٍ التحقّق من الدعوة…</p></div>;
  }

  if (invalid) {
    return (
      <div className={styles.card}>
        <h1>دعوة غير صالحة</h1>
        <p className={styles.sub}>{invalid}</p>
        <Link href="/" className="btn btn-primary">العودة للرئيسية</Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className={styles.card}>
        <h1>تم إنشاء حسابك ✓</h1>
        <p className={styles.sub}>سيتم تحويلك لصفحة الدخول…</p>
      </div>
    );
  }

  return (
    <div className={styles.card}>
      <h1>إنشاء حسابك</h1>
      <p className={styles.sub}>
        مرحبًا{invite?.firstName ? ` ${invite.firstName}` : ''}، أنشئ كلمة المرور لحسابك.
      </p>

      <form onSubmit={handleSubmit}>
        <label className={styles.label}>
          البريد الإلكتروني
          <input type="email" value={invite?.email || ''} disabled style={{ direction: 'ltr', textAlign: 'left', opacity: 0.7 }} />
        </label>
        <label className={styles.label}>
          كلمة المرور
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="٨ أحرف على الأقل"
            style={{ direction: 'ltr', textAlign: 'left' }}
            autoFocus
          />
        </label>
        <label className={styles.label}>
          تأكيد كلمة المرور
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            style={{ direction: 'ltr', textAlign: 'left' }}
          />
        </label>

        {error && <div className={styles.error}>{error}</div>}

        <button type="submit" className="btn btn-primary" disabled={busy} style={{ width: '100%', justifyContent: 'center' }}>
          {busy ? 'جارٍ الإنشاء…' : 'إنشاء الحساب'}
        </button>
      </form>
    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <div className={styles.wrap}>
      <Suspense fallback={<div className={styles.card}><p>جارٍ التحميل…</p></div>}>
        <AcceptInviteInner />
      </Suspense>
    </div>
  );
}
