'use client';
import { hasPermission } from '@/lib/api';
import { useI18n } from '@/lib/i18n';

// يحجب محتوى صفحة إدارية بالكامل إن نقصت المسؤول صلاحية دقيقة محدّدة.
// يفترض أن العنصر الأب مغطّى مسبقًا بـ RequireAuth (تحقّق الدخول/الدور) —
// هنا فقط تحقّق الصلاحية، بلا إعادة توجيه أو حالة "جارٍ التحقّق".
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
