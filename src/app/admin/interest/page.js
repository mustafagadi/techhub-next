'use client';
import { useState, useEffect, useCallback } from 'react';
import { getInterestRequests, updateInterestStatus, createPartnerAccount } from '@/lib/api';
import styles from '../admin.module.css';

export default function InterestPage() {
  const [interest, setInterest] = useState([]);
  const [interestLoading, setInterestLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [busy, setBusy] = useState(null);
  const [toast, setToast] = useState(null);
  const [accountModal, setAccountModal] = useState(null);
  const [rejectModal, setRejectModal] = useState(null);

  const loadInterest = useCallback(() => {
    setInterestLoading(true);
    setLoadError(false);
    getInterestRequests()
      .then((d) => setInterest(Array.isArray(d) ? d : []))
      .catch(() => setLoadError(true))
      .finally(() => setInterestLoading(false));
  }, []);
  useEffect(() => { loadInterest(); }, [loadInterest]);

  function notify(message, ok = true) {
    setToast({ message, ok });
    setTimeout(() => setToast(null), 3000);
  }

  async function handleInterestStatus(item, status) {
    const id = item.id;
    setBusy(id);
    try {
      await updateInterestStatus(id, { status, adminNote: null });
      notify('تم تحديث حالة الطلب.');
      loadInterest();
    } catch (err) {
      notify(err.message || 'تعذّر تحديث الحالة.', false);
    } finally {
      setBusy(null);
    }
  }

  async function handleCreateAccount(form) {
    setBusy(accountModal?.id);
    try {
      await createPartnerAccount(form);
      if (form.interestId) {
        try { await updateInterestStatus(form.interestId, { status: 2, adminNote: 'account created: ' + form.email }); } catch {}
      }
      notify(`تم ارسال الدعوة إلى «${form.email}».`);
      setAccountModal(null);
      loadInterest();
    } catch (err) {
      notify(err.message || 'تعذر إرسال الدعوة.', false);
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <div className={styles.topbar}>
        <h1>طلبات الاهتمام</h1>
        <span className={styles.env}>● بيئة prod</span>
      </div>
      <div className={styles.content}>
        <div className={styles.card}>
          <div className={styles.cardHead}><span>طلبات الاهتمام</span></div>
          <table className={styles.table}>
            <thead><tr><th>الاسم</th><th>الشركة</th><th>البريد</th><th>الحالة</th><th>الإجراء</th></tr></thead>
            <tbody>
              {interest.filter((it) => {
                const s = it.status;
                return s === 0 || s === 1 || s === 'new' || s === undefined || s === null;
              }).map((it, i) => (
                <tr key={i}>
                  <td>{it.fullName || it.name || it.FullName || `${it.firstName||''} ${it.lastName||''}`.trim() || '—'}</td>
                  <td>{it.company || it.companyName}</td>
                  <td style={{ direction: 'ltr' }}>{it.email}</td>
                  <td>{interestLabel(it.status)}</td>
                  <td>
                    <button className={styles.ok} onClick={() => setAccountModal(it)} disabled={busy === it.id}>
                      قبول ودعوة
                    </button>{' '}
                    <button className={styles.no} onClick={() => setRejectModal(it)} disabled={busy === it.id}>
                      رفض
                    </button>
                  </td>
                </tr>
              ))}
              {interestLoading && <tr><td colSpan="5" className={styles.empty}>جارٍ تحميل الطلبات…</td></tr>}
              {!interestLoading && loadError && (
                <tr><td colSpan="5" className={styles.empty}>تعذّر تحميل الطلبات. <button className={styles.priceBtn} onClick={loadInterest}>إعادة المحاولة</button></td></tr>
              )}
              {!interestLoading && !loadError && !interest.length && <tr><td colSpan="5" className={styles.empty}>لا توجد طلبات.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {accountModal && (
        <AccountModal
          interest={accountModal}
          onClose={() => setAccountModal(null)}
          onCreate={handleCreateAccount}
        />
      )}
      {rejectModal && (
        <div className={styles.overlay} onClick={() => setRejectModal(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()} style={{ maxWidth: '380px' }}>
            <h2>تأكيد الرفض</h2>
            <p className={styles.modalNote}>
              هل تريد رفض طلب «{rejectModal.companyName || rejectModal.company || rejectModal.email}»؟
              لن يظهر الطلب في القائمة بعد الرفض.
            </p>
            <div className={styles.modalActions}>
              <button
                className={styles.no}
                onClick={async () => { await handleInterestStatus(rejectModal, 3); setRejectModal(null); }}
                disabled={busy === rejectModal.id}
              >
                {busy === rejectModal.id ? '…' : 'تأكيد الرفض'}
              </button>
              <button className={styles.cancel} onClick={() => setRejectModal(null)}>إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className={`${styles.toast} ${toast.ok ? styles.toastOk : styles.toastErr}`}>
          {toast.message}
        </div>
      )}
    </>
  );
}

function AccountModal({ interest, onClose, onCreate }) {
  // بيانات الاهتمام تخزّن الاسم كاملًا في حقل واحد (fullName)، والجهة في companyName.
  const defaultName = interest.fullName || interest.name || interest.FullName || '';
  const defaultCompany = interest.companyName || interest.company || interest.CompanyName || '';
  const defaultEmail = interest.email || interest.Email || '';

  const [email, setEmail] = useState(defaultEmail);
  const [fullName, setFullName] = useState(defaultName);
  const [company, setCompany] = useState(defaultCompany);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function submit() {
    if (!email.trim()) { setErr('البريد الإلكتروني مطلوب.'); return; }
    setBusy(true); setErr('');
    // الخلفية تتوقّع firstName/lastName — نقسّم الاسم الكامل
    const parts = fullName.trim().split(/\s+/).filter(Boolean);
    const firstName = parts[0] || '';
    const lastName = parts.length > 1 ? parts.slice(1).join(' ') : '';
    try {
      await onCreate({
        email: email.trim(),
        firstName,
        lastName,
        companyName: company.trim(),
        interestId: interest.id,
      });
    } catch (e) {
      setErr(e.message || 'تعذر إرسال الدعوة.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h2>دعوة شريك</h2>
        <p className={styles.modalNote}>
          ستُرسل دعوة إلى بريد الشريك لإنشاء حسابه. الشريك يحدد كلمة مروره بنفسه عبر رابط الدعوة.
        </p>
        <label className={styles.label}>البريد الإلكتروني
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} style={{ direction: 'ltr', textAlign: 'left' }} />
        </label>
        <label className={styles.label}>الاسم الكامل
          <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </label>
        <label className={styles.label}>الجهة
          <input type="text" value={company} onChange={(e) => setCompany(e.target.value)} />
        </label>
        {err && <div className={styles.error}>{err}</div>}
        <div className={styles.modalActions}>
          <button className="btn btn-primary" onClick={submit} disabled={busy || !email.trim()}>
            {busy ? 'جاري الإرسال…' : 'إرسال الدعوة'}
          </button>
          <button className={styles.cancel} onClick={onClose}>إلغاء</button>
        </div>
      </div>
    </div>
  );
}

function interestLabel(status) {
  const map = { 0: 'جديد', 1: 'تم التواصل', 2: 'مقبول', 3: 'مرفوض' };
  if (typeof status === 'number') return map[status] || 'جديد';
  return status || 'جديد';
}
