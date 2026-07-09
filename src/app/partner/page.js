'use client';
import { useState, useEffect, useCallback } from 'react';
import { getMyApps, createApp, addService, getProducts, ensureRegistered, saveProfile, getProfile, startPurchase, requestPromotion, getMyPromotions, getDeveloperProfile } from '@/lib/api';
import { normalizePromotionStatus } from '@/lib/status';
import ServicePicker from '@/components/ServicePicker';
import RequireAuth from '@/components/RequireAuth';
import Header from '@/components/Header';
import styles from './partner.module.css';

export default function PartnerPage() {
  return (
    <RequireAuth role="portal-partner">
      <PartnerDashboard />
    </RequireAuth>
  );
}

function PartnerDashboard() {
  const [apps, setApps] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [toast, setToast] = useState(null);
  const [preselectedProduct, setPreselectedProduct] = useState('');
  const [promotions, setPromotions] = useState([]);

  const loadApps = useCallback(() => {
    setLoading(true);
    setLoadError(false);
    getMyApps()
      .then((d) => setApps(Array.isArray(d) ? d : []))
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, []);

  const loadPromotions = useCallback(() => {
    getMyPromotions()
      .then((d) => setPromotions(Array.isArray(d?.requests) ? d.requests : []))
      .catch(() => setPromotions([]));
  }, []);

  useEffect(() => {
    loadApps();
    loadPromotions();
    getProducts().then((d) => setProducts(Array.isArray(d) ? d : [])).catch(() => {});
    // إن جاء الشريك من صفحة خدمة (?product=)، نفتح نافذة الطلب بالخدمة محدّدة مسبقًا
    try {
      const params = new URLSearchParams(window.location.search);
      const p = params.get('product');
      if (p) { setPreselectedProduct(p); setShowCreate(true); }
    } catch {}
  }, [loadApps, loadPromotions]);

  // الشريك يطلب ترقية خدمة للإنتاج
  async function handlePromote(productName) {
    try {
      await requestPromotion(productName);
      notify(`أُرسل طلب ترقية «${productName}» للإنتاج. بانتظار موافقة المسؤول.`);
      loadPromotions();
    } catch (err) {
      notify(err.message || 'تعذّر إرسال طلب الترقية.', false);
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
              <h1>تطبيقاتي</h1>
              <p>أنشئ تطبيق للحصول على مفتاح وصول، واطلب إتاحة الخدمات التي تحتاجها.</p>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <a href="/partner/orders" className="btn" style={{ border: '1px solid #E2E6EC' }}>طلباتي وفواتيري</a>
              <button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ طلب خدمة</button>
            </div>
          </div>

          <ProfileCard />

          {loading ? (
            <div className={styles.empty}>جارٍ التحميل…</div>
          ) : loadError ? (
            <div className={styles.empty}>
              تعذّر تحميل تطبيقاتك. <button className="btn" style={{ border: '1px solid #E2E6EC' }} onClick={loadApps}>إعادة المحاولة</button>
            </div>
          ) : apps.length === 0 ? (
            <div className={styles.empty}>
              لا توجد تطبيقات بعد. اطلب أول تطبيق للبدء.
            </div>
          ) : (
            <div className={styles.grid}>
              {apps.map((app, i) => (
                <AppCard key={i} app={app} promotions={promotions} onPromote={handlePromote} />
              ))}
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
            notify(`أُنشئ التطبيق «${name}».`);
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
function AppCard({ app, promotions = [], onPromote }) {
  const [showKey, setShowKey] = useState(false);
  const [busyProduct, setBusyProduct] = useState(null);
  const credentials = app.credentials || [];
  const key = credentials[0]?.consumerKey || app.consumerKey;
  const secret = credentials[0]?.consumerSecret || app.consumerSecret;
  const products = credentials[0]?.products || credentials[0]?.apiProducts || app.apiProducts || [];

  // حالة ترقية خدمة معيّنة: Pending / Approved / Rejected / null
  function promotionOf(productName) {
    const r = promotions.find(
      (x) => (x.productName || '').toLowerCase() === (productName || '').toLowerCase()
    );
    return r ? normalizePromotionStatus(r.status) : null;
  }

  async function promote(productName) {
    setBusyProduct(productName);
    try { await onPromote(productName); } finally { setBusyProduct(null); }
  }

  return (
    <div className={styles.card}>
      <div className={styles.cardHead}>
        <h3>{app.name || app.appName}</h3>
        <span className={styles.status}>{app.status || 'نشط'}</span>
      </div>

      {key && (
        <div className={styles.cred}>
          <span className={styles.credLabel}>مفتاح الوصول</span>
          <code className={styles.credValue}>{key}</code>
        </div>
      )}
      {secret && (
        <div className={styles.cred}>
          <span className={styles.credLabel}>السرّ</span>
          <code className={styles.credValue}>
            {showKey ? secret : '••••••••••••'}
          </code>
          <button className={styles.reveal} onClick={() => setShowKey(!showKey)}>
            {showKey ? 'إخفاء' : 'إظهار'}
          </button>
        </div>
      )}

      <div className={styles.products}>
        <span className={styles.credLabel}>الخدمات المرتبطة (بيئة الاختبار)</span>
        {products.length ? (
          <div className={styles.svcList}>
            {products.map((p, i) => {
              const name = typeof p === 'string' ? p : (p.productName || p.apiproduct);
              const status = typeof p === 'object' ? p.status : null;
              const promo = promotionOf(name);
              return (
                <div key={i} className={styles.svcRow}>
                  <span className={`${styles.chip} ${status === 'approved' ? styles.chipOk : styles.chipPending}`}>
                    {name} {status === 'approved' ? '✓' : status === 'pending' ? '(معلّق)' : ''}
                  </span>

                  {promo === 'Approved' ? (
                    <span className={styles.promoLive}>في الإنتاج ✓</span>
                  ) : promo === 'Pending' ? (
                    <span className={styles.promoPending}>بانتظار الموافقة</span>
                  ) : promo === 'Rejected' ? (
                    <span className={styles.promoRejected}>مرفوض</span>
                  ) : (
                    <button
                      className={styles.promoBtn}
                      onClick={() => promote(name)}
                      disabled={busyProduct === name || status !== 'approved'}
                      title={status !== 'approved' ? 'يجب أن تكون الخدمة مفعّلة في الاختبار أولًا' : 'اطلب إتاحتها في الإنتاج'}
                    >
                      {busyProduct === name ? 'جارٍ الإرسال…' : 'اطلب الترقية للإنتاج'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <span className={styles.muted}>لا خدمات مرتبطة</span>
        )}
      </div>
    </div>
  );
}

// يقبل فقط روابط http/https مطلقة — يمنع إعادة التوجيه لروابط javascript:/data: إن تلاعب أحد باستجابة الدفع
function isSafePaymentUrl(url) {
  try {
    const parsed = new URL(url, window.location.href);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

// نافذة إنشاء تطبيق — اسم + اختيار خدمة لطلب إتاحتها
function CreateAppModal({ products, apps, initialProduct, onClose, onCreated, onError }) {
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
            onError('تعذّر تحديد مفتاح التطبيق. حدّث الصفحة وحاول مجددًا.');
            return;
          }
        }
        const session = await startPurchase({
          productName: selectedProduct,
          appName: useExisting ? selectedApp : '',
          consumerKey,
          createNewApp: !useExisting, // إن لم يختر تطبيقًا موجودًا، يُنشأ تطبيق جديد بعد الدفع
        });
        if (session?.paymentUrl && isSafePaymentUrl(session.paymentUrl)) {
          window.location.href = session.paymentUrl; // توجيه لبوابة الدفع
          return;
        }
        onError('تعذّر بدء عملية الدفع. حاول مجددًا.');
        return;
      }

      // خدمة مجانية: تُضاف مباشرة
      await addService(selectedProduct, appName, createNew);
      onCreated(selectedProduct);
    } catch (err) {
      onError(err.message || 'تعذّر إضافة الخدمة.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h2>طلب خدمة جديدة</h2>
        <label className={styles.label}>
          الخدمة المطلوبة
          {locked && lockedProduct ? (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              gap: '10px', padding: '12px 14px', marginTop: '6px',
              background: '#F1F5FB', border: '1px solid #D5DCE5', borderRadius: '10px',
            }}>
              <span style={{ fontWeight: 500, color: 'var(--navy, #0B1F3A)' }}>
                {lockedProduct.displayName || lockedProduct.name}
              </span>
              <span style={{
                fontSize: '0.75rem', padding: '3px 10px', borderRadius: '20px', fontWeight: 600,
                background: (lockedProduct.price > 0) ? '#FBF1DC' : '#EAF4EE',
                color: (lockedProduct.price > 0) ? '#8A6512' : '#1d4d33',
              }}>
                {(lockedProduct.price > 0) ? `${lockedProduct.price.toLocaleString('ar-SA')} ر.س` : 'مجانية'}
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
            أين تُضاف الخدمة؟
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'normal', cursor: 'pointer' }}>
                <input type="radio" name="target" checked={target === 'existing'} onChange={() => setTarget('existing')} />
                <span>إضافة إلى تطبيق موجود (نفس المفتاح)</span>
              </label>
              {target === 'existing' && (
                <select value={selectedApp} onChange={(e) => setSelectedApp(e.target.value)} style={{ marginRight: '24px' }}>
                  {apps.map((a, i) => (
                    <option key={i} value={a.name || a.appName}>{a.name || a.appName}</option>
                  ))}
                </select>
              )}
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'normal', cursor: 'pointer' }}>
                <input type="radio" name="target" checked={target === 'new'} onChange={() => setTarget('new')} />
                <span>إنشاء تطبيق جديد للخدمة (مفتاح مستقل)</span>
              </label>
            </div>
          </div>
        )}

        <p className={styles.note}>
          {target === 'new'
            ? 'سيُنشأ تطبيق جديد بمفتاح مستقل لهذه الخدمة. إتاحة الخدمة تحتاج موافقة المسؤول.'
            : 'تُضاف الخدمة إلى التطبيق المختار بنفس مفتاح الوصول. إتاحة الخدمة تحتاج موافقة المسؤول.'}
        </p>
        <div className={styles.modalActions}>
          <button className="btn btn-primary" onClick={handleCreate} disabled={busy || !selectedProduct}>
            {busy
              ? 'جارٍ المعالجة…'
              : ((lockedProduct?.price > 0 || (products.find((p) => p.name === selectedProduct)?.price > 0))
                  ? 'المتابعة للدفع'
                  : 'طلب الخدمة')}
          </button>
          <button className={styles.cancel} onClick={onClose}>إلغاء</button>
        </div>
      </div>
    </div>
  );
}

// بطاقة الملف الشخصي — اسم الشريك وجهته (تُحفظ محليًّا، تُستخدم في التسجيل)
function ProfileCard() {
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
            <strong>ملفي الشخصي</strong>
            <span className={styles.profileHint}>
              {profile.firstName} {profile.lastName} — {profile.companyName}
            </span>
          </div>
          <span>{open ? '▲' : '▼'}</span>
        </div>
        {open && (
          <div className={styles.profileBody}>
            <p className={styles.profileNote}>
              بياناتك مسجَّلة في Apigee. لتعديلها، تواصل مع فريق البوابة.
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
          <strong>ملفي الشخصي</strong>
          <span className={styles.profileHint}>
            {loading
              ? 'جارٍ التحميل…'
              : filled
                ? `${profile.firstName} ${profile.lastName} — ${profile.companyName}`
                : 'لم يُكمل بعد (سيُشتقّ الاسم من بريدك)'}
          </span>
        </div>
        <span>{open ? '▲' : '▼'}</span>
      </div>
      {open && (
        <div className={styles.profileBody}>
          <p className={styles.profileNote}>
            {locked
              ? 'هذه بياناتك المحفوظة. اضغط «تعديل» لتغييرها.'
              : 'تُحفظ هذه البيانات وتُستخدم عند تسجيلك في Apigee. أكملها قبل إنشاء أول تطبيق.'}
          </p>
          <div className={styles.profileRow}>
            <label>الاسم الأول
              <input value={profile.firstName} disabled={locked} onChange={(e) => setProfile({ ...profile, firstName: e.target.value })} />
            </label>
            <label>الاسم الأخير
              <input value={profile.lastName} disabled={locked} onChange={(e) => setProfile({ ...profile, lastName: e.target.value })} />
            </label>
          </div>
          <label className={styles.profileFull}>اسم الجهة
            <input value={profile.companyName} disabled={locked} onChange={(e) => setProfile({ ...profile, companyName: e.target.value })} />
          </label>
          {locked ? (
            <button className="btn btn-secondary" onClick={() => setEditing(true)}>
              تعديل
            </button>
          ) : (
            <button className="btn btn-primary" onClick={handleSave}>
              {saved ? 'حُفظ ✓' : 'حفظ الملف'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
