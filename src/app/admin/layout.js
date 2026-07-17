'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import RequireAuth from '@/components/RequireAuth';
import { getAuth, hasPermission } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import styles from './admin.module.css';

// Dashboard sections and their routes. Missing permission = visible to any admin.
// superAdminOnly = visible to the super admin only, regardless of individual permissions.
const NAV = [
  { href: '/admin/overview', labelKey: 'admin_nav.overview' },
  { href: '/admin/services', labelKey: 'nav.services' },
  { href: '/admin/docs', labelKey: 'admin_nav.docs', permission: 'docs.manage' },
  { href: '/admin/access', labelKey: 'admin_nav.access', permission: 'access.approve' },
  { href: '/admin/interest', labelKey: 'admin_nav.interest', permission: 'interest.manage' },
  { href: '/admin/partner-signups', labelKey: 'admin_nav.partner_signups', permission: 'partnersignups.manage' },
  { href: '/admin/partner-compliance', labelKey: 'admin_nav.partner_compliance', permission: 'partnercompliance.manage' },
  { href: '/admin/promotions', labelKey: 'admin_nav.promotions', permission: 'promotions.approve' },
  { href: '/admin/users', labelKey: 'admin_nav.users', superAdminOnly: true },
];

export default function AdminLayout({ children }) {
  const pathname = usePathname();
  const { t } = useI18n();
  const auth = getAuth();
  const isSuperAdmin = auth?.role === 'portal-superadmin';
  const visibleNav = NAV.filter((item) => {
    if (item.superAdminOnly) return isSuperAdmin;
    if (item.permission) return hasPermission(item.permission);
    return true;
  });

  return (
    <RequireAuth role={['portal-admin', 'portal-superadmin']}>
      <div className={styles.shell}>
        <aside className={styles.sidebar}>
          <div className={styles.brand}>
            <img src="/images/techhub-logo-full.webp" alt={t('common.brand')} className={styles.brandLogo} />
            <span>{t('nav.admin')}</span>
          </div>
          {visibleNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.navItem} ${pathname === item.href ? styles.active : ''}`}
            >
              {t(item.labelKey)}
            </Link>
          ))}
          <div className={styles.sidebarFooter}>
            <Link href="/" className={styles.navItem}>
              {t('common.back_home')}
            </Link>
          </div>
        </aside>
        <div className={styles.main}>
          {children}
        </div>
      </div>
    </RequireAuth>
  );
}
