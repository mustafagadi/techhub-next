'use client';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useI18n } from '@/lib/i18n';

export default function PrivacyPage() {
  const { t } = useI18n();
  return (
    <>
      <Header />
      <div className="container" style={{ padding: '48px 64px', maxWidth: '820px' }}>
        <h1>{t('privacy.title')}</h1>
        <p style={{ color: 'var(--muted)', marginBottom: '28px' }}>{t('privacy.updated_at')}</p>
        <p style={{ lineHeight: 1.9, marginBottom: '18px' }}>{t('privacy.intro')}</p>
        <p style={{ lineHeight: 1.9, marginBottom: '18px' }}>{t('privacy.body_1')}</p>
        <p style={{ lineHeight: 1.9, marginBottom: '18px' }}>{t('privacy.body_2')}</p>
        <p style={{ lineHeight: 1.9 }}>{t('privacy.contact')}</p>
      </div>
      <Footer />
    </>
  );
}
