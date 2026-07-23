// Connection layer to the backend API (ApigeePortal.Api)
// All calls go through here, making it easy to change the base URL or add authentication later.

// In the browser: relative path /api (proxied via next.config.js).
// On the server (server components): needs a full URL, from API_BASE_SERVER.

// Fallback error message in the current UI language (used only if the server doesn't return one)
function fallbackError(status) {
  let locale = 'en';
  try { locale = localStorage.getItem('portal_locale') || 'en'; } catch {}
  return locale === 'ar' ? `خطأ ${status}` : `Error ${status}`;
}

function resolveBase() {
  if (typeof window === 'undefined') {
    // Server environment: full backend URL (define it in .env.local)
    return process.env.API_BASE_SERVER || 'http://localhost:5080/api';
  }
  // Browser environment: relative path that goes through the redirect/rewrite
  return process.env.NEXT_PUBLIC_API_BASE || '/api';
}

// The selected environment (prod/test) — sent in the X-Apigee-Environment header
// Stored in sessionStorage so it persists across page refreshes.
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

// This deployment only ever has exactly two environments (test/prod, two separate Apigee orgs) —
// used by the admin "sync to the other environment" actions to know their target without asking.
export function otherEnvironment() { return getEnvironment() === 'prod' ? 'test' : 'prod'; }

// ===== Authentication: storing and retrieving the login token =====
// Stored in memory + sessionStorage (persists across page refresh, cleared when the tab is closed).
const TOKEN_KEY = 'portal_auth';

export function setAuth(token, email, role, permissions = []) {
  if (typeof window === 'undefined') return;
  if (token) {
    sessionStorage.setItem(TOKEN_KEY, JSON.stringify({ token, email, role, permissions }));
    // middleware.js reads this cookie to gate /admin and /partner server-side before the page ships —
    // it only carries the role (not the token), so it doesn't need to be httpOnly.
    document.cookie = `portal_role=${role}; path=/; SameSite=Lax`;
  } else {
    sessionStorage.removeItem(TOKEN_KEY);
    document.cookie = 'portal_role=; path=/; Max-Age=0; SameSite=Lax';
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

// The super admin implicitly has all permissions — no need to store them individually.
export function hasPermission(code) {
  const auth = getAuth();
  if (!auth) return false;
  if (auth.role === 'portal-superadmin') return true;
  return Array.isArray(auth.permissions) && auth.permissions.includes(code);
}

// Builds request headers with the login token automatically injected (if present),
// merged over the given base headers. Single source for the Authorization header.
function authHeaders(base = {}) {
  const headers = { ...base };
  const auth = getAuth();
  if (auth?.token) headers['Authorization'] = `Bearer ${auth.token}`;
  return headers;
}

async function request(path, options = {}) {
  const headers = authHeaders({
    'Content-Type': 'application/json',
    'X-Apigee-Environment': currentEnv,
    ...(options.headers || {}),
  });

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

// ===== Login and logout =====
// 2-step login: step 1 validates credentials and emails an OTP code (no token yet); step 2 (verifyOtp)
// verifies the code and returns the token. Also used to resend a code (re-submit the same email+password).
export async function login(email, password) {
  // The backend returns { otpRequired, email }
  return request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function verifyOtp(email, code) {
  const res = await request('/auth/verify-otp', {
    method: 'POST',
    body: JSON.stringify({ email, code }),
  });
  // The backend returns { token, email, role, permissions }
  setAuth(res.token, res.email, res.role, res.permissions || []);
  return res;
}

export const forgotPassword = (email) =>
  request('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) });

export const resetPassword = (email, token, newPassword) =>
  request('/auth/reset-password', { method: 'POST', body: JSON.stringify({ email, token, newPassword }) });

// ===== Public catalog =====
export const getProducts = () => request('/products');

// [Approach B] List of proxies for the catalog with subscribability status
export const getProxies = async () => {
  const res = await request('/products/proxies');
  if (Array.isArray(res)) return res;
  return res?.proxies || [];
};

// [Approach B] Operations of a single proxy directly (from its bundle in Apigee)
export const getProxyOperations = (proxyName) =>
  request(`/products/proxy/${encodeURIComponent(proxyName)}/operations`);

// [Approach B] OpenAPI spec generated from a proxy (for full documentation and schemas)
export const getProxySpec = (proxyName) =>
  request(`/products/proxy/${encodeURIComponent(proxyName)}/generated-spec`);

export const getProduct = (name) => request(`/products/${encodeURIComponent(name)}`);
export const getProductSpec = (name) => request(`/products/${encodeURIComponent(name)}/spec`);
export const getProductOperations = (name) => request(`/products/${encodeURIComponent(name)}/operations`);

// ===== File uploads (multipart) =====
// Separate function from request: doesn't set Content-Type (the browser sets it with the boundary), but keeps authentication.
async function uploadFile(path, file, method = 'PUT') {
  const form = new FormData();
  form.append('file', file);

  const headers = authHeaders({ 'X-Apigee-Environment': currentEnv });

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

// Upload a Postman file and convert it to a spec
export const importPostman = (name, file) =>
  uploadFile(`/admin/products/${encodeURIComponent(name)}/import-postman`, file, 'PUT');

// Upload a documentation file (PDF/Word) for a service — from the admin panel.
export const uploadDocFile = (name, file) =>
  uploadFile(`/admin/products/${encodeURIComponent(name)}/doc-file`, file, 'PUT');

// Documentation files uploaded for a service — { files: [{ fileId, fileName, contentType }, ...] }
export const getDocFiles = (name) =>
  request(`/products/${encodeURIComponent(name)}/doc-files`);

// Direct download link for one uploaded documentation file (the browser opens it for download).
export const docFileUrl = (name, fileId) =>
  `${resolveBase()}/products/${encodeURIComponent(name)}/doc-files/${encodeURIComponent(fileId)}`;

// Upload a ready-made OpenAPI file
export const uploadSpec = (name, file) =>
  uploadFile(`/admin/products/${encodeURIComponent(name)}/spec`, file, 'PUT');

// Generate a spec from the proxy
export const generateSpec = (name) =>
  request(`/admin/products/${encodeURIComponent(name)}/generate-spec`, { method: 'POST' });

// ===== Interest registration (public) =====
export const submitInterest = (data) =>
  request('/interest', { method: 'POST', body: JSON.stringify(data) });

// ===== Partners =====
// Partner access-provisioning operations are always directed to the test (stage) environment first.
// Promotion to production happens later with admin approval (per-service).
const STAGE = { headers: { 'X-Apigee-Environment': 'test' } };

export const registerPartner = (data) =>
  request('/partners/register', { method: 'POST', body: JSON.stringify(data), ...STAGE });
export const createApp = (data) =>
  request('/partners/apps', { method: 'POST', body: JSON.stringify(data), ...STAGE });

// Adds a service to the partner's existing app under the same key (one key for all services).
// appName is optional — if omitted, the partner's first app is used.
// Adds a service to the partner's existing app under the same key, or creates a new app if createNew=true.
// Directed to the stage environment (initial access is always test).
export const addService = (productName, appName = null, createNew = false) =>
  request('/partners/apps/add-service', {
    method: 'POST',
    body: JSON.stringify({ productName, appName, createNew }),
    ...STAGE,
  });

// Partner's personal profile (saved locally, used during registration)
const PROFILE_KEY = 'portal_profile';
export function saveProfile(profile) {
  try { sessionStorage.setItem(PROFILE_KEY, JSON.stringify(profile)); } catch {}
}
export function getProfile() {
  try { return JSON.parse(sessionStorage.getItem(PROFILE_KEY) || 'null'); } catch { return null; }
}

// Ensures the partner is registered in Apigee before creating an app.
// If already registered (409), ignores the error and continues. The email comes from the backend token.
// Blank fields are sent as-is: the backend fills the company from the portal's own signup record
// (AspNetUsers.CompanyName) and derives names from the email — no client-side placeholder values,
// which used to permanently register partners as "Portal Partner / Partner".
export async function ensureRegistered(profile = {}) {
  const saved = getProfile() || {};
  try {
    await registerPartner({
      firstName: profile.firstName || saved.firstName || '',
      lastName: profile.lastName || saved.lastName || '',
      companyName: profile.companyName || saved.companyName || '',
    });
  } catch (err) {
    // 409 = already registered → not an error, continue
    if (err.status !== 409) throw err;
  }
}

// Fetch the current partner's apps from the stage environment (email from the saved login token)
export const getMyApps = async () => {
  const auth = getAuth();
  if (!auth?.email) return [];
  const res = await request(`/partners/${encodeURIComponent(auth.email)}/apps`, { ...STAGE });
  if (Array.isArray(res)) return res;
  return res?.apps || res?.app || [];
};

// Partner's apps in the production environment — appear after at least one service is promoted
// (same endpoint, but with the production environment header instead of test).
const PROD = { headers: { 'X-Apigee-Environment': 'prod' } };
export const getMyProdApps = async () => {
  const auth = getAuth();
  if (!auth?.email) return [];
  const res = await request(`/partners/${encodeURIComponent(auth.email)}/apps`, { ...PROD }).catch(() => null);
  if (Array.isArray(res)) return res;
  return res?.apps || res?.app || [];
};

// Fetch a specific app from the stage environment
export const getApp = (appName) => {
  const auth = getAuth();
  return request(`/partners/${encodeURIComponent(auth.email)}/apps/${encodeURIComponent(appName)}`, { ...STAGE });
};

// Current-month gateway usage per subscribed product (from Apigee analytics), with quota limits where
// configured. Returns [{ productName, used, quotaLimit, quotaInterval, quotaTimeUnit, quotaDescription }].
export const getMyUsage = () => request('/partners/usage', { ...STAGE });

// Daily per-product call series for the partner dashboard sparklines (empty when analytics are down)
export const getMyDailyUsage = (days = 30) => request(`/partners/usage/daily?days=${days}`, { ...STAGE });

// ===== Admin dashboard =====
export const getDashboardSummary = () => request('/admin/dashboard/summary');
export const getDashboardTraffic = (days = 30) => request(`/admin/dashboard/traffic?days=${days}`);

// Developer profile as registered in Apigee (stage environment) → { registered, firstName, lastName, company }
export const getDeveloperProfile = async () => {
  const auth = getAuth();
  if (!auth?.email) return null;
  try {
    return await request(`/partners/${encodeURIComponent(auth.email)}/profile`, { ...STAGE });
  } catch { return null; }
};

// ===== Promoting services from stage to production =====
// The partner requests promotion of a service (provided it exists in stage).
export const requestPromotion = (productName) =>
  request('/promotions', { method: 'POST', body: JSON.stringify({ productName }) });

// Current partner's requests → { requests: [...] }
export const getMyPromotions = () => request('/promotions/mine');

// All requests (for admin) → { total, requests: [...] }
export const getAllPromotions = (status) =>
  request(`/promotions${status ? `?status=${encodeURIComponent(status)}` : ''}`);

// Admin: approve / reject
export const approvePromotion = (id, note = '') =>
  request(`/promotions/${encodeURIComponent(id)}/approve`, {
    method: 'POST', body: JSON.stringify({ note }),
  });

export const rejectPromotion = (id, note = '') =>
  request(`/promotions/${encodeURIComponent(id)}/reject`, {
    method: 'POST', body: JSON.stringify({ note }),
  });

// ===== Payment =====
export const startPurchase = (data) =>
  request('/payments/purchase', { method: 'POST', body: JSON.stringify(data) });
export const getMyOrders = () => request('/payments/my-orders');

// ===== Admin =====
export const getAllProducts = async () => {
  const res = await request('/products/all');
  // The backend returns { total, products } — we extract the array
  if (Array.isArray(res)) return res;
  return res?.products || [];
};
export const setPricing = (name, data) =>
  request(`/admin/products/${encodeURIComponent(name)}/pricing`, { method: 'PUT', body: JSON.stringify(data) });
// data: { price, billingType, quotaLimit? }

// Admin: all proxies available in Apigee (unfiltered) — for selection when creating a new service
export const getAdminProxies = async () => {
  const res = await request('/admin/products/proxies');
  if (Array.isArray(res)) return res;
  return res?.proxies || [];
};

// Create a service with one or more pricing tiers in one go (the same form covers both simple and tiered services)
// data: { name, displayName, description, approvalType, environments: string[], apiProxies: string[],
//         tiers: [{ slug, label, price, billingType, quotaLimit, isDefault, sortOrder }] }
export const createTieredProduct = (data) =>
  request('/admin/products/tiered', { method: 'POST', body: JSON.stringify(data) });

// Reads a service with its tiers (or a single implicit tier if it isn't grouped)
export const getProductTiers = (name) => request(`/admin/products/${encodeURIComponent(name)}/tiers`);

// Updates a service's editable metadata: { displayName, description, environments: string[], apiProxies: string[] }
export const updateProductMetadata = (name, data) =>
  request(`/admin/products/${encodeURIComponent(name)}/metadata`, { method: 'PUT', body: JSON.stringify(data) });

// Adds a tier to an existing service (retroactively groups it if it isn't grouped yet)
export const addTier = (serviceName, data) =>
  request(`/admin/products/${encodeURIComponent(serviceName)}/tiers`, { method: 'POST', body: JSON.stringify(data) });

export const removeTier = async (groupName, tierSlug) =>
  request(`/admin/products/${encodeURIComponent(groupName)}/tiers/${encodeURIComponent(tierSlug)}`, { method: 'DELETE' });

export const renameTier = async (groupName, tierSlug, label) =>
  request(`/admin/products/${encodeURIComponent(groupName)}/tiers/${encodeURIComponent(tierSlug)}/label`, {
    method: 'PUT', body: JSON.stringify({ label }),
  });

export const setDefaultTier = async (groupName, tierSlug) =>
  request(`/admin/products/${encodeURIComponent(groupName)}/tiers/${encodeURIComponent(tierSlug)}/default`, { method: 'PUT' });

// Replicates a service (and all its tiers) into the other Apigee environment/org. Idempotent — safe to call
// again on an already-synced service.
export const replicateProduct = (name, targetEnvironment) =>
  request(`/admin/products/${encodeURIComponent(name)}/replicate`, {
    method: 'POST', body: JSON.stringify({ targetEnvironment }),
  });

export const publishProduct = (name) =>
  request(`/admin/products/${encodeURIComponent(name)}/publish`, { method: 'POST' });
export const unpublishProduct = (name) =>
  request(`/admin/products/${encodeURIComponent(name)}/unpublish`, { method: 'POST' });

// Curated catalog highlight (star badge on the public card)
export const setProductFeatured = (name, featured) =>
  request(`/admin/products/${encodeURIComponent(name)}/featured`, {
    method: 'PUT', body: JSON.stringify({ featured }),
  });

// Set the approval type: 'manual' (awaits approval) or 'auto' (automatic)
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

// Invite a partner (Identity) by the admin, usually after approving an interest request.
// Sends an invite email, and the partner creates their password via the link.
export const createPartnerAccount = (data) =>
  request('/admin/partner-invites', { method: 'POST', body: JSON.stringify(data) });

// Display invite data (public — invite acceptance page).
export const getInvite = (token) =>
  request(`/invites/${encodeURIComponent(token)}`);

// Accept the invite and create the password (public).
// Accept the invite: password + the same 3 required documents as self-signup (multipart).
// files: { cr, vat, authLetter } (File objects). The account then awaits admin document review.
export async function acceptInvite(token, password, files) {
  const form = new FormData();
  form.append('token', token);
  form.append('password', password);
  form.append('crDocument', files.cr);
  form.append('vatDocument', files.vat);
  form.append('authLetterDocument', files.authLetter);

  const res = await fetch(`${resolveBase()}/invites/accept`, { method: 'POST', body: form });
  if (!res.ok) {
    let message = fallbackError(res.status);
    try { const body = await res.json(); message = body.message || message; } catch {}
    const err = new Error(message);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

// ===== Health and environments =====
export const getEnvironments = () => request('/health/environments');
export const getApigeeHealth = () => request('/health/apigee');

// ===== Managing admin accounts and their permissions (portal-superadmin only) =====
export const getAdminUsers = async () => {
  const res = await request('/admin/users');
  if (Array.isArray(res)) return res;
  return res?.users || [];
};
// Sends an email invite to a new admin (email/role/permissions) — no password here, the invitee chooses it themselves
export const inviteAdminUser = (data) =>
  request('/admin/users', { method: 'POST', body: JSON.stringify(data) });
// The backend is the single source of truth for which permissions exist (PortalPermissions.All)
export const getPermissionCatalog = () =>
  request('/admin/users/permissions').then((r) => r?.permissions || []);
export const setAdminUserPermissions = (userId, permissions) =>
  request(`/admin/users/${encodeURIComponent(userId)}/permissions`, {
    method: 'PUT', body: JSON.stringify({ permissions }),
  });

// Display admin invite data (public — invite acceptance page).
export const getAdminInvite = (token) =>
  request(`/admin/users/invites/${encodeURIComponent(token)}`);

// Accept the admin invite and create the password (public).
export const acceptAdminInvite = (token, password) =>
  request('/admin/users/invites/accept', { method: 'POST', body: JSON.stringify({ token, password }) });

// ===== Self-service partner signup =====
// Submits the signup wizard in one multipart request: text fields + the 3 required documents.
// fields: { fullName, email, companyName, password }; files: { cr, vat, authLetter } (File objects).
export async function submitSignup(fields, files) {
  const form = new FormData();
  form.append('fullName', fields.fullName);
  form.append('email', fields.email);
  form.append('companyName', fields.companyName);
  form.append('password', fields.password);
  form.append('crDocument', files.cr);
  form.append('vatDocument', files.vat);
  form.append('authLetterDocument', files.authLetter);

  const res = await fetch(`${resolveBase()}/signup`, { method: 'POST', body: form });
  if (!res.ok) {
    let message = fallbackError(res.status);
    try { const body = await res.json(); message = body.message || message; } catch {}
    const err = new Error(message);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

export const verifyEmail = (email, token) =>
  request('/signup/verify-email', { method: 'POST', body: JSON.stringify({ email, token }) });

export const resendVerification = (email) =>
  request('/signup/resend-verification', { method: 'POST', body: JSON.stringify({ email }) });

// ===== Admin: partner signup review queue =====
export const getPartnerSignups = async (status) => {
  const res = await request(`/admin/partner-signups${status ? `?status=${encodeURIComponent(status)}` : ''}`);
  if (Array.isArray(res)) return res;
  return res?.requests || [];
};
export const approvePartnerSignup = (id) =>
  request(`/admin/partner-signups/${encodeURIComponent(id)}/approve`, { method: 'POST' });
export const rejectPartnerSignup = (id, note = '') =>
  request(`/admin/partner-signups/${encodeURIComponent(id)}/reject`, { method: 'POST', body: JSON.stringify({ note }) });

// Downloads one of the 3 uploaded documents (docType: cr | vat | authLetter). The endpoint is admin-only
// (Bearer token), so a plain <a href> can't carry auth — fetch it and trigger the browser download manually.
export async function downloadPartnerSignupDocument(id, docType) {
  const headers = authHeaders();

  const res = await fetch(`${resolveBase()}/admin/partner-signups/${encodeURIComponent(id)}/documents/${encodeURIComponent(docType)}`, { headers });
  if (!res.ok) throw new Error(fallbackError(res.status));

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = '';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ===== Partner compliance gate (post-approval: NDA/MOU, cybersecurity, server authorization) =====
// Authenticated multipart POST — like fetch() via request(), but Content-Type is left for the browser
// to set (with the multipart boundary) since we're sending a FormData body.
async function requestForm(path, form) {
  const headers = authHeaders({ 'X-Apigee-Environment': currentEnv });

  const res = await fetch(`${resolveBase()}${path}`, { method: 'POST', body: form, headers });
  if (!res.ok) {
    let message = fallbackError(res.status);
    try { const body = await res.json(); message = body.message || message; } catch {}
    const err = new Error(message);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

export const getComplianceStatus = () => request('/partner-compliance');

// files: { nda, mou } (File objects)
export const submitNdaMou = (files) => {
  const form = new FormData();
  form.append('ndaDocument', files.nda);
  form.append('mouDocument', files.mou);
  return requestForm('/partner-compliance/nda-mou', form);
};

// fields: the 8 cybersecurity fields; file: the signed document (File object)
export const submitCybersecurity = (fields, file) => {
  const form = new FormData();
  Object.entries(fields).forEach(([key, value]) => form.append(key, value));
  form.append('document', file);
  return requestForm('/partner-compliance/cybersecurity', form);
};

// ===== Admin: partner compliance review queue =====
export const getPartnerComplianceList = async () => {
  const res = await request('/admin/partner-compliance');
  if (Array.isArray(res)) return res;
  return res?.requests || [];
};
export const approveNdaMou = (userId) =>
  request(`/admin/partner-compliance/${encodeURIComponent(userId)}/approve-nda-mou`, { method: 'POST' });
export const approveCybersecurity = (userId) =>
  request(`/admin/partner-compliance/${encodeURIComponent(userId)}/approve-cybersecurity`, { method: 'POST' });
export const markServerAuthorized = (userId, ticketNumber = '') =>
  request(`/admin/partner-compliance/${encodeURIComponent(userId)}/mark-server-authorized`, {
    method: 'POST', body: JSON.stringify({ ticketNumber }),
  });
// Admin correction of the partner-submitted cybersecurity fields (does not touch approval status).
export const updateCybersecurityFields = (userId, fields) =>
  request(`/admin/partner-compliance/${encodeURIComponent(userId)}/cybersecurity-fields`, {
    method: 'PUT', body: JSON.stringify(fields),
  });

// Downloads one of the compliance documents (docType: nda | mou | cybersecurity) — same
// fetch-then-trigger-download pattern as downloadPartnerSignupDocument (auth needs a real header, not a URL).
export async function downloadComplianceDocument(userId, docType) {
  const headers = authHeaders();

  const res = await fetch(`${resolveBase()}/admin/partner-compliance/${encodeURIComponent(userId)}/documents/${encodeURIComponent(docType)}`, { headers });
  if (!res.ok) throw new Error(fallbackError(res.status));

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = '';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ===== Admin: combined read-only partner overview (signup + compliance) =====
// Visible to an admin holding EITHER partnersignups.manage OR partnercompliance.manage — see
// AdminPartnerOverviewController. Carries no actions of its own; approve/reject/mark-complete still
// only happen from the respective review-queue pages.
export const getPartnerOverview = (userId) =>
  request(`/admin/partners/${encodeURIComponent(userId)}/overview`);

// ===== Admin: partner account deactivation =====
// Deactivating blocks the partner's login but keeps their signup/compliance history intact — see
// AdminPartnersController. There's no delete endpoint by design; the backend's foreign keys refuse to
// allow it while those records exist.
export const deactivatePartner = (userId) =>
  request(`/admin/partners/${encodeURIComponent(userId)}/deactivate`, { method: 'POST' });
export const reactivatePartner = (userId) =>
  request(`/admin/partners/${encodeURIComponent(userId)}/reactivate`, { method: 'POST' });
