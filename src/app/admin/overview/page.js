'use client';
import { useState, useEffect } from 'react';
import { getAllProducts, getAccessRequests, getInterestRequests } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import EnvSwitcher from '@/components/EnvSwitcher';
import styles from '../admin.module.css';

export default function OverviewPage() {
  const { t } = useI18n();
  const [services, setServices] = useState([]);
  const [access, setAccess] = useState([]);
  const [interest, setInterest] = useState([]);

  useEffect(() => {
    getAllProducts().then((d) => setServices(Array.isArray(d) ? d : [])).catch(() => {});
    getAccessRequests().then((d) => setAccess(Array.isArray(d) ? d : [])).catch(() => {});
    getInterestRequests().then((d) => setInterest(Array.isArray(d) ? d : [])).catch(() => {});
  }, []);

  return (
    <>
      <div className={styles.topbar}>
        <h1>{t('admin_nav.overview')}</h1>
        <EnvSwitcher />
      </div>
      <div className={styles.content}>
        <div className={styles.stats}>
          <div className={styles.stat}><div className={styles.v}>{services.length}</div><div className={styles.l}>{t('overview.total_services')}</div></div>
          <div className={styles.stat}><div className={styles.v}>{access.length}</div><div className={styles.l}>{t('overview.pending_access')}</div></div>
          <div className={styles.stat}><div className={styles.v}>{interest.length}</div><div className={styles.l}>{t('admin_nav.interest')}</div></div>
        </div>
      </div>
    </>
  );
}
