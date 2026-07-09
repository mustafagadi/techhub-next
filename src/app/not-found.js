import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export default function NotFound() {
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
        <div style={{ fontSize: '5rem', fontWeight: 800, color: '#0B1F3A', lineHeight: 1 }}>404</div>
        <h1 style={{ fontSize: '1.5rem', color: '#0B1F3A' }}>الصفحة غير موجودة</h1>
        <p style={{ color: '#5A6B82', maxWidth: '420px' }}>
          الصفحة التي تبحث عنها غير متاحة أو نُقلت. تحقّق من الرابط أو عُد للصفحة الرئيسية.
        </p>
        <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
          <Link href="/" className="btn btn-primary">العودة للرئيسية</Link>
          <Link href="/services" className="btn" style={{ border: '1px solid #E2E6EC' }}>تصفّح الخدمات</Link>
        </div>
      </div>
      <Footer />
    </>
  );
}
