'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { getProduct, getProxyOperations, getProductSpec, getAuth, submitInterest, docFileExists, docFileUrl, getMyApps } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import styles from './detail.module.css';

// يحلّ مرجع $ref إلى الكائن الفعلي داخل components.schemas
function resolveRef(spec, ref) {
  if (!ref || !ref.startsWith('#/')) return null;
  const parts = ref.slice(2).split('/');
  let node = spec;
  for (const p of parts) {
    node = node?.[p];
    if (!node) return null;
  }
  return node;
}

// يستخرج العمليات من مواصفة OpenAPI (paths) مع schema الـ body إن وُجدت
function operationsFromSpec(spec) {
  if (!spec || !spec.paths) return [];
  const ops = [];
  for (const [path, methods] of Object.entries(spec.paths)) {
    for (const [method, def] of Object.entries(methods)) {
      // schema جسم الطلب (لعمليات POST عادةً)
      let schema = null;
      const ref = def.requestBody?.content?.['application/json']?.schema?.$ref;
      if (ref) schema = resolveRef(spec, ref);
      else schema = def.requestBody?.content?.['application/json']?.schema || null;

      ops.push({
        method: method.toUpperCase(),
        path,
        name: def.summary || def.operationId || '',
        params: def.parameters || [],
        schema,
      });
    }
  }
  return ops;
}

// يحوّل schema لعرض شجري مقروء (اسم: نوع، مع تداخل)
function SchemaTree({ schema, depth = 0 }) {
  if (!schema) return null;
  if (schema.type === 'object' && schema.properties) {
    return (
      <div style={{ paddingInlineStart: depth ? 16 : 0 }}>
        {Object.entries(schema.properties).map(([key, val]) => (
          <div key={key} style={{ padding: '3px 0' }}>
            <span style={{ color: '#C9A227', fontWeight: 600 }}>{key}</span>
            <span style={{ color: '#6FB3E0' }}>: {val.type || 'object'}</span>
            {val.type === 'object' && <SchemaTree schema={val} depth={depth + 1} />}
            {val.type === 'array' && val.items && (
              <div style={{ paddingInlineStart: 16 }}>
                <span style={{ color: '#888' }}>[ ]</span>
                <SchemaTree schema={val.items} depth={depth + 1} />
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }
  return <span style={{ color: '#6FB3E0' }}>{schema.type}</span>;
}

export default function ServiceDetail() {
  const { t, locale } = useI18n();
  const params = useParams();
  const name = decodeURIComponent(params.name);
  const [product, setProduct] = useState(null);
  const [ops, setOps] = useState([]);
  const [expanded, setExpanded] = useState(null);
  const [tab, setTab] = useState('desc');
  const [loading, setLoading] = useState(true);
  const [isAuthed, setIsAuthed] = useState(false);
  const [showInterest, setShowInterest] = useState(false);
  const [interestSent, setInterestSent] = useState(false);
  const [hasDocFile, setHasDocFile] = useState(false);
  const [subscribedApp, setSubscribedApp] = useState(null); // التطبيق المشترك بهذه الخدمة فعلًا، إن وُجد
  const [subscribedTierApps, setSubscribedTierApps] = useState({}); // خريطة: اسم منتج Apigee (مستوى) → التطبيق المشترك به
  const [interestTarget, setInterestTarget] = useState(null); // اسم منتج Apigee (خدمة بسيطة أو مستوى محدّد) لنافذة إبداء الاهتمام

  useEffect(() => { setIsAuthed(!!getAuth()?.token); }, []);
  useEffect(() => {
    docFileExists(name).then((r) => setHasDocFile(!!r?.exists)).catch(() => setHasDocFile(false));
  }, [name]);

  // هل الشريك مشترك بالفعل في هذه الخدمة (أو أحد مستوياتها)؟ نتحقق من قائمة تطبيقاته الحالية
  useEffect(() => {
    if (!getAuth()?.token || getAuth()?.role !== 'portal-partner') return;
    const productsOf = (app) => app.credentials?.[0]?.products || app.credentials?.[0]?.apiProducts || app.apiProducts || [];
    const nameOf = (p) => (typeof p === 'string' ? p : (p.productName || p.apiproduct));
    getMyApps().then((apps) => {
      const list = Array.isArray(apps) ? apps : [];

      const match = list.find((app) => productsOf(app).some((p) => nameOf(p) === name));
      setSubscribedApp(match || null);

      // خريطة كل منتجات Apigee المشترك بها فعليًّا → التطبيق الذي يحملها (لبطاقات المستويات)
      const tierMap = {};
      for (const app of list) {
        for (const p of productsOf(app)) {
          const n = nameOf(p);
          if (n && !(n in tierMap)) tierMap[n] = app;
        }
      }
      setSubscribedTierApps(tierMap);
    }).catch(() => { setSubscribedApp(null); setSubscribedTierApps({}); });
  }, [name]);

  useEffect(() => {
    async function load() {
      const p = await getProduct(name).catch(() => null);
      setProduct(p);

      // [النهج ب] name هو اسم proxy — نجلب عملياته مباشرة من حزمته
      let operations = [];
      const proxyOps = await getProxyOperations(name).catch(() => null);
      if (Array.isArray(proxyOps) && proxyOps.length) {
        // الاستجابة: [{ serviceName, operations: [...] }]
        operations = proxyOps.flatMap((s) => s.operations || s.Operations || []);
      }

      // احتياطيًا: المواصفة المخزّنة إن وُجدت (للخدمات التي رُفع لها Postman)
      if (!operations.length) {
        const spec = await getProductSpec(name).catch(() => null);
        if (spec) operations = operationsFromSpec(spec);
      }

      setOps(operations);
      setLoading(false);
    }
    load();
  }, [name]);

  const title = product?.displayName || product?.name || name;
  const price = product?.price;
  // خدمة مجمّعة بعدّة مستويات تسعير حقيقية (كل مستوى منتج Apigee مستقل) — أكثر من مستوى واحد فقط
  const sortedTiers = product?.tiers?.length > 1 ? [...product.tiers].sort((a, b) => a.sortOrder - b.sortOrder) : null;

  return (
    <>
      <Header />
      <div className={styles.heroWrap}>
        <div className="container">
          <div className={styles.hero}>
            <div className={styles.crumb}>{t('nav.home')} ‹ {t('nav.services')} ‹ {title}</div>
            <h1>{title}</h1>
            <p>{product?.description || t('service.default_desc')}</p>
          </div>
        </div>
      </div>

      <div className="container">
        <div className={styles.layout}>
          <div>
            <div className={styles.panel}>
              <div className={styles.panelHead}><span>{t('service.proxies_title')}</span><span className={styles.muted}>{t('service.proxies_by_proxy')}</span></div>
              <div style={{ padding: '16px' }}>
                {loading && <div className={styles.empty}>{t('service.loading')}</div>}
                {!loading && !(product?.apiProxies?.length) && <div className={styles.empty}>{t('service.proxies_empty')}</div>}
                {product?.apiProxies?.length > 0 && (
                  <>
                    <p className={styles.proxiesHint}>
                      {t('service.proxies_hint')}
                    </p>
                    <ul className={styles.proxiesList}>
                      {product.apiProxies.map((proxy, i) => (
                        <ProxyRow key={i} proxyName={proxy} />
                      ))}
                    </ul>
                  </>
                )}
              </div>
            </div>

            <div className={styles.panel}>
              <div className={styles.tabs}>
                {[
                  ['desc', t('service.tab_description')],
                  ['auth', t('service.tab_auth')],
                  ...(sortedTiers ? [['pricing', t('service.tab_pricing')]] : []),
                ].map(([k,l]) => (
                  <button key={k} className={`${styles.tab} ${tab===k ? styles.activeTab : ''}`} onClick={() => setTab(k)}>{l}</button>
                ))}
                {isAuthed && (
                  <a href={`/services/${encodeURIComponent(name)}/docs`} className={styles.tab} style={{ marginInlineStart: 'auto' }}>
                    {t('service.full_docs')}
                  </a>
                )}
              </div>
              <div className={styles.tabBody}>
                {tab === 'desc' && (
                  <>
                    <p>{product?.description || t('service.desc_fallback')}</p>
                    {hasDocFile ? (
                      <a
                        href={docFileUrl(name)}
                        className="btn btn-primary"
                        style={{ marginTop: 12, display: 'inline-block' }}
                        download
                      >
                        {t('service.doc_download')}
                      </a>
                    ) : (
                      <p style={{ color: '#5A6B82', fontSize: '0.9rem', marginTop: 12 }}>
                        {t('service.doc_none')}
                      </p>
                    )}
                  </>
                )}
                {tab === 'auth' && (
                  <>
                    <p>{t('service.auth_body')}</p>
                    <pre className={styles.code}>Authorization: Bearer {'{access_token}'}</pre>
                  </>
                )}
                {tab === 'pricing' && sortedTiers && (
                  <div className={styles.tierGrid}>
                    {sortedTiers.map((tier) => (
                      <TierCard
                        key={tier.apigeeProductName}
                        tier={tier}
                        locale={locale}
                        isAuthed={isAuthed}
                        subscribedApp={subscribedTierApps[tier.apigeeProductName]}
                        onInterest={() => setInterestTarget(tier.apigeeProductName)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <aside className={styles.side}>
            <div className={styles.buy}>
              {sortedTiers ? (
                <>
                  <div className={styles.price}>
                    {(() => {
                      const minPrice = sortedTiers.reduce(
                        (min, t) => (t.price != null && (min == null || t.price < min) ? t.price : min), null);
                      return minPrice
                        ? <>{minPrice.toLocaleString(locale === 'ar' ? 'ar-SA' : 'en-US')} <small>{t('service.currency')}</small></>
                        : <span className={styles.free}>{t('service.free')}</span>;
                    })()}
                  </div>
                  <div className={styles.billing}>{t('service.starting_at')}</div>
                  <button
                    className="btn btn-primary"
                    style={{ width: '100%', justifyContent: 'center' }}
                    onClick={() => setTab('pricing')}
                  >
                    {t('service.view_plans')}
                  </button>
                </>
              ) : (
                <>
                  <div className={styles.price}>
                    {price ? <>{price.toLocaleString(locale === 'ar' ? 'ar-SA' : 'en-US')} <small>{t('service.currency')}</small></> : <span className={styles.free}>{t('service.free')}</span>}
                  </div>
                  {price ? <div className={styles.billing}>{t('service.billing_quota')}</div> : null}
                  {product?.quotaDescription && (
                    <div className={styles.quota}>
                      <span className={styles.quotaIcon}>⚡</span>
                      {t('service.quota_limit', { value: product.quotaDescription })}
                    </div>
                  )}
                  {subscribedApp ? (
                    <>
                      <div className={styles.subscribedBadge}>
                        <span className={styles.subscribedDot} />
                        {t('service.already_subscribed')}
                      </div>
                      <a
                        href="/partner"
                        className="btn btn-primary"
                        style={{ width: '100%', justifyContent: 'center' }}
                      >
                        {t('service.manage_subscription')}
                      </a>
                      <p style={{ fontSize: '0.8rem', color: '#5A6B82', marginTop: '12px', textAlign: 'center' }}>
                        {t('service.already_subscribed_hint', { app: subscribedApp.name || subscribedApp.appName })}
                      </p>
                    </>
                  ) : isAuthed ? (
                    <>
                      <button
                        className="btn btn-primary"
                        style={{ width: '100%', justifyContent: 'center' }}
                        onClick={() => { window.location.href = '/partner?product=' + encodeURIComponent(name); }}
                      >
                        {price ? t('service.subscribe') : t('service.add_service')}
                      </button>
                      <p style={{ fontSize: '0.8rem', color: '#5A6B82', marginTop: '12px', textAlign: 'center' }}>
                        {price ? t('service.hint_paid') : t('service.hint_free')}
                      </p>
                    </>
                  ) : (
                    <>
                      <button
                        className="btn btn-primary"
                        style={{ width: '100%', justifyContent: 'center' }}
                        onClick={() => setShowInterest(true)}
                      >
                        {t('service.interest_cta')}
                      </button>
                      <p style={{ fontSize: '0.8rem', color: '#5A6B82', marginTop: '12px', textAlign: 'center' }}>
                        {t('service.interest_hint')}
                      </p>
                    </>
                  )}
                </>
              )}
            </div>
          </aside>
        </div>
      </div>

      {(showInterest || interestTarget) && (
        <InterestModal
          serviceName={interestTarget || name}
          onClose={() => { setShowInterest(false); setInterestTarget(null); }}
          onDone={() => { setShowInterest(false); setInterestTarget(null); setInterestSent(true); }}
        />
      )}
      {interestSent && (
        <div style={{ position: 'fixed', bottom: 24, insetInlineStart: 24, background: '#E6F5EE', color: '#1E7A4D', padding: '14px 22px', borderRadius: 10, fontWeight: 600, boxShadow: '0 4px 16px rgba(0,0,0,0.12)', zIndex: 110 }}>
          {t('service.interest_sent')}
        </div>
      )}
      <Footer />
    </>
  );
}

// بطاقة مستوى تسعير واحد ضمن خدمة مجمّعة — مرآة لنفس منطق CTA الثلاثي في الشريط الجانبي، لكن لكل مستوى على حدة
function TierCard({ tier, locale, isAuthed, subscribedApp, onInterest }) {
  const { t } = useI18n();
  const numLocale = locale === 'ar' ? 'ar-SA' : 'en-US';
  const isFree = !tier.price;

  return (
    <div className={styles.tierCard}>
      {tier.isDefault && <span className={styles.tierDefaultBadge}>{t('service.tier_default')}</span>}
      <h3 className={styles.tierLabel}>{tier.label}</h3>
      <div className={styles.price}>
        {isFree ? <span className={styles.free}>{t('service.free')}</span>
                : <>{tier.price.toLocaleString(numLocale)} <small>{t('service.currency')}</small></>}
      </div>
      {tier.quotaDescription && (
        <div className={styles.quota}>
          <span className={styles.quotaIcon}>⚡</span>
          {t('service.quota_limit', { value: tier.quotaDescription })}
        </div>
      )}
      {subscribedApp ? (
        <>
          <div className={styles.subscribedBadge}>
            <span className={styles.subscribedDot} />
            {t('service.already_subscribed')}
          </div>
          <a href="/partner" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
            {t('service.manage_subscription')}
          </a>
        </>
      ) : isAuthed ? (
        <button
          className="btn btn-primary"
          style={{ width: '100%', justifyContent: 'center' }}
          onClick={() => { window.location.href = '/partner?product=' + encodeURIComponent(tier.apigeeProductName); }}
        >
          {isFree ? t('service.add_service') : t('service.subscribe')}
        </button>
      ) : (
        <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={onInterest}>
          {t('service.interest_cta')}
        </button>
      )}
    </div>
  );
}

// نموذج إبداء الاهتمام بخدمة (proxy). يرسل بيانات التواصل للمسؤول.
function InterestModal({ serviceName, onClose, onDone }) {
  const { t } = useI18n();
  const [form, setForm] = useState({ fullName: '', phoneNumber: '', email: '', companyName: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  function update(field, value) { setForm((f) => ({ ...f, [field]: value })); }

  async function handleSubmit() {
    if (!form.fullName || !form.email || !form.phoneNumber || !form.companyName) {
      setError(t('interest.fill_all'));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      // ProductName يحمل اسم الـ proxy (النهج ب)
      await submitInterest({
        productName: serviceName,
        fullName: form.fullName,
        phoneNumber: form.phoneNumber,
        email: form.email,
        companyName: form.companyName,
      });
      onDone();
    } catch (err) {
      setError(err.message || t('interest.failed'));
    } finally {
      setBusy(false);
    }
  }

  const overlay = { position: 'fixed', inset: 0, background: 'rgba(11,31,58,0.5)', display: 'grid', placeItems: 'center', zIndex: 100, padding: 24 };
  const modal = { background: '#fff', borderRadius: 16, padding: 32, width: '100%', maxWidth: 440, boxShadow: '0 10px 40px rgba(0,0,0,0.2)' };
  const label = { display: 'block', fontSize: '0.9rem', fontWeight: 600, marginBottom: 16 };
  const input = { display: 'block', width: '100%', marginTop: 6, padding: '11px 14px', border: '1px solid #E2E7EE', borderRadius: 10, fontFamily: 'inherit', fontSize: '0.95rem', boxSizing: 'border-box' };

  return (
    <div style={overlay} onClick={onClose}>
      <div style={modal} onClick={(e) => e.stopPropagation()}>
        <h2 style={{ fontSize: '1.3rem', marginBottom: 8 }}>{t('interest.title', { service: serviceName })}</h2>
        <p style={{ fontSize: '0.88rem', color: '#5A6B82', marginBottom: 24 }}>
          {t('interest.subtitle')}
        </p>
        <label style={label}>{t('interest.full_name')}
          <input style={input} value={form.fullName} onChange={(e) => update('fullName', e.target.value)} />
        </label>
        <label style={label}>{t('interest.company')}
          <input style={input} value={form.companyName} onChange={(e) => update('companyName', e.target.value)} />
        </label>
        <label style={label}>{t('interest.email')}
          <input style={input} type="email" dir="ltr" value={form.email} onChange={(e) => update('email', e.target.value)} />
        </label>
        <label style={label}>{t('interest.phone')}
          <input style={input} type="tel" dir="ltr" value={form.phoneNumber} onChange={(e) => update('phoneNumber', e.target.value)} />
        </label>
        {error && <p style={{ color: '#C0392B', fontSize: '0.85rem', marginBottom: 14 }}>{error}</p>}
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={busy}>
            {busy ? t('interest.submitting') : t('interest.submit')}
          </button>
          <button onClick={onClose} style={{ padding: '11px 22px', border: '1px solid #E2E7EE', borderRadius: 10, background: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}>
            {t('common.cancel')}
          </button>
        </div>
      </div>
    </div>
  );
}

// صفّ بروكسي قابل للتوسيع — يجلب عملياته عند الفتح
function ProxyRow({ proxyName }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [ops, setOps] = useState(null);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    const next = !open;
    setOpen(next);
    // جلب العمليات أول مرة فقط
    if (next && ops === null) {
      setLoading(true);
      try {
        const data = await getProxyOperations(proxyName);
        // الاستجابة: قائمة ServiceOperations، كل واحد فيه Operations[] — نفكّها لقائمة مسطّحة
        const flat = [];
        const groups = Array.isArray(data) ? data : (data?.services || data?.operations || []);
        for (const g of groups) {
          const inner = g.operations || g.Operations || [];
          for (const o of inner) flat.push(o);
        }
        setOps(flat);
      } catch {
        setOps([]);
      } finally {
        setLoading(false);
      }
    }
  }

  return (
    <li className={styles.proxyRow}>
      <button className={styles.proxyToggle} onClick={toggle}>
        <span className={styles.proxyDot} />
        <span className={styles.proxyName}>{proxyName}</span>
        <span className={styles.proxyChevron}>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className={styles.proxyOps}>
          {loading ? (
            <div className={styles.proxyLoading}>{t('service.proxy_loading')}</div>
          ) : ops && ops.length ? (
            ops.map((op, i) => {
              const method = (op.method || op.Method || 'GET').toUpperCase();
              const path = op.path || op.Path || op.name || op.Name || '';
              return (
                <div key={i} className={styles.opLine}>
                  <span className={`${styles.opMethod} ${styles['m_' + method]}`}>{method}</span>
                  <span className={styles.opPath}>{path}</span>
                </div>
              );
            })
          ) : (
            <div className={styles.proxyLoading}>{t('service.proxy_no_ops')}</div>
          )}
        </div>
      )}
    </li>
  );
}
