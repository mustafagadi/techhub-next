'use client';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useI18n } from '@/lib/i18n';

export default function TermsPage() {
  const { t } = useI18n();
  return (
    <>
      <Header />
      <div className="container" style={{ padding: '48px 64px', maxWidth: '820px' }}>
        <h1>{t('terms.title')}</h1>
        <p style={{ color: 'var(--muted)', marginBottom: '28px' }}>{t('terms.updated_at')}</p>
        <p style={{ lineHeight: 1.9, marginBottom: '18px' }}>{t('terms.intro')}</p>
        <p style={{ lineHeight: 1.9, marginBottom: '18px' }}>{t('terms.body_1')}</p>
        <p style={{ lineHeight: 1.9, marginBottom: '18px' }}>{t('terms.body_2')}</p>
        <p style={{ lineHeight: 1.9 }}>{t('terms.contact')}</p>
      </div>
      <Footer />
    </>
  );
}
