'use client';
import { useEffect } from 'react';

// يُستخدم فقط حين يفشل RootLayout نفسه — يستبدل <html> كاملًا، لذا لا يعتمد على أي مكوّن آخر من التطبيق.
export default function GlobalError({ error, reset }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="ar" dir="rtl">
      <body>
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: '48px 24px',
          gap: '16px',
          fontFamily: 'sans-serif',
        }}>
          <div style={{ fontSize: '3.5rem', lineHeight: 1 }}>⚠️</div>
          <h1 style={{ fontSize: '1.5rem', color: '#0B1F3A' }}>حدث خطأ غير متوقّع</h1>
          <p style={{ color: '#5A6B82', maxWidth: '420px' }}>
            تعذّر تحميل المنصّة. حاول تحديث الصفحة.
          </p>
          <button
            onClick={() => reset()}
            style={{ padding: '11px 22px', borderRadius: 10, border: 'none', background: '#0B1F3A', color: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}
          >
            إعادة المحاولة
          </button>
        </div>
      </body>
    </html>
  );
}
