'use client';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useI18n } from '@/lib/i18n';

export default function NotFound() {
  const { t } = useI18n();
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
        <h1 style={{ fontSize: '1.5rem', color: '#0B1F3A' }}>{t('not_found.title')}</h1>
        <p style={{ color: '#5A6B82', maxWidth: '420px' }}>
          {t('not_found.body')}
        </p>
        <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
          <Link href="/" className="btn btn-primary">{t('accept_invite.back_home_btn')}</Link>
          <Link href="/services" className="btn" style={{ border: '1px solid #E2E6EC' }}>{t('not_found.browse_services')}</Link>
        </div>
      </div>
      <Footer />
    </>
  );
}
