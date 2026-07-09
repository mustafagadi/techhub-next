'use client';
import { useState, useEffect, useCallback } from 'react';
import { getAllPromotions, approvePromotion, rejectPromotion } from '@/lib/api';
import { fmtDateTime } from '@/lib/dates';
import { normalizePromotionStatus, PROMOTION_STATUS_LABEL } from '@/lib/status';
import styles from '../admin.module.css';

export default function PromotionsPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);
  const [toast, setToast] = useState(null);
  const [filter, setFilter] = useState('Pending');
  const [rejectModal, setRejectModal] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    getAllPromotions(filter || undefined)
      .then((d) => setRequests(Array.isArray(d?.requests) ? d.requests : []))
      .catch(() => setRequests([]))
      .finally(() => setLoading(false));
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  function notify(message, ok = true) {
    setToast({ message, ok });
    setTimeout(() => setToast(null), 3500);
  }

  async function handleApprove(item) {
    setBusy(item.id);
    try {
      await approvePromotion(item.id);
      notify(`فُعّلت «${item.productName}» في الإنتاج للشريك ${item.developerEmail}.`);
      load();
    } catch (err) {
      notify(err.message || 'تعذّر إتمام الترقية.', false);
    } finally {
      setBusy(null);
    }
  }

  async function handleReject(item, note) {
    setBusy(item.id);
    try {
      await rejectPromotion(item.id, note);
      notify(`رُفض طلب ترقية «${item.productName}».`);
      setRejectModal(null);
      load();
    } catch (err) {
      notify(err.message || 'تعذّر رفض الطلب.', false);
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <div className={styles.topbar}>
        <h1>طلبات الترقية للإنتاج</h1>
        <span className={styles.env}>● بيئة prod</span>
      </div>

      <div className={styles.content}>
        <div className={styles.card}>
          <div className={styles.cardHead}>
            <span>الطلبات ({requests.length})</span>
            <div className={styles.filterChips}>
              {[
                { v: 'Pending', l: 'بانتظار المراجعة' },
                { v: 'Approved', l: 'مقبولة' },
                { v: 'Rejected', l: 'مرفوضة' },
                { v: '', l: 'الكل' },
              ].map((f) => (
                <button
                  key={f.v || 'all'}
                  className={`${styles.filterChip} ${filter === f.v ? styles.filterChipOn : ''}`}
                  onClick={() => setFilter(f.v)}
                >
                  {f.l}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className={styles.empty}>جارٍ تحميل الطلبات…</div>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>الشريك</th>
                  <th>الخدمة</th>
                  <th>تطبيق الاختبار</th>
                  <th>تاريخ الطلب</th>
                  <th>الحالة</th>
                  <th>الإجراء</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((r) => {
                  const st = normalizePromotionStatus(r.status);
                  return (
                  <tr key={r.id}>
                    <td>{r.developerEmail}</td>
                    <td>{r.productName}</td>
                    <td>{r.appName || '—'}</td>
                    <td>{fmtDateTime(r.createdAt)}</td>
                    <td>
                      <span className={
                        st === 'Approved' ? styles.badgeOk
                          : st === 'Rejected' ? styles.badgeBad
                            : styles.badgeWait
                      }>
                        {PROMOTION_STATUS_LABEL[st] || st}
                      </span>
                    </td>
                    <td>
                      {st === 'Pending' ? (
                        <div className={styles.rowActions}>
                          <button
                            className={styles.approveBtn}
                            onClick={() => handleApprove(r)}
                            disabled={busy === r.id}
                          >
                            {busy === r.id ? 'جارٍ…' : 'قبول'}
                          </button>
                          <button
                            className={styles.rejectBtn}
                            onClick={() => setRejectModal(r)}
                            disabled={busy === r.id}
                          >
                            رفض
                          </button>
                        </div>
                      ) : (
                        <span className={styles.muted}>{r.adminNote || '—'}</span>
                      )}
                    </td>
                  </tr>
                  );
                })}
                {!requests.length && (
                  <tr><td colSpan="6" className={styles.empty}>لا توجد طلبات مطابقة.</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {rejectModal && (
        <RejectModal
          item={rejectModal}
          busy={busy === rejectModal.id}
          onCancel={() => setRejectModal(null)}
          onConfirm={(note) => handleReject(rejectModal, note)}
        />
      )}

      {toast && (
        <div className={toast.ok ? styles.toastOk : styles.toastErr}>{toast.message}</div>
      )}
    </>
  );
}

// نافذة تأكيد الرفض مع سبب اختياري
function RejectModal({ item, busy, onCancel, onConfirm }) {
  const [note, setNote] = useState('');
  return (
    <div className={styles.overlay} onClick={onCancel}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h2>رفض طلب الترقية</h2>
        <p className={styles.modalNote}>
          سيُرفض طلب ترقية «{item.productName}» للشريك {item.developerEmail}.
          وصوله في بيئة الاختبار يبقى كما هو.
        </p>
        <label className={styles.label}>
          سبب الرفض (اختياري)
          <textarea
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="مثال: لم تكتمل الاختبارات المطلوبة."
          />
        </label>
        <div className={styles.modalActions}>
          <button className={styles.cancel} onClick={onCancel} disabled={busy}>إلغاء</button>
          <button className={styles.rejectBtn} onClick={() => onConfirm(note)} disabled={busy}>
            {busy ? 'جارٍ الرفض…' : 'تأكيد الرفض'}
          </button>
        </div>
      </div>
    </div>
  );
}
