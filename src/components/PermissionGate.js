'use client';
import { hasPermission } from '@/lib/api';
import { useI18n } from '@/lib/i18n';

// Blocks an entire admin page's content if the admin lacks a specific granular permission.
// Assumes the parent element is already covered by RequireAuth (login/role check) —
// this only checks the permission, with no redirect or "checking" state.
export default function PermissionGate({ permission, children }) {
  const { t } = useI18n();
  if (permission && !hasPermission(permission)) {
    return (
      <div style={{ padding: 60, textAlign: 'center' }}>
        <h2 style={{ marginBottom: 12 }}>{t('require_auth.denied_title')}</h2>
        <p style={{ color: '#5A6B82' }}>{t('require_auth.permission_denied_body')}</p>
      </div>
    );
  }
  return children;
}
