'use client';
import { useState, useEffect, useCallback } from 'react';
import {
  getAllProducts, publishProduct, unpublishProduct, setPricing, setApprovalType, hasPermission,
  getAdminProxies, createTieredProduct, getProductTiers, updateProductMetadata, addTier, removeTier, renameTier, setDefaultTier,
  replicateProduct, otherEnvironment,
} from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import styles from '../admin.module.css';

const PAGE_SIZE = 20;

// Display label for an environment code ('prod'/'test') — the code itself still goes to the API as-is,
// this is purely for what the admin sees in checkboxes/toasts.
function envLabel(t, env) {
  return t(env === 'prod' ? 'admin_services.env_prod' : 'admin_services.env_test');
}

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
  const [editModal, setEditModal] = useState(null);
  const [tiersModal, setTiersModal] = useState(null);

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
    if (data.syncToOtherEnv) {
      const other = otherEnvironment();
      try {
        await replicateProduct(data.name, other);
        notify(t('admin_services.create_success_synced', { name: data.displayName || data.name, env: envLabel(t, other) }));
      } catch {
        notify(t('admin_services.create_success_sync_failed', { name: data.displayName || data.name }), false);
      }
    } else {
      notify(t('admin_services.create_success', { name: data.displayName || data.name }));
    }
    loadServices();
  }

  async function handleSync(svc) {
    setBusy(svc.name);
    try {
      const other = otherEnvironment();
      await replicateProduct(svc.name, other);
      notify(t('admin_services.sync_success', { name: svc.displayName || svc.name, env: envLabel(t, other) }));
    } catch (err) {
      notify(err.message || t('admin_services.sync_failed'), false);
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
                    )}{' '}
                    <button className={styles.priceBtn} onClick={() => setEditModal(s)} disabled={busy === s.name}>
                      {t('admin_services.edit_btn')}
                    </button>{' '}
                    <button className={styles.priceBtn} onClick={() => setTiersModal(s)} disabled={busy === s.name}>
                      {t('admin_services.tiers_btn', { count: s.tierCount || 1 })}
                    </button>{' '}
                    <button className={styles.priceBtn} onClick={() => handleSync(s)} disabled={busy === s.name}>
                      {busy === s.name ? '…' : t('admin_services.sync_btn')}
                    </button>
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

      {editModal && (
        <EditServiceModal
          service={editModal}
          onClose={() => setEditModal(null)}
          onSave={async (data) => {
            await updateProductMetadata(editModal.name, data);
            notify(t('admin_services.edit_success', { name: editModal.displayName || editModal.name }));
            loadServices();
            setEditModal(null);
          }}
        />
      )}

      {tiersModal && (
        <TiersModal
          service={tiersModal}
          onClose={() => setTiersModal(null)}
          onChanged={loadServices}
          notify={notify}
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

// Small, single-purpose modal for editing a service's metadata (display name/description/environments/proxies).
// Prefills from GET .../tiers since AdminProductView (the table row shape) doesn't carry these fields.
function EditServiceModal({ service, onClose, onSave }) {
  const { t } = useI18n();
  const [displayName, setDisplayName] = useState(service.displayName || '');
  const [description, setDescription] = useState('');
  const [environments, setEnvironments] = useState('');
  const [proxies, setProxies] = useState([]);
  const [proxiesLoading, setProxiesLoading] = useState(true);
  const [selectedProxies, setSelectedProxies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getAdminProxies().then(setProxies).catch(() => setProxies([])).finally(() => setProxiesLoading(false));
    getProductTiers(service.name)
      .then((v) => {
        setDescription(v.description || '');
        setEnvironments((v.environments || []).join(', '));
        setSelectedProxies(v.apiProxies || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [service.name]);

  async function handleSave() {
    setBusy(true);
    setError('');
    try {
      await onSave({
        displayName: displayName.trim() || null,
        description: description.trim() || null,
        environments: environments.split(',').map((s) => s.trim()).filter(Boolean),
        apiProxies: selectedProxies,
      });
    } catch (e) {
      setError(e.message || t('admin_services.edit_failed'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={`${styles.modal} ${styles.modalWide}`} onClick={(e) => e.stopPropagation()}>
        <h2>{t('admin_services.edit_modal_title', { name: service.displayName || service.name })}</h2>
        {error && <p className={styles.error}>{error}</p>}

        <label className={styles.label}>
          {t('admin_services.display_name_label')}
          <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
        </label>
        <label className={styles.label}>
          {t('admin_services.description_label')}
          <input value={description} onChange={(e) => setDescription(e.target.value)} disabled={loading} />
        </label>
        <label className={styles.label}>
          {t('admin_services.environments_label')}
          <input value={environments} onChange={(e) => setEnvironments(e.target.value)} placeholder="test, prod" disabled={loading} />
        </label>
        <p className={styles.modalNote}>{t('admin_services.environments_note')}</p>

        <label className={styles.label}>
          {t('admin_services.proxies_label')}
          <select
            multiple
            size={6}
            value={selectedProxies}
            onChange={(e) => setSelectedProxies(Array.from(e.target.selectedOptions, (o) => o.value))}
            disabled={loading}
          >
            {proxies.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </label>
        <p className={styles.modalNote}>
          {proxiesLoading
            ? t('admin_services.proxies_loading')
            : (!proxies.length ? t('admin_services.proxies_empty') : t('admin_services.proxies_note'))}
        </p>

        <div className={styles.modalActions}>
          <button className="btn btn-primary" onClick={handleSave} disabled={busy || loading}>
            {busy ? t('admin_services.saving') : t('admin_services.edit_save')}
          </button>
          <button className={styles.cancel} onClick={onClose}>{t('common.cancel')}</button>
        </div>
      </div>
    </div>
  );
}

// Manages a service's tiers: rename/remove/set-default act immediately (no batched diff/save), mirroring
// how publish/approval toggles already work on this page. Adding a tier to an ungrouped (1-tier) service
// retroactively converts it into a group — the "original tier" fields only show up in that case.
function TiersModal({ service, onClose, onChanged, notify }) {
  const { t } = useI18n();
  const [tiers, setTiers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(null); // slug of the tier currently being acted on
  const [editingSlug, setEditingSlug] = useState(null);
  const [editLabel, setEditLabel] = useState('');

  const [newTier, setNewTier] = useState(newTierRow(false));
  const [originalTierSlug, setOriginalTierSlug] = useState('');
  const [originalTierLabel, setOriginalTierLabel] = useState('');
  const [syncNewTier, setSyncNewTier] = useState(false);
  const [addBusy, setAddBusy] = useState(false);
  const [addError, setAddError] = useState('');
  const [confirmingSlug, setConfirmingSlug] = useState(null);

  const reload = useCallback(() => {
    setLoading(true);
    return getProductTiers(service.name)
      .then((v) => setTiers(v.tiers || []))
      .catch((e) => setError(e.message || t('access.action_failed')))
      .finally(() => setLoading(false));
  }, [service.name, t]);

  useEffect(() => { reload(); }, [reload]);

  async function handleRemove(slug) {
    setConfirmingSlug(null);
    setBusy(slug);
    setError('');
    try {
      await removeTier(service.name, slug);
      notify(t('admin_services.tier_remove_success'));
      await reload();
      onChanged();
    } catch (e) {
      setError(e.message || t('admin_services.tier_remove_failed'));
    } finally {
      setBusy(null);
    }
  }

  async function handleSetDefault(slug) {
    setBusy(slug);
    setError('');
    try {
      await setDefaultTier(service.name, slug);
      notify(t('admin_services.tier_set_default_success'));
      await reload();
      onChanged();
    } catch (e) {
      setError(e.message || t('admin_services.tier_set_default_failed'));
    } finally {
      setBusy(null);
    }
  }

  async function handleRenameSave(slug) {
    setBusy(slug);
    setError('');
    try {
      await renameTier(service.name, slug, editLabel.trim());
      notify(t('admin_services.tier_rename_success'));
      setEditingSlug(null);
      await reload();
      onChanged();
    } catch (e) {
      setError(e.message || t('admin_services.tier_rename_failed'));
    } finally {
      setBusy(null);
    }
  }

  async function handleAddTier() {
    const label = newTier.label.trim();
    const slug = newTier.slug.trim().toLowerCase();
    if (!label || !slug) { setAddError(t('admin_services.create_error_tier_incomplete', { n: 1 })); return; }
    if (!ASCII_ID_PATTERN.test(slug)) { setAddError(t('admin_services.create_error_slug_ascii', { n: 1 })); return; }
    if (newTier.price === '' || Number(newTier.price) < 0) { setAddError(t('admin_services.create_error_price', { n: 1 })); return; }
    if (newTier.billingType === 'quota' && !(Number(newTier.quotaLimit) > 0)) { setAddError(t('admin_services.create_error_quota', { n: 1 })); return; }

    setAddBusy(true);
    setAddError('');
    try {
      const payload = {
        slug,
        label,
        price: Number(newTier.price) || 0,
        billingType: newTier.billingType,
        quotaLimit: newTier.billingType === 'quota' ? Number(newTier.quotaLimit) : null,
        isDefault: newTier.isDefault,
      };
      if (tiers.length === 1) {
        if (originalTierSlug.trim()) payload.originalTierSlug = originalTierSlug.trim();
        if (originalTierLabel.trim()) payload.originalTierLabel = originalTierLabel.trim();
      }
      await addTier(service.name, payload);
      if (syncNewTier) {
        const other = otherEnvironment();
        try {
          await replicateProduct(service.name, other);
          notify(t('admin_services.tier_add_success_synced', { env: envLabel(t, other) }));
        } catch {
          notify(t('admin_services.tier_add_success_sync_failed'), false);
        }
      } else {
        notify(t('admin_services.tier_add_success'));
      }
      setNewTier(newTierRow(false));
      setOriginalTierSlug('');
      setOriginalTierLabel('');
      setSyncNewTier(false);
      await reload();
      onChanged();
    } catch (e) {
      setAddError(e.message || t('admin_services.tier_add_failed'));
    } finally {
      setAddBusy(false);
    }
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={`${styles.modal} ${styles.modalWide}`} onClick={(e) => e.stopPropagation()}>
        <h2>{t('admin_services.tiers_modal_title', { name: service.displayName || service.name })}</h2>
        {error && <p className={styles.error}>{error}</p>}

        {loading ? (
          <p className={styles.muted}>…</p>
        ) : (
          tiers.map((tier) => (
            <div key={tier.slug} className={styles.tierRow}>
              <div className={styles.tierRowHead}>
                {editingSlug === tier.slug ? (
                  <input value={editLabel} onChange={(e) => setEditLabel(e.target.value)} style={{ flex: 1 }} />
                ) : (
                  <strong>{tier.label}</strong>
                )}
                {tier.isDefault
                  ? <span className={styles.badgeOk}>{t('admin_services.tier_default_label')}</span>
                  : (
                    <button type="button" className={styles.priceBtn} onClick={() => handleSetDefault(tier.slug)} disabled={busy === tier.slug}>
                      {t('admin_services.tier_set_default')}
                    </button>
                  )}
                {editingSlug === tier.slug ? (
                  <>
                    <button type="button" className={styles.priceBtn} onClick={() => handleRenameSave(tier.slug)} disabled={busy === tier.slug}>
                      {t('admin_services.tier_rename_save')}
                    </button>
                    <button type="button" className={styles.cancel} onClick={() => setEditingSlug(null)}>{t('common.cancel')}</button>
                  </>
                ) : (
                  <button type="button" className={styles.priceBtn} onClick={() => { setEditingSlug(tier.slug); setEditLabel(tier.label); }}>
                    {t('admin_services.tier_rename_btn')}
                  </button>
                )}
                {tiers.length > 1 && confirmingSlug !== tier.slug && (
                  <button type="button" className={styles.rejectBtn} onClick={() => setConfirmingSlug(tier.slug)} disabled={busy === tier.slug}>
                    {t('admin_services.remove_tier')}
                  </button>
                )}
              </div>
              <p className={styles.muted}>
                {tier.price} {t('service.currency')} · {tier.billingType}
                {tier.quotaDescription ? ` · ${tier.quotaDescription}` : ''}
              </p>
              {confirmingSlug === tier.slug && (
                <div className={styles.tierRowHead}>
                  <p className={styles.fieldMissingNote} style={{ margin: 0, flex: 1 }}>{t('admin_services.tier_remove_confirm_note')}</p>
                  <button type="button" className={styles.rejectBtn} onClick={() => handleRemove(tier.slug)} disabled={busy === tier.slug}>
                    {busy === tier.slug ? t('admin_services.saving') : t('admin_services.remove_tier')}
                  </button>
                  <button type="button" className={styles.cancel} onClick={() => setConfirmingSlug(null)}>{t('common.cancel')}</button>
                </div>
              )}
            </div>
          ))
        )}

        <h3>{t('admin_services.add_tier')}</h3>
        {addError && <p className={styles.error}>{addError}</p>}
        {tiers.length === 1 && (
          <>
            <p className={styles.modalNote}>{t('admin_services.retroactive_group_note')}</p>
            <div className={styles.formRow}>
              <label className={styles.label}>
                {t('admin_services.original_tier_slug_label')}
                <input value={originalTierSlug} onChange={(e) => setOriginalTierSlug(sanitizeAsciiId(e.target.value))} placeholder="default" />
              </label>
              <label className={styles.label}>
                {t('admin_services.original_tier_label_label')}
                <input value={originalTierLabel} onChange={(e) => setOriginalTierLabel(e.target.value)} />
              </label>
            </div>
          </>
        )}
        <div className={styles.formRow}>
          <label className={styles.label}>
            {t('admin_services.tier_label_label')}
            <input
              value={newTier.label}
              onChange={(e) => {
                const label = e.target.value;
                setNewTier((prev) => ({ ...prev, label, slug: prev.slugEdited ? prev.slug : slugify(label) }));
              }}
            />
          </label>
          <label className={styles.label}>
            {t('admin_services.tier_slug_label')}
            <input
              value={newTier.slug}
              onChange={(e) => setNewTier((prev) => ({ ...prev, slug: sanitizeAsciiId(e.target.value), slugEdited: true }))}
              placeholder={t('admin_services.tier_slug_placeholder')}
            />
          </label>
        </div>
        <div className={styles.formRow}>
          <label className={styles.label}>
            {t('admin_services.billing_type_label')}
            <select value={newTier.billingType} onChange={(e) => setNewTier((prev) => ({ ...prev, billingType: e.target.value }))}>
              <option value="one-time">{t('orders.billing_one_time')}</option>
              <option value="subscription">{t('admin_services.billing_subscription_recurring')}</option>
              <option value="quota">{t('admin_services.billing_quota')}</option>
            </select>
          </label>
          <label className={styles.label}>
            {newTier.billingType === 'quota' ? t('admin_services.price_label_quota') : t('admin_services.price_label')}
            <input type="number" min="0" value={newTier.price} onChange={(e) => setNewTier((prev) => ({ ...prev, price: e.target.value }))} />
          </label>
        </div>
        {newTier.billingType === 'quota' && (
          <label className={styles.label}>
            {t('admin_services.quota_limit_label')}
            <input type="number" min="1" value={newTier.quotaLimit} onChange={(e) => setNewTier((prev) => ({ ...prev, quotaLimit: e.target.value }))} />
          </label>
        )}
        <label className={styles.label}>
          <input
            type="checkbox"
            checked={newTier.isDefault}
            onChange={(e) => setNewTier((prev) => ({ ...prev, isDefault: e.target.checked }))}
            style={{ width: 'auto', display: 'inline-block', marginInlineEnd: 6 }}
          />
          {t('admin_services.tier_default_label')}
        </label>
        <label className={styles.label}>
          <input
            type="checkbox"
            checked={syncNewTier}
            onChange={(e) => setSyncNewTier(e.target.checked)}
            style={{ width: 'auto', display: 'inline-block', marginInlineEnd: 6 }}
          />
          {t('admin_services.also_add_tier_other_env', { env: envLabel(t, otherEnvironment()) })}
        </label>

        <div className={styles.modalActions}>
          <button className="btn btn-primary" onClick={handleAddTier} disabled={addBusy}>
            {addBusy ? t('admin_services.saving') : t('admin_services.add_tier')}
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

// Apigee rejects product names containing anything outside this set — strip disallowed characters live as the
// admin types, so a non-ASCII name/slug (e.g. typed directly instead of via the auto-suggestion) can never reach the API
const ASCII_ID_PATTERN = /^[a-zA-Z0-9_-]+$/;
function sanitizeAsciiId(value) {
  return value.replace(/[^a-zA-Z0-9_-]/g, '');
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
  const [syncToOtherEnv, setSyncToOtherEnv] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false); // true after the first submit attempt — drives the per-field "missing" highlighting below

  const nameMissing = submitted && !name.trim();

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
    if (!ASCII_ID_PATTERN.test(name.trim()))
      return t('admin_services.create_error_name_ascii');
    const slugs = new Set();
    for (let i = 0; i < tiers.length; i++) {
      const tier = tiers[i];
      if (!tier.label.trim() || !tier.slug.trim())
        return t('admin_services.create_error_tier_incomplete', { n: i + 1 });
      if (!ASCII_ID_PATTERN.test(tier.slug.trim()))
        return t('admin_services.create_error_slug_ascii', { n: i + 1 });
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
      syncToOtherEnv, // consumed by the page-level handler, not sent to the backend create endpoint
    };
  }

  async function handleSubmit() {
    setSubmitted(true);
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

        <label className={`${styles.label} ${nameMissing ? styles.fieldMissing : ''}`}>
          {t('admin_services.name_label')}<span className={styles.requiredMark}>*</span>
          <input value={name} onChange={(e) => setName(sanitizeAsciiId(e.target.value))} placeholder={t('admin_services.name_placeholder')} />
        </label>
        {nameMissing && <p className={styles.fieldMissingNote}>{t('admin_services.field_required')}</p>}
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
            {(() => {
              const labelMissing = submitted && !tier.label.trim();
              const slugMissing = submitted && !tier.slug.trim();
              const priceMissing = submitted && tier.price === '';
              const quotaMissing = submitted && tier.billingType === 'quota' && !(Number(tier.quotaLimit) > 0);
              return (
                <>
                  <div className={styles.formRow}>
                    <label className={`${styles.label} ${labelMissing ? styles.fieldMissing : ''}`}>
                      {t('admin_services.tier_label_label')}<span className={styles.requiredMark}>*</span>
                      <input value={tier.label} onChange={(e) => updateTierLabel(i, e.target.value)} />
                    </label>
                    <label className={`${styles.label} ${slugMissing ? styles.fieldMissing : ''}`}>
                      {t('admin_services.tier_slug_label')}<span className={styles.requiredMark}>*</span>
                      <input
                        value={tier.slug}
                        onChange={(e) => updateTier(i, { slug: sanitizeAsciiId(e.target.value), slugEdited: true })}
                        placeholder={t('admin_services.tier_slug_placeholder')}
                      />
                    </label>
                  </div>
                  {(labelMissing || slugMissing) && <p className={styles.fieldMissingNote}>{t('admin_services.field_required')}</p>}
                  <div className={styles.formRow}>
                    <label className={styles.label}>
                      {t('admin_services.billing_type_label')}
                      <select value={tier.billingType} onChange={(e) => updateTier(i, { billingType: e.target.value })}>
                        <option value="one-time">{t('orders.billing_one_time')}</option>
                        <option value="subscription">{t('admin_services.billing_subscription_recurring')}</option>
                        <option value="quota">{t('admin_services.billing_quota')}</option>
                      </select>
                    </label>
                    <label className={`${styles.label} ${priceMissing ? styles.fieldMissing : ''}`}>
                      {tier.billingType === 'quota' ? t('admin_services.price_label_quota') : t('admin_services.price_label')}<span className={styles.requiredMark}>*</span>
                      <input
                        type="number"
                        min="0"
                        value={tier.price}
                        onChange={(e) => updateTier(i, { price: e.target.value })}
                        placeholder={t('admin_services.price_placeholder')}
                      />
                    </label>
                  </div>
                  {priceMissing && <p className={styles.fieldMissingNote}>{t('admin_services.field_required')}</p>}
                  {tier.billingType === 'quota' && (
                    <>
                      <label className={`${styles.label} ${quotaMissing ? styles.fieldMissing : ''}`}>
                        {t('admin_services.quota_limit_label')}<span className={styles.requiredMark}>*</span>
                        <input
                          type="number"
                          min="1"
                          value={tier.quotaLimit}
                          onChange={(e) => updateTier(i, { quotaLimit: e.target.value })}
                          placeholder={t('admin_services.quota_limit_placeholder')}
                        />
                      </label>
                      {quotaMissing && <p className={styles.fieldMissingNote}>{t('admin_services.field_required')}</p>}
                    </>
                  )}
                </>
              );
            })()}
          </div>
        ))}
        <button type="button" className={styles.btnGhost} onClick={addTier}>
          {t('admin_services.add_tier')}
        </button>

        <label className={styles.label}>
          <input
            type="checkbox"
            checked={syncToOtherEnv}
            onChange={(e) => setSyncToOtherEnv(e.target.checked)}
            style={{ width: 'auto', display: 'inline-block', marginInlineEnd: 6 }}
          />
          {t('admin_services.also_create_other_env', { env: envLabel(t, otherEnvironment()) })}
        </label>

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
