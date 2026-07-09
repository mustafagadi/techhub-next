'use client';
import { useState, useEffect } from 'react';
import { getAllProducts, getAccessRequests, getInterestRequests } from '@/lib/api';
import styles from '../admin.module.css';

export default function OverviewPage() {
  const [services, setServices] = useState([]);
  const [access, setAccess] = useState([]);
  const [interest, setInterest] = useState([]);
  const [error, setError] = useState(false);

  useEffect(() => {
    getAllProducts().then((d) => setServices(Array.isArray(d) ? d : [])).catch(() => setError(true));
    getAccessRequests().then((d) => setAccess(Array.isArray(d) ? d : [])).catch(() => setError(true));
    getInterestRequests().then((d) => setInterest(Array.isArray(d) ? d : [])).catch(() => setError(true));
  }, []);

  return (
    <>
      <div className={styles.topbar}>
        <h1>نظرة عامة</h1>
        <span className={styles.env}>● بيئة prod</span>
      </div>
      <div className={styles.content}>
        {error && <div className={styles.error}>تعذّر تحميل بعض البيانات. أعد تحميل الصفحة للمحاولة مجددًا.</div>}
        <div className={styles.stats}>
          <div className={styles.stat}><div className={styles.v}>{services.length}</div><div className={styles.l}>إجمالي الخدمات</div></div>
          <div className={styles.stat}><div className={styles.v}>{access.length}</div><div className={styles.l}>طلبات إتاحة معلّقة</div></div>
          <div className={styles.stat}><div className={styles.v}>{interest.length}</div><div className={styles.l}>طلبات اهتمام</div></div>
        </div>
      </div>
    </>
  );
}
