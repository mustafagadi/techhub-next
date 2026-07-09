'use client';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getAuth, logout } from '@/lib/api';
import EnvSwitcher from './EnvSwitcher';
import styles from './Header.module.css';

export default function Header() {
  const router = useRouter();
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
           {/* <span className={styles.mark}>T</span>*/}
            <span>TechHub Portal</span>
          </Link>
          <div className={styles.links}>
            <Link href="/">الرئيسية</Link>
            <Link href="/services">الخدمات</Link>
            {auth?.role === 'portal-admin' && <Link href="/admin">لوحة التحكم</Link>}
            {auth?.role === 'portal-partner' && <Link href="/partner">تطبيقاتي</Link>}
          {/*  <Link href="/#contact">تواصل معنا</Link>*/}
          </div>
          {auth ? (
            <div className={styles.userBox}>
              <EnvSwitcher />
              <span className={styles.userEmail}>{auth.email}</span>
              <button className="btn btn-ghost" onClick={handleLogout}>خروج</button>
            </div>
          ) : (
            <Link href="/login" className="btn btn-primary">تسجيل الدخول</Link>
          )}
        </nav>
      </div>
    </header>
  );
}
