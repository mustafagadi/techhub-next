'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import RedocViewer from '@/components/RedocViewer';
import SwaggerViewer from '@/components/SwaggerViewer';
import { getAuth } from '@/lib/api';
import styles from './docs.module.css';

// صفحة توثيق كاملة مستقلة — للمسجّلين فقط. تعرض Redoc أو Swagger UI.
export default function ServiceDocs() {
  const params = useParams();
  const router = useRouter();
  const name = decodeURIComponent(params.name);
  const [viewer, setViewer] = useState('swagger'); // swagger | redoc
  const [authChecked, setAuthChecked] = useState(false);

  // التوثيق الكامل للمسجّلين فقط — غير المسجّل يُوجّه للدخول
  useEffect(() => {
    if (!getAuth()?.token) {
      router.replace('/login');
    } else {
      setAuthChecked(true);
    }
  }, [router]);

  if (!authChecked) {
    return <div style={{ padding: 60, textAlign: 'center', color: '#5A6B82' }}>جارٍ التحقّق…</div>;
  }

  return (
    <div className={styles.page}>
      <div className={styles.bar}>
        <Link href={`/services/${encodeURIComponent(name)}`} className={styles.back}>
          ← العودة للخدمة
        </Link>
        <span className={styles.title}>التوثيق الكامل — {name}</span>
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
