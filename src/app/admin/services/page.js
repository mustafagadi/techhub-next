'use client';
import { useState, useEffect, useCallback } from 'react';
import { getAllProducts, publishProduct, unpublishProduct, setPricing, setApprovalType, hasPermission, getAdminProxies, createTieredProduct } from '@/lib/api';
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
  const [createModalOpen, setCreateModalOpen] = useState(false);

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

  async function handleCreateService(data) {
    await createTieredProduct(data);
    notify(t('admin_services.create_success', { name: data.displayName || data.name }));
    loadServices();
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
            <div className={styles.cardHeadActions}>
              <button className={styles.btnGhost} onClick={() => setCreateModalOpen(true)}>
                {t('admin_services.create_btn')}
              </button>
              <input
                className={styles.searchBox}
                placeholder={t('admin_services.search_placeholder')}
                value={svcSearch}
                onChange={(e) => { setSvcSearch(e.target.value); setSvcPage(1); }}
              />
            </div>
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

      {createModalOpen && (
        <CreateServiceModal
          onClose={() => setCreateModalOpen(false)}
          onCreate={handleCreateService}
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

// Converts an Arabic/free-form label into a safe ASCII identifier (used in the Apigee product name: {name}-{slug})
function slugify(label) {
  return label
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

function newTierRow(isDefault) {
  return { slug: '', label: '', price: '', billingType: 'subscription', quotaLimit: '', isDefault, slugEdited: false };
}

// "Create service" form — with one or more tiers. A single tier fully covers the simple case,
// since the backend design treats "every service = one or more tiers" even for old, non-tiered services.
function CreateServiceModal({ onClose, onCreate }) {
  const { t } = useI18n();
  const [name, setName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [description, setDescription] = useState('');
  const [approvalType, setApprovalTypeField] = useState('manual');
  const [environments, setEnvironments] = useState('');
  const [proxies, setProxies] = useState([]);
  const [proxiesLoading, setProxiesLoading] = useState(true);
  const [selectedProxies, setSelectedProxies] = useState([]);
  const [tiers, setTiers] = useState([newTierRow(true)]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getAdminProxies().then(setProxies).catch(() => setProxies([])).finally(() => setProxiesLoading(false));
  }, []);

  function updateTier(i, patch) {
    setTiers((prev) => prev.map((tr, idx) => (idx === i ? { ...tr, ...patch } : tr)));
  }
  function updateTierLabel(i, label) {
    setTiers((prev) => prev.map((tr, idx) => {
      if (idx !== i) return tr;
      const nextSlug = tr.slugEdited ? tr.slug : slugify(label);
      return { ...tr, label, slug: nextSlug };
    }));
  }
  function addTier() {
    setTiers((prev) => [...prev, newTierRow(prev.length === 0)]);
  }
  function removeTier(i) {
    setTiers((prev) => {
      const next = prev.filter((_, idx) => idx !== i);
      if (next.length && !next.some((tr) => tr.isDefault)) next[0] = { ...next[0], isDefault: true };
      return next;
    });
  }
  function setDefaultTier(i) {
    setTiers((prev) => prev.map((tr, idx) => ({ ...tr, isDefault: idx === i })));
  }

  function validate() {
    if (!name.trim()) return t('admin_services.create_error_name_required');
    const slugs = new Set();
    for (let i = 0; i < tiers.length; i++) {
      const tier = tiers[i];
      if (!tier.label.trim() || !tier.slug.trim())
        return t('admin_services.create_error_tier_incomplete', { n: i + 1 });
      const slug = tier.slug.trim().toLowerCase();
      if (slugs.has(slug)) return t('admin_services.create_error_duplicate_slug', { slug });
      slugs.add(slug);
      if (tier.price === '' || Number(tier.price) < 0)
        return t('admin_services.create_error_price', { n: i + 1 });
      if (tier.billingType === 'quota' && !(Number(tier.quotaLimit) > 0))
        return t('admin_services.create_error_quota', { n: i + 1 });
    }
    return null;
  }

  function buildPayload() {
    return {
      name: name.trim(),
      displayName: displayName.trim() || null,
      description: description.trim() || null,
      approvalType,
      environments: environments.split(',').map((s) => s.trim()).filter(Boolean),
      apiProxies: selectedProxies,
      tiers: tiers.map((tr, i) => ({
        slug: tr.slug.trim().toLowerCase(),
        label: tr.label.trim(),
        price: Number(tr.price) || 0,
        billingType: tr.billingType,
        quotaLimit: tr.billingType === 'quota' ? Number(tr.quotaLimit) : null,
        isDefault: tr.isDefault,
        sortOrder: i,
      })),
    };
  }

  async function handleSubmit() {
    const err = validate();
    if (err) { setError(err); return; }
    setBusy(true);
    setError('');
    try {
      await onCreate(buildPayload());
      onClose();
    } catch (e) {
      setError(e.message || t('admin_services.create_failed'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={`${styles.modal} ${styles.modalWide}`} onClick={(e) => e.stopPropagation()}>
        <h2>{t('admin_services.create_modal_title')}</h2>
        {error && <p className={styles.error}>{error}</p>}

        <label className={styles.label}>
          {t('admin_services.name_label')}
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('admin_services.name_placeholder')} />
        </label>
        <div className={styles.formRow}>
          <label className={styles.label}>
            {t('admin_services.display_name_label')}
            <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          </label>
          <label className={styles.label}>
            {t('admin_services.approval_type_label')}
            <select value={approvalType} onChange={(e) => setApprovalTypeField(e.target.value)}>
              <option value="manual">{t('admin_services.approval_option_manual')}</option>
              <option value="auto">{t('admin_services.approval_option_auto')}</option>
            </select>
          </label>
        </div>
        <label className={styles.label}>
          {t('admin_services.description_label')}
          <input value={description} onChange={(e) => setDescription(e.target.value)} />
        </label>

        <label className={styles.label}>
          {t('admin_services.environments_label')}
          <input value={environments} onChange={(e) => setEnvironments(e.target.value)} placeholder="test, prod" />
        </label>
        <p className={styles.modalNote}>{t('admin_services.environments_note')}</p>

        <label className={styles.label}>
          {t('admin_services.proxies_label')}
          <select
            multiple
            size={6}
            value={selectedProxies}
            onChange={(e) => setSelectedProxies(Array.from(e.target.selectedOptions, (o) => o.value))}
          >
            {proxies.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </label>
        <p className={styles.modalNote}>
          {proxiesLoading
            ? t('admin_services.proxies_loading')
            : (!proxies.length ? t('admin_services.proxies_empty') : t('admin_services.proxies_note'))}
        </p>

        <h3>{t('admin_services.tiers_section_title')}</h3>
        {tiers.map((tier, i) => (
          <div key={i} className={styles.tierRow}>
            <div className={styles.tierRowHead}>
              <strong>{t('admin_services.tier_n', { n: i + 1 })}</strong>
              <label>
                <input type="radio" name="defaultTier" checked={tier.isDefault} onChange={() => setDefaultTier(i)} />
                {' '}{t('admin_services.tier_default_label')}
              </label>
              {tiers.length > 1 && (
                <button type="button" className={styles.rejectBtn} onClick={() => removeTier(i)}>
                  {t('admin_services.remove_tier')}
                </button>
              )}
            </div>
            <div className={styles.formRow}>
              <label className={styles.label}>
                {t('admin_services.tier_label_label')}
                <input value={tier.label} onChange={(e) => updateTierLabel(i, e.target.value)} />
              </label>
              <label className={styles.label}>
                {t('admin_services.tier_slug_label')}
                <input
                  value={tier.slug}
                  onChange={(e) => updateTier(i, { slug: e.target.value, slugEdited: true })}
                  placeholder={t('admin_services.tier_slug_placeholder')}
                />
              </label>
            </div>
            <div className={styles.formRow}>
              <label className={styles.label}>
                {t('admin_services.billing_type_label')}
                <select value={tier.billingType} onChange={(e) => updateTier(i, { billingType: e.target.value })}>
                  <option value="one-time">{t('orders.billing_one_time')}</option>
                  <option value="subscription">{t('admin_services.billing_subscription_recurring')}</option>
                  <option value="quota">{t('admin_services.billing_quota')}</option>
                </select>
              </label>
              <label className={styles.label}>
                {tier.billingType === 'quota' ? t('admin_services.price_label_quota') : t('admin_services.price_label')}
                <input
                  type="number"
                  min="0"
                  value={tier.price}
                  onChange={(e) => updateTier(i, { price: e.target.value })}
                  placeholder={t('admin_services.price_placeholder')}
                />
              </label>
            </div>
            {tier.billingType === 'quota' && (
              <label className={styles.label}>
                {t('admin_services.quota_limit_label')}
                <input
                  type="number"
                  min="1"
                  value={tier.quotaLimit}
                  onChange={(e) => updateTier(i, { quotaLimit: e.target.value })}
                  placeholder={t('admin_services.quota_limit_placeholder')}
                />
              </label>
            )}
          </div>
        ))}
        <button type="button" className={styles.btnGhost} onClick={addTier}>
          {t('admin_services.add_tier')}
        </button>

        <div className={styles.modalActions}>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={busy}>
            {busy ? t('admin_services.saving') : t('admin_services.create_submit')}
          </button>
          <button className={styles.cancel} onClick={onClose}>{t('common.cancel')}</button>
        </div>
      </div>
    </div>
  );
}
