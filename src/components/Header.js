'use client';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getAuth, logout } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import EnvSwitcher from './EnvSwitcher';
import LangSwitcher from './LangSwitcher';
import styles from './Header.module.css';

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useI18n();
  const [auth, setAuthState] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const isHomePage = pathname === '/';

  useEffect(() => { setAuthState(getAuth()); }, []);
  // Automatically close the mobile menu when the route changes
  useEffect(() => { setMenuOpen(false); }, [pathname]);

  function handleLogout() {
    logout();
    setAuthState(null);
    router.push('/');
  }

  return (
    <header className={`${styles.header} ${isHomePage ? styles.onHome : ''}`}>
      <div className="container">
        <nav className={styles.nav}>
          <Link href="/" className={styles.logo}>
            <img src="/images/techhub-logo-full.webp" alt={t('common.brand')} className={styles.logoImg} />
          </Link>
          <div className={styles.links}>
            <Link href="/">{t('nav.home')}</Link>
            <Link href="/services">{t('nav.services')}</Link>
            {auth?.role === 'portal-admin' && <Link href="/admin">{t('nav.admin')}</Link>}
            {auth?.role === 'portal-partner' && <Link href="/partner">{t('nav.my_apps')}</Link>}
          </div>
          {auth ? (
            <div className={styles.userBox}>
              <a href="/#Contact" className={styles.contactBtn}>{t('nav.contact')}</a>
              <LangSwitcher />
              <EnvSwitcher />
              <span className={styles.userEmail}>{auth.email}</span>
              <button className="btn btn-ghost" onClick={handleLogout}>{t('nav.logout')}</button>
            </div>
          ) : (
            <div className={styles.userBox}>
              <a href="/#Contact" className={styles.contactBtn}>{t('nav.contact')}</a>
              <LangSwitcher />
              <Link href="/login" className="btn btn-primary">{t('nav.login')}</Link>
            </div>
          )}

          {/* Mobile menu button — shows only on small screens where .links and .userBox are hidden */}
          <button
            type="button"
            className={styles.menuBtn}
            onClick={() => setMenuOpen(true)}
            aria-label={t('nav.open_menu')}
            aria-expanded={menuOpen}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </nav>
      </div>

      {/* Mobile sliding side menu — mirrors the nav links and header buttons */}
      {menuOpen && (
        <div className={styles.menuOverlay} onClick={() => setMenuOpen(false)}>
          <div className={styles.menuDrawer} onClick={(e) => e.stopPropagation()}>
            <button type="button" className={styles.menuClose} onClick={() => setMenuOpen(false)} aria-label={t('common.close')}>×</button>
            <div className={styles.menuLinks}>
              <Link href="/">{t('nav.home')}</Link>
              <Link href="/services">{t('nav.services')}</Link>
              {auth?.role === 'portal-admin' && <Link href="/admin">{t('nav.admin')}</Link>}
              {auth?.role === 'portal-partner' && <Link href="/partner">{t('nav.my_apps')}</Link>}
            </div>
            <div className={styles.menuActions}>
              <a href="/#Contact" className={styles.contactBtn}>{t('nav.contact')}</a>
              <LangSwitcher />
              {auth ? (
                <button className="btn btn-ghost" onClick={handleLogout}>{t('nav.logout')}</button>
              ) : (
                <Link href="/login" className="btn btn-primary">{t('nav.login')}</Link>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
