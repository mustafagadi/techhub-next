'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getAuth, hasPermission } from '@/lib/api';
import { useI18n } from '@/lib/i18n';

// يحرس صفحة: يتحقق من وجود رمز دخول، ثم الدور المطلوب (نص أو مصفوفة أدوار)، ثم صلاحية دقيقة اختيارية.
// إن لم يكن مسجّلًا → يوجّه لـ /login.
// إن لم يطابق الدور، أو نقصت الصلاحية → يعرض رسالة منع.
export default function RequireAuth({ role, permission, children }) {
  const { t } = useI18n();
  const router = useRouter();
  const [state, setState] = useState('checking'); // checking | ok | denied | denied_permission

  useEffect(() => {
    const auth = getAuth();
    if (!auth?.token) {
      router.replace('/login');
      return;
    }
    const roleOk = !role || (Array.isArray(role) ? role.includes(auth.role) : auth.role === role);
    if (!roleOk) {
      setState('denied');
      return;
    }
    if (permission && !hasPermission(permission)) {
      setState('denied_permission');
      return;
    }
    setState('ok');
  }, [role, permission, router]);

  if (state === 'checking') {
    return <div style={{ padding: 60, textAlign: 'center', color: '#5A6B82' }}>{t('require_auth.checking')}</div>;
  }
  if (state === 'denied' || state === 'denied_permission') {
    return (
      <div style={{ padding: 60, textAlign: 'center' }}>
        <h2 style={{ marginBottom: 12 }}>{t('require_auth.denied_title')}</h2>
        <p style={{ color: '#5A6B82' }}>
          {t(state === 'denied_permission' ? 'require_auth.permission_denied_body' : 'require_auth.denied_body')}
        </p>
      </div>
    );
  }
  return children;
}
