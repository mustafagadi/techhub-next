'use client';
import { useState, useEffect, useCallback } from 'react';
import { getMyApps, getMyProdApps, createApp, addService, getProducts, ensureRegistered, saveProfile, getProfile, startPurchase, requestPromotion, getMyPromotions, getDeveloperProfile } from '@/lib/api';
import ServicePicker from '@/components/ServicePicker';
import RequireAuth from '@/components/RequireAuth';
import Header from '@/components/Header';
import { useI18n } from '@/lib/i18n';
import styles from './partner.module.css';

export default function PartnerPage() {
  return (
    <RequireAuth role="portal-partner">
      <PartnerDashboard />
    </RequireAuth>
  );
}

function PartnerDashboard() {
  const { t } = useI18n();
  const [apps, setApps] = useState([]);
  const [prodApps, setProdApps] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [toast, setToast] = useState(null);
  const [preselectedProduct, setPreselectedProduct] = useState('');
  const [promotions, setPromotions] = useState([]);

  const loadApps = useCallback(() => {
    getMyApps()
      .then((d) => setApps(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const loadProdApps = useCallback(() => {
    getMyProdApps()
      .then((d) => setProdApps(Array.isArray(d) ? d : []))
      .catch(() => setProdApps([]));
  }, []);

  const loadPromotions = useCallback(() => {
    getMyPromotions()
      .then((d) => setPromotions(Array.isArray(d?.requests) ? d.requests : []))
      .catch(() => setPromotions([]));
  }, []);

  useEffect(() => {
    loadApps();
    loadProdApps();
    loadPromotions();
    getProducts().then((d) => setProducts(Array.isArray(d) ? d : [])).catch(() => {});
    // إن جاء الشريك من صفحة خدمة (?product=)، نفتح نافذة الطلب بالخدمة محدّدة مسبقًا
    try {
      const params = new URLSearchParams(window.location.search);
      const p = params.get('product');
      if (p) { setPreselectedProduct(p); setShowCreate(true); }
    } catch {}
  }, [loadApps, loadProdApps, loadPromotions]);

  // الشريك يطلب ترقية خدمة للإنتاج
  async function handlePromote(productName) {
    try {
      await requestPromotion(productName);
      notify(t('partner.promote_success', { name: productName }));
      loadPromotions();
    } catch (err) {
      notify(err.message || t('partner.promote_failed'), false);
    }
  }

  function notify(message, ok = true) {
    setToast({ message, ok });
    setTimeout(() => setToast(null), 3000);
  }

  return (
    <>
      <Header />
      <div className={styles.page}>
        <div className="container">
          <div className={styles.head}>
            <div>
              <h1>{t('partner.title')}</h1>
              <p>{t('partner.subtitle')}</p>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <a href="/partner/orders" className="btn" style={{ border: '1px solid #E2E6EC' }}>{t('orders.title')}</a>
              <button className="btn btn-primary" onClick={() => setShowCreate(true)}>{t('partner.request_service')}</button>
            </div>
          </div>

          <ProfileCard />

          {loading ? (
            <div className={styles.empty}>{t('common.loading')}</div>
          ) : apps.length === 0 ? (
            <div className={styles.empty}>
              {t('partner.empty')}
            </div>
          ) : (
            <div className={styles.grid}>
              {apps.map((app, i) => (
                <AppCard key={i} app={app} promotions={promotions} onPromote={handlePromote} />
              ))}
            </div>
          )}

          {prodApps.length > 0 && (
            <div className={styles.prodSection}>
              <div className={styles.head}>
                <div>
                  <h2>{t('partner.production_title')}</h2>
                  <p>{t('partner.production_subtitle')}</p>
                </div>
              </div>
              <div className={styles.grid}>
                {prodApps.map((app, i) => (
                  <AppCard key={i} app={app} prod />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {showCreate && (
        <CreateAppModal
          products={products}
          apps={apps}
          initialProduct={preselectedProduct}
          onClose={() => setShowCreate(false)}
          onCreated={(name) => {
            setShowCreate(false);
            notify(t('partner.app_created', { name }));
            loadApps();
          }}
          onError={(msg) => notify(msg, false)}
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

// بطاقة تطبيق — تعرض اسمه ومفاتيحه والخدمات المرتبطة وحالة ترقيتها للإنتاج
// prod=true: بطاقة قراءة فقط لتطبيق بيئة الإنتاج (بلا أزرار ترقية، فهو أصلًا مفعّل هناك)
function AppCard({ app, promotions = [], onPromote, prod = false }) {
  const { t } = useI18n();
  const [showKey, setShowKey] = useState(false);
  const [busyProduct, setBusyProduct] = useState(null);
  const credentials = app.credentials || [];
  const key = credentials[0]?.consumerKey || app.consumerKey;
  const secret = credentials[0]?.consumerSecret || app.consumerSecret;
  const products = credentials[0]?.products || credentials[0]?.apiProducts || app.apiProducts || [];

  // الخلفية قد تُرجع الحالة كرقم (0/1/2) أو كنص — نوحّدها.
  const STATUS_BY_NUM = { 0: 'Pending', 1: 'Approved', 2: 'Rejected' };
  function normStatus(s) {
    if (typeof s === 'number') return STATUS_BY_NUM[s] ?? String(s);
    if (typeof s === 'string' && /^[0-2]$/.test(s)) return STATUS_BY_NUM[Number(s)];
    return s;
  }

  // حالة ترقية خدمة معيّنة: Pending / Approved / Rejected / null
  function promotionOf(productName) {
    const r = promotions.find(
      (x) => (x.productName || '').toLowerCase() === (productName || '').toLowerCase()
    );
    return r ? normStatus(r.status) : null;
  }

  async function promote(productName) {
    setBusyProduct(productName);
    try { await onPromote(productName); } finally { setBusyProduct(null); }
  }

  return (
    <div className={styles.card}>
      <div className={styles.cardHead}>
        <h3>{app.name || app.appName}</h3>
        {prod ? (
          <span className={styles.promoLive}>{t('partner.production_badge')}</span>
        ) : (
          <span className={styles.status}>{app.status || t('partner.status_active')}</span>
        )}
      </div>

      {key && (
        <div className={styles.cred}>
          <span className={styles.credLabel}>{t('partner.access_key')}</span>
          <code className={styles.credValue}>{key}</code>
        </div>
      )}
      {secret && (
        <div className={styles.cred}>
          <span className={styles.credLabel}>{t('partner.secret')}</span>
          <code className={styles.credValue}>
            {showKey ? secret : '••••••••••••'}
          </code>
          <button className={styles.reveal} onClick={() => setShowKey(!showKey)}>
            {showKey ? t('partner.hide') : t('partner.show')}
          </button>
        </div>
      )}

      <div className={styles.products}>
        <span className={styles.credLabel}>{prod ? t('partner.linked_services_prod') : t('partner.linked_services')}</span>
        {products.length ? (
          <div className={styles.svcList}>
            {products.map((p, i) => {
              const name = typeof p === 'string' ? p : (p.productName || p.apiproduct);
              const status = typeof p === 'object' ? p.status : null;
              if (prod) {
                return (
                  <div key={i} className={styles.svcRow}>
                    <span className={`${styles.chip} ${styles.chipOk}`}>{name}</span>
                  </div>
                );
              }
              const promo = promotionOf(name);
              return (
                <div key={i} className={styles.svcRow}>
                  <span className={`${styles.chip} ${status === 'approved' ? styles.chipOk : styles.chipPending}`}>
                    {name} {status === 'approved' ? '✓' : status === 'pending' ? t('partner.pending_suffix') : ''}
                  </span>

                  {promo === 'Approved' ? (
                    <span className={styles.promoLive}>{t('partner.promo_live')}</span>
                  ) : promo === 'Pending' ? (
                    <span className={styles.promoPending}>{t('partner.promo_pending')}</span>
                  ) : promo === 'Rejected' ? (
                    <span className={styles.promoRejected}>{t('partner.promo_rejected')}</span>
                  ) : (
                    <button
                      className={styles.promoBtn}
                      onClick={() => promote(name)}
                      disabled={busyProduct === name || status !== 'approved'}
                      title={status !== 'approved' ? t('partner.promote_disabled_hint') : t('partner.promote_hint')}
                    >
                      {busyProduct === name ? t('partner.promote_sending') : t('partner.promote_btn')}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <span className={styles.muted}>{t('partner.no_linked_services')}</span>
        )}
      </div>
    </div>
  );
}

// نافذة إنشاء تطبيق — اسم + اختيار خدمة لطلب إتاحتها
function CreateAppModal({ products, apps, initialProduct, onClose, onCreated, onError }) {
  const { t } = useI18n();
  const [selectedProduct, setSelectedProduct] = useState(initialProduct || '');
  // إن جاء الشريك من صفحة خدمة محدّدة، الخدمة مقفلة (لا يعيد اختيارها من قائمة).
  const locked = !!initialProduct;
  const lockedProduct = products.find((p) => p.name === initialProduct);
  const hasApps = Array.isArray(apps) && apps.length > 0;
  // الوجهة: 'existing' = تطبيق موجود، 'new' = تطبيق جديد. الافتراضي حسب توفّر تطبيقات.
  const [target, setTarget] = useState(hasApps ? 'existing' : 'new');
  const [selectedApp, setSelectedApp] = useState(hasApps ? (apps[0].name || apps[0].appName || '') : '');
  const [busy, setBusy] = useState(false);

  async function handleCreate() {
    if (!selectedProduct) return;
    // لا نمنع الإنشاء إن كان الملف فارغًا: الخلفية تشتقّ الاسم من البريد،
    // ومن جاء عبر دعوة تصله بياناته تلقائيًّا.
    const myProfile = getProfile() || {};
    setBusy(true);
    try {
      // تسجيل الشريك في Apigee تلقائيًّا (يتجاهل إن كان مسجّلًا)
      await ensureRegistered(myProfile);
      const useExisting = (target === 'existing' && hasApps);
      const appName = useExisting ? selectedApp : null;
      const createNew = !useExisting;

      // نحدّد سعر الخدمة المختارة من القائمة
      const product = products.find((p) => p.name === selectedProduct);
      const price = product?.price || 0;

      if (price > 0) {
        // خدمة مدفوعة: إمّا على تطبيق موجود (بمفتاحه)، أو إنشاء تطبيق جديد بعد الدفع.
        let consumerKey = '';
        if (useExisting && selectedApp) {
          const app = apps.find((a) => (a.name || a.appName) === selectedApp);
          consumerKey = app?.credentials?.[0]?.consumerKey || app?.consumerKey || '';
          if (!consumerKey) {
            onError(t('partner.app_key_error'));
            return;
          }
        }
        const session = await startPurchase({
          productName: selectedProduct,
          appName: useExisting ? selectedApp : '',
          consumerKey,
          createNewApp: !useExisting, // إن لم يختر تطبيقًا موجودًا، يُنشأ تطبيق جديد بعد الدفع
        });
        if (session?.paymentUrl) {
          window.location.href = session.paymentUrl; // توجيه لبوابة الدفع
          return;
        }
        onError(t('partner.payment_start_failed'));
        return;
      }

      // خدمة مجانية: تُضاف مباشرة
      await addService(selectedProduct, appName, createNew);
      onCreated(selectedProduct);
    } catch (err) {
      onError(err.message || t('partner.add_service_failed'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h2>{t('partner.modal_title')}</h2>
        <label className={styles.label}>
          {t('partner.modal_service_label')}
          {locked && lockedProduct ? (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              gap: '10px', padding: '12px 14px', marginTop: '6px',
              background: '#F1F5FB', border: '1px solid #D5DCE5', borderRadius: '10px',
            }}>
              <span style={{ fontWeight: 500, color: '#161616' }}>
                {lockedProduct.displayName || lockedProduct.name}
              </span>
              <span style={{
                fontSize: '0.75rem', padding: '3px 10px', borderRadius: '20px', fontWeight: 600,
                background: (lockedProduct.price > 0) ? '#FBF1DC' : '#EAF4EE',
                color: (lockedProduct.price > 0) ? '#8A6512' : '#1d4d33',
              }}>
                {(lockedProduct.price > 0) ? `${lockedProduct.price.toLocaleString('ar-SA')} ${t('service.currency')}` : t('partner.free')}
              </span>
            </div>
          ) : (
            <ServicePicker
              products={products}
              value={selectedProduct}
              onChange={setSelectedProduct}
            />
          )}
        </label>

        {hasApps && (
          <div className={styles.label}>
            {t('partner.modal_where_label')}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'normal', cursor: 'pointer' }}>
                <input type="radio" name="target" checked={target === 'existing'} onChange={() => setTarget('existing')} />
                <span>{t('partner.modal_existing_app')}</span>
              </label>
              {target === 'existing' && (
                <select value={selectedApp} onChange={(e) => setSelectedApp(e.target.value)} style={{ marginInlineStart: '24px' }}>
                  {apps.map((a, i) => (
                    <option key={i} value={a.name || a.appName}>{a.name || a.appName}</option>
                  ))}
                </select>
              )}
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'normal', cursor: 'pointer' }}>
                <input type="radio" name="target" checked={target === 'new'} onChange={() => setTarget('new')} />
                <span>{t('partner.modal_new_app')}</span>
              </label>
            </div>
          </div>
        )}

        <p className={styles.note}>
          {target === 'new'
            ? t('partner.modal_note_new')
            : t('partner.modal_note_existing')}
        </p>
        <div className={styles.modalActions}>
          <button className="btn btn-primary" onClick={handleCreate} disabled={busy || !selectedProduct}>
            {busy
              ? t('partner.modal_processing')
              : ((lockedProduct?.price > 0 || (products.find((p) => p.name === selectedProduct)?.price > 0))
                  ? t('partner.modal_continue_payment')
                  : t('partner.modal_request_service'))}
          </button>
          <button className={styles.cancel} onClick={onClose}>{t('common.cancel')}</button>
        </div>
      </div>
    </div>
  );
}

// بطاقة الملف الشخصي — اسم الشريك وجهته (تُحفظ محليًّا، تُستخدم في التسجيل)
function ProfileCard() {
  const { t } = useI18n();
  const [profile, setProfile] = useState({ firstName: '', lastName: '', companyName: '' });
  const [saved, setSaved] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false); // وضع التعديل (الحقول مفتوحة للكتابة)
  const [registered, setRegistered] = useState(false); // مسجَّل في Apigee؟
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    // مصدر الحقيقة: Apigee. إن كان الشريك مسجّلًا هناك، نعرض بياناته ولا نطالبه بشيء.
    getDeveloperProfile()
      .then((d) => {
        if (!alive) return;
        if (d?.registered) {
          const p = {
            firstName: d.firstName || '',
            lastName: d.lastName || '',
            companyName: d.company || '',
          };
          setProfile(p);
          saveProfile(p);      // نزامن التخزين المحلي
          setRegistered(true);
          setEditing(false);
          return;
        }
        // غير مسجّل بعد → نرجع للتخزين المحلي (قد يأتي من الدعوة)
        const local = getProfile();
        if (local) {
          setProfile(local);
          setEditing(!(local.firstName || local.companyName));
        } else {
          setEditing(true);
        }
      })
      .catch(() => {
        const local = getProfile();
        if (local) { setProfile(local); setEditing(!(local.firstName || local.companyName)); }
        else setEditing(true);
      })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  function handleSave() {
    saveProfile(profile);
    setSaved(true);
    setEditing(false); // بعد الحفظ نقفل الحقول
    setTimeout(() => setSaved(false), 2500);
  }

  const filled = profile.firstName || profile.companyName;
  // مسجَّل في Apigee → مقفل دائمًا (البيانات هناك، لا تُعدَّل من هنا)
  const locked = registered || !editing;

  // مسجَّل ببيانات كاملة → لا حاجة لإظهار البطاقة إطلاقًا
  if (!loading && registered && filled) {
    return (
      <div className={styles.profileCard}>
        <div className={styles.profileHead} onClick={() => setOpen(!open)}>
          <div>
            <strong>{t('partner.profile_title')}</strong>
            <span className={styles.profileHint}>
              {profile.firstName} {profile.lastName} — {profile.companyName}
            </span>
          </div>
          <span>{open ? '▲' : '▼'}</span>
        </div>
        {open && (
          <div className={styles.profileBody}>
            <p className={styles.profileNote}>
              {t('partner.profile_registered_note')}
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={styles.profileCard}>
      <div className={styles.profileHead} onClick={() => setOpen(!open)}>
        <div>
          <strong>{t('partner.profile_title')}</strong>
          <span className={styles.profileHint}>
            {loading
              ? t('common.loading')
              : filled
                ? `${profile.firstName} ${profile.lastName} — ${profile.companyName}`
                : t('partner.profile_incomplete')}
          </span>
        </div>
        <span>{open ? '▲' : '▼'}</span>
      </div>
      {open && (
        <div className={styles.profileBody}>
          <p className={styles.profileNote}>
            {locked
              ? t('partner.profile_edit_note')
              : t('partner.profile_new_note')}
          </p>
          <div className={styles.profileRow}>
            <label>{t('partner.first_name')}
              <input value={profile.firstName} disabled={locked} onChange={(e) => setProfile({ ...profile, firstName: e.target.value })} />
            </label>
            <label>{t('partner.last_name')}
              <input value={profile.lastName} disabled={locked} onChange={(e) => setProfile({ ...profile, lastName: e.target.value })} />
            </label>
          </div>
          <label className={styles.profileFull}>{t('partner.company_name')}
            <input value={profile.companyName} disabled={locked} onChange={(e) => setProfile({ ...profile, companyName: e.target.value })} />
          </label>
          {locked ? (
            <button className="btn btn-secondary" onClick={() => setEditing(true)}>
              {t('partner.edit')}
            </button>
          ) : (
            <button className="btn btn-primary" onClick={handleSave}>
              {saved ? t('partner.saved') : t('partner.save_profile')}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
