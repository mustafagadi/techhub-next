'use client';
import { useState, useEffect, useCallback } from 'react';
import { getAllProducts, publishProduct, unpublishProduct, setPricing, setApprovalType } from '@/lib/api';
import styles from '../admin.module.css';

const PAGE_SIZE = 20;

export default function ServicesPage() {
  const [services, setServices] = useState([]);
  const [svcSearch, setSvcSearch] = useState('');
  const [svcPage, setSvcPage] = useState(1);
  const [busy, setBusy] = useState(null);
  const [toast, setToast] = useState(null);
  const [pricingModal, setPricingModal] = useState(null);
  const [loadError, setLoadError] = useState(false);

  const loadServices = useCallback(() => {
    setLoadError(false);
    getAllProducts().then((d) => setServices(Array.isArray(d) ? d : [])).catch(() => setLoadError(true));
  }, []);
  useEffect(() => { loadServices(); }, [loadServices]);

  function notify(message, ok = true) {
    setToast({ message, ok });
    setTimeout(() => setToast(null), 3000);
  }

  async function togglePublish(svc) {
    const name = svc.name;
    setBusy(name);
    try {
      if (svc.isPublished ?? svc.isPublishedToPortal) {
        await unpublishProduct(name);
        notify(`تم الاخفاء «${svc.displayName || name}».`);
      } else {
        await publishProduct(name);
        notify(`تم النشر «${svc.displayName || name}».`);
      }
      loadServices();
    } catch (err) {
      notify(err.message || 'تعذّر تنفيذ العملية.', false);
    } finally {
      setBusy(null);
    }
  }

  async function toggleApproval(svc) {
    const name = svc.name;
    const isManual = (svc.approvalType || '').toLowerCase() === 'manual';
    const next = isManual ? 'auto' : 'manual';
    setBusy(name);
    try {
      await setApprovalType(name, next);
      notify(next === 'manual'
        ? `«${svc.displayName || name}» تتطلّب موافقة المسؤول الآن.`
        : `«${svc.displayName || name}» تُعتمد تلقائيًّا الآن.`);
      loadServices();
    } catch (err) {
      notify(err.message || 'تعذّر تغيير نوع الاعتماد.', false);
    } finally {
      setBusy(null);
    }
  }

  async function handleSetPricing(svc, price, billingType, quotaLimit) {
    setBusy(svc.name);
    try {
      const data = { price: Number(price), billingType };
      if (billingType === 'quota') data.quotaLimit = Number(quotaLimit);
      await setPricing(svc.name, data);
      notify(`تم تحديد السعر «${svc.displayName || svc.name}».`);
      loadServices();
    } catch (err) {
      notify(err.message || 'تعذّر تحديد السعر.', false);
    } finally {
      setBusy(null);
    }
  }

  const filtered = services.filter((s) => {
    if (!svcSearch) return true;
    const t = (s.displayName || s.name || '').toLowerCase();
    return t.includes(svcSearch.toLowerCase());
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const page = Math.min(svcPage, totalPages);
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <>
      <div className={styles.topbar}>
        <h1>الخدمات</h1>
        <span className={styles.env}>● بيئة prod</span>
      </div>
      <div className={styles.content}>
        {loadError && (
          <div className={styles.error}>
            تعذّر تحميل الخدمات. <button className={styles.priceBtn} onClick={loadServices}>إعادة المحاولة</button>
          </div>
        )}
        <div className={styles.card}>
          <div className={styles.cardHead}>
            <span>إدارة الخدمات ({filtered.length})</span>
            <input
              className={styles.searchBox}
              placeholder="ابحث عن خدمة…"
              value={svcSearch}
              onChange={(e) => { setSvcSearch(e.target.value); setSvcPage(1); }}
            />
          </div>
          <table className={styles.table}>
            <thead><tr><th>الخدمة</th><th>السعر</th><th>منشورة</th><th>الإجراء</th></tr></thead>
            <tbody>
              {pageItems.map((s, i) => {
                const published = s.isPublished ?? s.isPublishedToPortal;
                return (
                <tr key={i}>
                  <td>{s.displayName || s.name}</td>
                  <td>{s.price ? `${s.price} ر.س` : 'مجانية'}</td>
                  <td>{published ? 'نعم' : 'لا'}</td>
                  <td>
                    <button className={published ? styles.no : styles.ok} onClick={() => togglePublish(s)} disabled={busy === s.name}>
                      {busy === s.name ? '…' : (published ? 'إخفاء' : 'نشر')}
                    </button>{' '}
                    <button className={styles.priceBtn} onClick={() => setPricingModal(s)} disabled={busy === s.name}>
                      تسعير
                    </button>{' '}
                    <button className={styles.priceBtn} onClick={() => toggleApproval(s)} disabled={busy === s.name} title="تبديل بين الموافقة اليدوية والتلقائية">
                      {(s.approvalType || '').toLowerCase() === 'manual' ? 'موافقة: يدوية' : 'موافقة: تلقائية'}
                    </button>
                  </td>
                </tr>
                );
              })}
              {!filtered.length && <tr><td colSpan="4" className={styles.empty}>لا توجد خدمات مطابقة.</td></tr>}
            </tbody>
          </table>
          {totalPages > 1 && (
            <div className={styles.pager}>
              <button onClick={() => setSvcPage(page - 1)} disabled={page <= 1}>السابق</button>
              <span>صفحة {page} من {totalPages}</span>
              <button onClick={() => setSvcPage(page + 1)} disabled={page >= totalPages}>التالي</button>
            </div>
          )}
        </div>
      </div>

      {pricingModal && (
        <PricingModal
          service={pricingModal}
          busy={busy === pricingModal.name}
          onClose={() => setPricingModal(null)}
          onSave={async (price, billingType, quotaLimit) => {
            await handleSetPricing(pricingModal, price, billingType, quotaLimit);
            setPricingModal(null);
          }}
        />
      )}

      {toast && (
        <div className={`${styles.toast} ${toast.ok ? styles.toastOk : styles.toastErr}`}>
          {toast.message}
        </div>
      )}
    </>
  );
}

function PricingModal({ service, busy, onClose, onSave }) {
  const [price, setPrice] = useState(service.price || '');
  const [billingType, setBillingType] = useState('Monthly');
  const [quotaLimit, setQuotaLimit] = useState('');

  const isQuota = billingType === 'quota';

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h2>تسعير «{service.displayName || service.name}»</h2>
        <label className={styles.modalLabel}>
          نوع الفوترة
          <select value={billingType} onChange={(e) => setBillingType(e.target.value)}>
            <option value="one-time">مرة واحدة</option>
            <option value="subscription">اشتراك متجدد</option>
            <option value="quota">حسب الاستهلاك (عدد طلبات)</option>
          </select>
        </label>

        {isQuota && (
          <label className={styles.modalLabel}>
            عدد الطلبات المسموح
            <input
              type="number"
              min="1"
              value={quotaLimit}
              onChange={(e) => setQuotaLimit(e.target.value)}
              placeholder="مثال: 10000"
            />
          </label>
        )}

        <label className={styles.modalLabel}>
          {isQuota ? 'السعر لهذه الحزمة (ر.س)' : 'السعر (ر.س)'}
          <input
            type="number"
            min="0"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="0 = مجانية"
          />
        </label>

        {isQuota && (
          <p className={styles.quotaNote}>
            الفرض الفعلي لحدّ الطلبات يتم عبر سياسة Quota في Apigee. هنا تُحفظ الخطة للعرض والفوترة.
          </p>
        )}

        <div className={styles.modalActions}>
          <button
            className="btn btn-primary"
            onClick={() => onSave(price, billingType, quotaLimit)}
            disabled={busy || (isQuota && !quotaLimit)}
          >
            {busy ? 'جارٍ الحفظ…' : 'حفظ السعر'}
          </button>
          <button className={styles.cancel} onClick={onClose}>إلغاء</button>
        </div>
      </div>
    </div>
  );
}
