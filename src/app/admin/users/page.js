'use client';
import { useState, useEffect, useCallback } from 'react';
import { getAdminUsers, inviteAdminUser, setAdminUserPermissions, getAuth } from '@/lib/api';
import RequireAuth from '@/components/RequireAuth';
import { useI18n } from '@/lib/i18n';
import styles from '../admin.module.css';

// الصلاحيات الدقيقة السبع — يجب أن تطابق PortalPermissions.All في الخلفية.
const PERMISSIONS = [
  { code: 'products.publish', labelKey: 'permissions.products_publish' },
  { code: 'products.pricing', labelKey: 'permissions.products_pricing' },
  { code: 'products.approval', labelKey: 'permissions.products_approval' },
  { code: 'docs.manage', labelKey: 'permissions.docs_manage' },
  { code: 'access.approve', labelKey: 'permissions.access_approve' },
  { code: 'interest.manage', labelKey: 'permissions.interest_manage' },
  { code: 'promotions.approve', labelKey: 'permissions.promotions_approve' },
];

export default function AdminUsersPage() {
  return (
    <RequireAuth role="portal-superadmin">
      <AdminUsersInner />
    </RequireAuth>
  );
}

function AdminUsersInner() {
  const { t } = useI18n();
  const myEmail = getAuth()?.email;
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editUser, setEditUser] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    getAdminUsers()
      .then((d) => setUsers(Array.isArray(d) ? d : []))
      .catch(() => setUsers([]))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  function notify(message, ok = true) {
    setToast({ message, ok });
    setTimeout(() => setToast(null), 3500);
  }

  return (
    <>
      <div className={styles.topbar}>
        <h1>{t('admin_nav.users')}</h1>
        <span className={styles.env}>{t('overview.env_prod')}</span>
      </div>

      <div className={styles.content}>
        <div className={styles.card}>
          <div className={styles.cardHead}>
            <span>{t('admin_users.title')}</span>
            <button className="btn btn-primary" onClick={() => setShowCreate(true)}>{t('admin_users.create_btn')}</button>
          </div>

          {loading ? (
            <div className={styles.empty}>{t('access.loading_requests')}</div>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>{t('admin_users.col_email')}</th>
                  <th>{t('admin_users.col_role')}</th>
                  <th>{t('admin_users.col_permissions')}</th>
                  <th>{t('access.col_action')}</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const isSuperAdmin = u.role === 'portal-superadmin';
                  const isSelf = u.email === myEmail;
                  return (
                    <tr key={u.id}>
                      <td>{u.email}</td>
                      <td>
                        <span className={isSuperAdmin ? styles.badgeOk : styles.badgeWait}>
                          {isSuperAdmin ? t('admin_users.role_superadmin') : t('admin_users.role_admin')}
                        </span>
                      </td>
                      <td>
                        {isSuperAdmin ? (
                          <span className={styles.muted}>{t('admin_users.full_access')}</span>
                        ) : u.permissions?.length ? (
                          <span className={styles.muted}>{u.permissions.length}</span>
                        ) : (
                          <span className={styles.muted}>—</span>
                        )}
                      </td>
                      <td>
                        {!isSuperAdmin && !isSelf && (
                          <button className={styles.priceBtn} onClick={() => setEditUser(u)}>
                            {t('admin_users.edit_permissions_btn')}
                          </button>
                        )}
                        {isSelf && <span className={styles.muted}>—</span>}
                      </td>
                    </tr>
                  );
                })}
                {!users.length && (
                  <tr><td colSpan="4" className={styles.empty}>{t('admin_users.empty')}</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showCreate && (
        <CreateAdminModal
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            notify(t('admin_users.create_success'));
            load();
          }}
          onError={(msg) => notify(msg, false)}
        />
      )}

      {editUser && (
        <EditPermissionsModal
          user={editUser}
          onClose={() => setEditUser(null)}
          onSaved={() => {
            setEditUser(null);
            notify(t('admin_users.save_success'));
            load();
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

function CreateAdminModal({ onClose, onCreated, onError }) {
  const { t } = useI18n();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('portal-admin');
  const [permissions, setPermissions] = useState([]);
  const [busy, setBusy] = useState(false);

  function togglePermission(code) {
    setPermissions((prev) => prev.includes(code) ? prev.filter((p) => p !== code) : [...prev, code]);
  }

  async function submit() {
    setBusy(true);
    try {
      await inviteAdminUser({ email, role, permissions: role === 'portal-admin' ? permissions : [] });
      onCreated();
    } catch (err) {
      onError(err.message || t('admin_users.create_failed'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h2>{t('admin_users.create_modal_title')}</h2>
        <p className={styles.modalNote}>{t('admin_users.invite_note')}</p>
        <label className={styles.label}>{t('admin_users.email_label')}
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} style={{ direction: 'ltr', textAlign: 'left' }} />
        </label>
        <label className={styles.label}>{t('admin_users.role_label')}
          <select value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="portal-admin">{t('admin_users.role_admin')}</option>
            <option value="portal-superadmin">{t('admin_users.role_superadmin')}</option>
          </select>
        </label>

        {role === 'portal-admin' && (
          <div className={styles.label}>
            {t('admin_users.permissions_label')}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
              {PERMISSIONS.map((p) => (
                <label key={p.code} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'normal', cursor: 'pointer' }}>
                  <input type="checkbox" checked={permissions.includes(p.code)} onChange={() => togglePermission(p.code)} />
                  <span>{t(p.labelKey)}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        <div className={styles.modalActions}>
          <button className="btn btn-primary" onClick={submit} disabled={busy || !email}>
            {busy ? t('admin_users.sending_invite') : t('admin_users.create_submit')}
          </button>
          <button className={styles.cancel} onClick={onClose}>{t('common.cancel')}</button>
        </div>
      </div>
    </div>
  );
}

function EditPermissionsModal({ user, onClose, onSaved, onError }) {
  const { t } = useI18n();
  const [permissions, setPermissions] = useState(user.permissions || []);
  const [busy, setBusy] = useState(false);

  function togglePermission(code) {
    setPermissions((prev) => prev.includes(code) ? prev.filter((p) => p !== code) : [...prev, code]);
  }

  async function submit() {
    setBusy(true);
    try {
      await setAdminUserPermissions(user.id, permissions);
      onSaved();
    } catch (err) {
      onError(err.message || t('admin_users.save_failed'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h2>{t('admin_users.edit_permissions_title')}</h2>
        <p className={styles.modalNote} style={{ direction: 'ltr', textAlign: 'left' }}>{user.email}</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
          {PERMISSIONS.map((p) => (
            <label key={p.code} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input type="checkbox" checked={permissions.includes(p.code)} onChange={() => togglePermission(p.code)} />
              <span>{t(p.labelKey)}</span>
            </label>
          ))}
        </div>
        <div className={styles.modalActions}>
          <button className="btn btn-primary" onClick={submit} disabled={busy}>
            {busy ? t('admin_services.saving') : t('admin_users.save_permissions')}
          </button>
          <button className={styles.cancel} onClick={onClose}>{t('common.cancel')}</button>
        </div>
      </div>
    </div>
  );
}
