'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getAuth } from '@/lib/api';

// يحرس صفحة: يتحقق من وجود رمز دخول والدور المطلوب قبل العرض.
// إن لم يكن مسجّلًا → يوجّه لـ /login.
// إن لم يكن دوره مطابقًا → يعرض رسالة منع.
export default function RequireAuth({ role, children }) {
  const router = useRouter();
  const [state, setState] = useState('checking'); // checking | ok | denied

  useEffect(() => {
    const auth = getAuth();
    if (!auth?.token) {
      router.replace('/login');
      return;
    }
    if (role && auth.role !== role) {
      setState('denied');
      return;
    }
    setState('ok');
  }, [role, router]);

  if (state === 'checking') {
    return <div style={{ padding: 60, textAlign: 'center', color: '#5A6B82' }}>جارٍ التحقّق…</div>;
  }
  if (state === 'denied') {
    return (
      <div style={{ padding: 60, textAlign: 'center' }}>
        <h2 style={{ marginBottom: 12 }}>لا تملك صلاحية الوصول</h2>
        <p style={{ color: '#5A6B82' }}>هذه الصفحة مخصّصة للمسؤولين فقط.</p>
      </div>
    );
  }
  return children;
}
