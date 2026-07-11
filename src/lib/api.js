// طبقة الاتصال بالـ API الخلفي (ApigeePortal.Api)
// كل الاستدعاءات تمرّ من هنا، فيسهل تعديل العنوان أو إضافة المصادقة لاحقًا.

// على المتصفح: مسار نسبي /api (يُوجَّه عبر next.config.js).
// على الخادم (server components): يحتاج عنوانًا كاملًا، من API_BASE_SERVER.

// رسالة الخطأ الاحتياطية بلغة الواجهة الحالية (تُستخدم فقط إن لم يُرجع الخادم رسالة)
function fallbackError(status) {
  let locale = 'en';
  try { locale = localStorage.getItem('portal_locale') || 'en'; } catch {}
  return locale === 'ar' ? `خطأ ${status}` : `Error ${status}`;
}

function resolveBase() {
  if (typeof window === 'undefined') {
    // بيئة الخادم: عنوان كامل للخلفية (عرّفه في .env.local)
    return process.env.API_BASE_SERVER || 'http://localhost:5080/api';
  }
  // بيئة المتصفح: مسار نسبي يمرّ عبر إعادة التوجيه
  return process.env.NEXT_PUBLIC_API_BASE || '/api';
}

// البيئة المختارة (prod/test) — تُرسل في ترويسة X-Apigee-Environment
// تُحفظ في sessionStorage لتبقى عبر تحديث الصفحة.
const ENV_KEY = 'portal_env';
let currentEnv = 'prod';
if (typeof window !== 'undefined') {
  try { currentEnv = sessionStorage.getItem(ENV_KEY) || 'prod'; } catch {}
}
export function setEnvironment(env) {
  currentEnv = env;
  if (typeof window !== 'undefined') {
    try { sessionStorage.setItem(ENV_KEY, env); } catch {}
  }
}
export function getEnvironment() { return currentEnv; }

// ===== المصادقة: حفظ رمز الدخول واسترجاعه =====
// يُحفظ في الذاكرة + sessionStorage (يبقى عبر تحديث الصفحة، يُمسح بإغلاق التبويب).
const TOKEN_KEY = 'portal_auth';

export function setAuth(token, email, role, permissions = []) {
  if (typeof window === 'undefined') return;
  if (token) {
    sessionStorage.setItem(TOKEN_KEY, JSON.stringify({ token, email, role, permissions }));
  } else {
    sessionStorage.removeItem(TOKEN_KEY);
  }
}

export function getAuth() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(TOKEN_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function logout() { setAuth(null); }

// المسؤول الفائق يملك كل الصلاحيات ضمنيًّا — دون الحاجة لتخزينها له فرديًّا.
export function hasPermission(code) {
  const auth = getAuth();
  if (!auth) return false;
  if (auth.role === 'portal-superadmin') return true;
  return Array.isArray(auth.permissions) && auth.permissions.includes(code);
}

async function request(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    'X-Apigee-Environment': currentEnv,
    ...(options.headers || {}),
  };
  // حقن رمز الدخول تلقائيًّا في كل طلب (إن وُجد)
  const auth = getAuth();
  if (auth?.token) headers['Authorization'] = `Bearer ${auth.token}`;

  const res = await fetch(`${resolveBase()}${path}`, { ...options, headers });
  if (!res.ok) {
    let message = fallbackError(res.status);
    try { const body = await res.json(); message = body.message || message; } catch {}
    const err = new Error(message);
    err.status = res.status;
    throw err;
  }
  if (res.status === 204) return null;
  return res.json();
}

// ===== الدخول والخروج =====
export async function login(email, password) {
  const res = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  // الخلفية تعيد { token, email, role, permissions }
  setAuth(res.token, res.email, res.role, res.permissions || []);
  return res;
}

// ===== الكتالوج العام =====
export const getProducts = () => request('/products');

// [النهج ب] قائمة الـ proxies للكتالوج مع حالة قابلية الاشتراك
export const getProxies = async () => {
  const res = await request('/products/proxies');
  if (Array.isArray(res)) return res;
  return res?.proxies || [];
};

// [النهج ب] عمليات proxy واحد مباشرة (من حزمته في Apigee)
export const getProxyOperations = (proxyName) =>
  request(`/products/proxy/${encodeURIComponent(proxyName)}/operations`);

// [النهج ب] مواصفة OpenAPI مولّدة من proxy (للتوثيق الكامل والـ schemas)
export const getProxySpec = (proxyName) =>
  request(`/products/proxy/${encodeURIComponent(proxyName)}/generated-spec`);

export const getProduct = (name) => request(`/products/${encodeURIComponent(name)}`);
export const getProductSpec = (name) => request(`/products/${encodeURIComponent(name)}/spec`);
export const getProductOperations = (name) => request(`/products/${encodeURIComponent(name)}/operations`);

// ===== رفع الملفات (multipart) =====
// دالة منفصلة عن request: لا تضع Content-Type (المتصفح يضبطه مع boundary)، لكن تُبقي المصادقة.
async function uploadFile(path, file, method = 'PUT') {
  const form = new FormData();
  form.append('file', file);

  const headers = { 'X-Apigee-Environment': currentEnv };
  const auth = getAuth();
  if (auth?.token) headers['Authorization'] = `Bearer ${auth.token}`;

  const res = await fetch(`${resolveBase()}${path}`, { method, headers, body: form });
  if (!res.ok) {
    let message = fallbackError(res.status);
    try { const body = await res.json(); message = body.message || message; } catch {}
    const err = new Error(message);
    err.status = res.status;
    throw err;
  }
  if (res.status === 204) return null;
  return res.json();
}

// رفع ملف Postman وتحويله لمواصفة
export const importPostman = (name, file) =>
  uploadFile(`/admin/products/${encodeURIComponent(name)}/import-postman`, file, 'PUT');

// رفع ملف توثيق (PDF/Word) لخدمة — من لوحة الأدمن.
export const uploadDocFile = (name, file) =>
  uploadFile(`/admin/products/${encodeURIComponent(name)}/doc-file`, file, 'PUT');

// هل لهذه الخدمة ملف توثيق مرفوع؟
export const docFileExists = (name) =>
  request(`/products/${encodeURIComponent(name)}/doc-file/exists`);

// رابط تنزيل ملف التوثيق المباشر (يفتحه المتصفّح للتنزيل).
export const docFileUrl = (name) =>
  `${resolveBase()}/products/${encodeURIComponent(name)}/doc-file`;

// رفع ملف OpenAPI جاهز
export const uploadSpec = (name, file) =>
  uploadFile(`/admin/products/${encodeURIComponent(name)}/spec`, file, 'PUT');

// توليد مواصفة من الـ proxy
export const generateSpec = (name) =>
  request(`/admin/products/${encodeURIComponent(name)}/generate-spec`, { method: 'POST' });

// ===== تسجيل الاهتمام (عام) =====
export const submitInterest = (data) =>
  request('/interest', { method: 'POST', body: JSON.stringify(data) });

// ===== الشركاء =====
// عمليات توفير الوصول للشريك تُوجَّه دائمًا لبيئة الاختبار (stage) أولًا.
// الترقية للإنتاج تتمّ لاحقًا بموافقة المسؤول (per-service).
const STAGE = { headers: { 'X-Apigee-Environment': 'test' } };

export const registerPartner = (data) =>
  request('/partners/register', { method: 'POST', body: JSON.stringify(data), ...STAGE });
export const createApp = (data) =>
  request('/partners/apps', { method: 'POST', body: JSON.stringify(data), ...STAGE });

// يضيف خدمة لتطبيق الشريك الموجود بنفس المفتاح (مفتاح واحد لكل الخدمات).
// appName اختياري — إن غاب يُستخدم أول تطبيق للشريك.
// يضيف خدمة لتطبيق الشريك الموجود بنفس المفتاح، أو ينشئ تطبيقًا جديدًا إن createNew=true.
// يُوجَّه لبيئة stage (الوصول الأولي دائمًا اختباري).
export const addService = (productName, appName = null, createNew = false) =>
  request('/partners/apps/add-service', {
    method: 'POST',
    body: JSON.stringify({ productName, appName, createNew }),
    ...STAGE,
  });

// ملف الشريك الشخصي (يُحفظ محليًّا، يُستخدم في التسجيل)
const PROFILE_KEY = 'portal_profile';
export function saveProfile(profile) {
  try { sessionStorage.setItem(PROFILE_KEY, JSON.stringify(profile)); } catch {}
}
export function getProfile() {
  try { return JSON.parse(sessionStorage.getItem(PROFILE_KEY) || 'null'); } catch { return null; }
}

// يضمن تسجيل الشريك في Apigee قبل إنشاء تطبيق.
// إن كان مسجّلًا مسبقًا (409) يتجاهل الخطأ ويكمل. البريد من الرمز في الخلفية.
export async function ensureRegistered(profile = {}) {
  const auth = getAuth();
  const saved = getProfile() || {};
  const company = profile.companyName || saved.companyName || auth?.company || 'Partner';
  try {
    await registerPartner({
      firstName: profile.firstName || saved.firstName || 'Portal',
      lastName: profile.lastName || saved.lastName || 'Partner',
      companyName: company,
    });
  } catch (err) {
    // 409 = مسجّل مسبقًا → ليس خطأ، نكمل
    if (err.status !== 409) throw err;
  }
}

// جلب تطبيقات الشريك الحالي من بيئة stage (البريد من رمز الدخول المحفوظ)
export const getMyApps = async () => {
  const auth = getAuth();
  if (!auth?.email) return [];
  const res = await request(`/partners/${encodeURIComponent(auth.email)}/apps`, { ...STAGE });
  if (Array.isArray(res)) return res;
  return res?.apps || res?.app || [];
};

// جلب تطبيق محدّد من بيئة stage
export const getApp = (appName) => {
  const auth = getAuth();
  return request(`/partners/${encodeURIComponent(auth.email)}/apps/${encodeURIComponent(appName)}`, { ...STAGE });
};

// ملف المطوّر كما هو مسجَّل في Apigee (بيئة stage) → { registered, firstName, lastName, company }
export const getDeveloperProfile = async () => {
  const auth = getAuth();
  if (!auth?.email) return null;
  try {
    return await request(`/partners/${encodeURIComponent(auth.email)}/profile`, { ...STAGE });
  } catch { return null; }
};

// ===== ترقية الخدمات من stage إلى الإنتاج =====
// الشريك يطلب ترقية خدمة (بشرط وجودها في stage).
export const requestPromotion = (productName) =>
  request('/promotions', { method: 'POST', body: JSON.stringify({ productName }) });

// طلبات الشريك الحالي → { requests: [...] }
export const getMyPromotions = () => request('/promotions/mine');

// كل الطلبات (للمسؤول) → { total, requests: [...] }
export const getAllPromotions = (status) =>
  request(`/promotions${status ? `?status=${encodeURIComponent(status)}` : ''}`);

// المسؤول: قبول / رفض
export const approvePromotion = (id, note = '') =>
  request(`/promotions/${encodeURIComponent(id)}/approve`, {
    method: 'POST', body: JSON.stringify({ note }),
  });

export const rejectPromotion = (id, note = '') =>
  request(`/promotions/${encodeURIComponent(id)}/reject`, {
    method: 'POST', body: JSON.stringify({ note }),
  });

// ===== الدفع =====
export const startPurchase = (data) =>
  request('/payments/purchase', { method: 'POST', body: JSON.stringify(data) });
export const getMyOrders = () => request('/payments/my-orders');

// ===== الإدارة =====
export const getAllProducts = async () => {
  const res = await request('/products/all');
  // الخلفية تعيد { total, products } — نستخرج المصفوفة
  if (Array.isArray(res)) return res;
  return res?.products || [];
};
export const setPricing = (name, data) =>
  request(`/admin/products/${encodeURIComponent(name)}/pricing`, { method: 'PUT', body: JSON.stringify(data) });
// data: { price, billingType, quotaLimit? }
export const publishProduct = (name) =>
  request(`/admin/products/${encodeURIComponent(name)}/publish`, { method: 'POST' });
export const unpublishProduct = (name) =>
  request(`/admin/products/${encodeURIComponent(name)}/unpublish`, { method: 'POST' });

// ضبط نوع الموافقة: 'manual' (ينتظر موافقة) أو 'auto' (تلقائي)
export const setApprovalType = (name, approvalType) =>
  request(`/admin/products/${encodeURIComponent(name)}/approval-type`, {
    method: 'PUT', body: JSON.stringify({ approvalType }),
  });
export const getAccessRequests = async () => {
  const res = await request('/admin/access-requests');
  if (Array.isArray(res)) return res;
  return res?.requests || [];
};
export const approveAccess = (data) =>
  request('/admin/access-requests/approve', { method: 'POST', body: JSON.stringify(data) });
export const rejectAccess = (data) =>
  request('/admin/access-requests/reject', { method: 'POST', body: JSON.stringify(data) });
export const getInterestRequests = async () => {
  const res = await request('/interest');
  if (Array.isArray(res)) return res;
  return res?.requests || [];
};
export const updateInterestStatus = (id, data) =>
  request(`/interest/${id}/status`, { method: 'PUT', body: JSON.stringify(data) });

// دعوة شريك (Identity) من قبل المسؤول، عادة بعد الموافقة على اهتمام.
// ترسل بريد دعوة، والشريك ينشئ كلمة مروره عبر الرابط.
export const createPartnerAccount = (data) =>
  request('/admin/partner-invites', { method: 'POST', body: JSON.stringify(data) });

// عرض بيانات الدعوة (عامّ — صفحة قبول الدعوة).
export const getInvite = (token) =>
  request(`/invites/${encodeURIComponent(token)}`);

// قبول الدعوة وإنشاء كلمة المرور (عامّ).
export const acceptInvite = (token, password) =>
  request('/invites/accept', { method: 'POST', body: JSON.stringify({ token, password }) });

// ===== الصحة والبيئات =====
export const getEnvironments = () => request('/health/environments');
export const getApigeeHealth = () => request('/health/apigee');

// ===== إدارة حسابات المسؤولين وصلاحياتهم (portal-superadmin فقط) =====
export const getAdminUsers = async () => {
  const res = await request('/admin/users');
  if (Array.isArray(res)) return res;
  return res?.users || [];
};
// يرسل دعوة بريدية لمسؤول جديد (بريد/دور/صلاحيات) — لا كلمة مرور هنا، المدعو يختارها بنفسه
export const inviteAdminUser = (data) =>
  request('/admin/users', { method: 'POST', body: JSON.stringify(data) });
export const setAdminUserPermissions = (userId, permissions) =>
  request(`/admin/users/${encodeURIComponent(userId)}/permissions`, {
    method: 'PUT', body: JSON.stringify({ permissions }),
  });

// عرض بيانات دعوة مسؤول (عامّ — صفحة قبول الدعوة).
export const getAdminInvite = (token) =>
  request(`/admin/users/invites/${encodeURIComponent(token)}`);

// قبول دعوة المسؤول وإنشاء كلمة المرور (عامّ).
export const acceptAdminInvite = (token, password) =>
  request('/admin/users/invites/accept', { method: 'POST', body: JSON.stringify({ token, password }) });
