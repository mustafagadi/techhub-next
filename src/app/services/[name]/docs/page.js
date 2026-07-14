'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import RedocViewer from '@/components/RedocViewer';
import SwaggerViewer from '@/components/SwaggerViewer';
import { getAuth } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import styles from './docs.module.css';
import '@/styles/swagger-theme.css';

// A full standalone documentation page — for logged-in users only. Shows Redoc or Swagger UI.
export default function ServiceDocs() {
  const { t } = useI18n();
  const params = useParams();
  const router = useRouter();
  const name = decodeURIComponent(params.name);
  const [viewer, setViewer] = useState('swagger'); // swagger | redoc
  const [authChecked, setAuthChecked] = useState(false);

  // Full documentation for logged-in users only — non-logged-in users are redirected to login
  useEffect(() => {
    if (!getAuth()?.token) {
      router.replace('/login');
    } else {
      setAuthChecked(true);
    }
  }, [router]);

  if (!authChecked) {
    return <div style={{ padding: 60, textAlign: 'center', color: '#5A6B82' }}>{t('require_auth.checking')}</div>;
  }

  return (
    <div className={styles.page}>
      <div className={styles.bar}>
        <Link href={`/services/${encodeURIComponent(name)}`} className={styles.back}>
          {t('service_docs.back_to_service')}
        </Link>
        <span className={styles.title}>{t('service_docs.full_docs_title', { name })}</span>
        <div className={styles.switch}>
          <button
            className={`${styles.switchBtn} ${viewer === 'swagger' ? styles.active : ''}`}
            onClick={() => setViewer('swagger')}
          >Swagger</button>
          <button
            className={`${styles.switchBtn} ${viewer === 'redoc' ? styles.active : ''}`}
            onClick={() => setViewer('redoc')}
          >Redoc</button>
        </div>
      </div>
      <div className={styles.viewer}>
        {viewer === 'swagger' ? <SwaggerViewer productName={name} /> : <RedocViewer productName={name} />}
      </div>
    </div>
  );
}
