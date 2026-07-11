'use client';
import { useState, useEffect, useCallback } from 'react';
import { getAllProducts, publishProduct, unpublishProduct, setPricing, setApprovalType, hasPermission } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import styles from '../admin.module.css';

const PAGE_SIZE = 20;

export default function ServicesPage() {
  const { t } = useI18n();
  const canPublish = hasPermission('products.publish');
  const canPrice = hasPermission('products.pricing');
  const canApproval = hasPermission('products.approval');
  const [services, setServices] = useState([]);
  const [svcSearch, setSvcSearch] = useState('');
  const [svcPage, setSvcPage] = useState(1);
  const [busy, setBusy] = useState(null);
  const [toast, setToast] = useState(null);
  const [pricingModal, setPricingModal] = useState(null);

  const loadServices = useCallback(() => {
    getAllProducts().then((d) => setServices(Array.isArray(d) ? d : [])).catch(() => {});
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
        notify(t('admin_services.hidden_success', { name: svc.displayName || name }));
      } else {
        await publishProduct(name);
        notify(t('admin_services.published_success', { name: svc.displayName || name }));
      }
      loadServices();
    } catch (err) {
      notify(err.message || t('access.action_failed'), false);
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
        ? t('admin_services.approval_manual_set', { name: svc.displayName || name })
        : t('admin_services.approval_auto_set', { name: svc.displayName || name }));
      loadServices();
    } catch (err) {
      notify(err.message || t('admin_services.approval_change_failed'), false);
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
      notify(t('admin_services.pricing_set_success', { name: svc.displayName || svc.name }));
      loadServices();
    } catch (err) {
      notify(err.message || t('admin_services.pricing_set_failed'), false);
    } finally {
      setBusy(null);
    }
  }

  const filtered = services.filter((s) => {
    if (!svcSearch) return true;
    const name = (s.displayName || s.name || '').toLowerCase();
    return name.includes(svcSearch.toLowerCase());
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const page = Math.min(svcPage, totalPages);
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <>
      <div className={styles.topbar}>
        <h1>{t('nav.services')}</h1>
        <span className={styles.env}>{t('overview.env_prod')}</span>
      </div>
      <div className={styles.content}>
        <div className={styles.card}>
          <div className={styles.cardHead}>
            <span>{t('admin_services.manage_title', { count: filtered.length })}</span>
            <input
              className={styles.searchBox}
              placeholder={t('admin_services.search_placeholder')}
              value={svcSearch}
              onChange={(e) => { setSvcSearch(e.target.value); setSvcPage(1); }}
            />
          </div>
          <table className={styles.table}>
            <thead><tr><th>{t('orders.col_service')}</th><th>{t('admin_services.col_price')}</th><th>{t('service_card.published')}</th><th>{t('access.col_action')}</th></tr></thead>
            <tbody>
              {pageItems.map((s, i) => {
                const published = s.isPublished ?? s.isPublishedToPortal;
                return (
                <tr key={i}>
                  <td>{s.displayName || s.name}</td>
                  <td>{s.price ? `${s.price} ${t('service.currency')}` : t('orders.free')}</td>
                  <td>{published ? t('admin_services.yes') : t('admin_services.no')}</td>
                  <td>
                    {canPublish && (
                      <button className={published ? styles.no : styles.ok} onClick={() => togglePublish(s)} disabled={busy === s.name}>
                        {busy === s.name ? '…' : (published ? t('partner.hide') : t('admin_services.publish'))}
                      </button>
                    )}{' '}
                    {canPrice && (
                      <button className={styles.priceBtn} onClick={() => setPricingModal(s)} disabled={busy === s.name}>
                        {t('admin_services.pricing_btn')}
                      </button>
                    )}{' '}
                    {canApproval && (
                      <button className={styles.priceBtn} onClick={() => toggleApproval(s)} disabled={busy === s.name} title={t('admin_services.approval_toggle_title')}>
                        {(s.approvalType || '').toLowerCase() === 'manual' ? t('admin_services.approval_manual') : t('admin_services.approval_auto')}
                      </button>
                    )}
                    {!canPublish && !canPrice && !canApproval && <span className={styles.muted}>—</span>}
                  </td>
                </tr>
                );
              })}
              {!filtered.length && <tr><td colSpan="4" className={styles.empty}>{t('admin_services.empty')}</td></tr>}
            </tbody>
          </table>
          {totalPages > 1 && (
            <div className={styles.pager}>
              <button onClick={() => setSvcPage(page - 1)} disabled={page <= 1}>{t('admin_services.prev')}</button>
              <span>{t('admin_services.page_of', { page, total: totalPages })}</span>
              <button onClick={() => setSvcPage(page + 1)} disabled={page >= totalPages}>{t('admin_services.next')}</button>
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
  const { t } = useI18n();
  const [price, setPrice] = useState(service.price || '');
  const [billingType, setBillingType] = useState('Monthly');
  const [quotaLimit, setQuotaLimit] = useState('');

  const isQuota = billingType === 'quota';

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h2>{t('admin_services.pricing_modal_title', { name: service.displayName || service.name })}</h2>
        <label className={styles.modalLabel}>
          {t('admin_services.billing_type_label')}
          <select value={billingType} onChange={(e) => setBillingType(e.target.value)}>
            <option value="one-time">{t('orders.billing_one_time')}</option>
            <option value="subscription">{t('admin_services.billing_subscription_recurring')}</option>
            <option value="quota">{t('admin_services.billing_quota')}</option>
          </select>
        </label>

        {isQuota && (
          <label className={styles.modalLabel}>
            {t('admin_services.quota_limit_label')}
            <input
              type="number"
              min="1"
              value={quotaLimit}
              onChange={(e) => setQuotaLimit(e.target.value)}
              placeholder={t('admin_services.quota_limit_placeholder')}
            />
          </label>
        )}

        <label className={styles.modalLabel}>
          {isQuota ? t('admin_services.price_label_quota') : t('admin_services.price_label')}
          <input
            type="number"
            min="0"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder={t('admin_services.price_placeholder')}
          />
        </label>

        {isQuota && (
          <p className={styles.quotaNote}>
            {t('admin_services.quota_note')}
          </p>
        )}

        <div className={styles.modalActions}>
          <button
            className="btn btn-primary"
            onClick={() => onSave(price, billingType, quotaLimit)}
            disabled={busy || (isQuota && !quotaLimit)}
          >
            {busy ? t('admin_services.saving') : t('admin_services.save_price')}
          </button>
          <button className={styles.cancel} onClick={onClose}>{t('common.cancel')}</button>
        </div>
      </div>
    </div>
  );
}
