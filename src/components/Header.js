'use client';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getAuth, logout } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import EnvSwitcher from './EnvSwitcher';
import LangSwitcher from './LangSwitcher';
import styles from './Header.module.css';

export default function Header() {
  const router = useRouter();
  const { t } = useI18n();
  const [auth, setAuthState] = useState(null);

  useEffect(() => { setAuthState(getAuth()); }, []);

  function handleLogout() {
    logout();
    setAuthState(null);
    router.push('/');
  }

  return (
    <header className={styles.header}>
      <div className="container">
        <nav className={styles.nav}>
          <Link href="/" className={styles.logo}>
            <span>{t('common.brand')}</span>
          </Link>
          <div className={styles.links}>
            <Link href="/">{t('nav.home')}</Link>
            <Link href="/services">{t('nav.services')}</Link>
            {auth?.role === 'portal-admin' && <Link href="/admin">{t('nav.admin')}</Link>}
            {auth?.role === 'portal-partner' && <Link href="/partner">{t('nav.my_apps')}</Link>}
          </div>
          {auth ? (
            <div className={styles.userBox}>
              <LangSwitcher />
              <EnvSwitcher />
              <span className={styles.userEmail}>{auth.email}</span>
              <button className="btn btn-ghost" onClick={handleLogout}>{t('nav.logout')}</button>
            </div>
          ) : (
            <div className={styles.userBox}>
              <LangSwitcher />
              <Link href="/login" className="btn btn-primary">{t('nav.login')}</Link>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
