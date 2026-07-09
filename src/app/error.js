'use client';
import { useEffect } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export default function Error({ error, reset }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <>
      <Header />
      <div style={{
        minHeight: '60vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '48px 24px',
        gap: '16px',
      }}>
        <div style={{ fontSize: '3.5rem', lineHeight: 1 }}>⚠️</div>
        <h1 style={{ fontSize: '1.5rem', color: '#0B1F3A' }}>حدث خطأ غير متوقّع</h1>
        <p style={{ color: '#5A6B82', maxWidth: '420px' }}>
          تعذّر عرض هذه الصفحة. حاول مجددًا، أو عُد للصفحة الرئيسية.
        </p>
        <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
          <button className="btn btn-primary" onClick={() => reset()}>إعادة المحاولة</button>
          <Link href="/" className="btn" style={{ border: '1px solid #E2E6EC' }}>العودة للرئيسية</Link>
        </div>
      </div>
      <Footer />
    </>
  );
}
