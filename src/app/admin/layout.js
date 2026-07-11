'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import RequireAuth from '@/components/RequireAuth';
import { getAuth, hasPermission } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import styles from './admin.module.css';

// أقسام لوحة التحكم ومساراتها. permission غائبة = مرئية لأي مسؤول.
// superAdminOnly = مرئية للمسؤول الفائق فقط، بصرف النظر عن الصلاحيات الفردية.
const NAV = [
  { href: '/admin/overview', labelKey: 'admin_nav.overview' },
  { href: '/admin/services', labelKey: 'nav.services' },
  { href: '/admin/docs', labelKey: 'admin_nav.docs', permission: 'docs.manage' },
  { href: '/admin/access', labelKey: 'admin_nav.access', permission: 'access.approve' },
  { href: '/admin/interest', labelKey: 'admin_nav.interest', permission: 'interest.manage' },
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
          <div className={styles.brand}><span className={styles.mark}>{t('admin_nav.brand_mark')}</span><span>{t('nav.admin')}</span></div>
          {visibleNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.navItem} ${pathname === item.href ? styles.active : ''}`}
            >
              {t(item.labelKey)}
            </Link>
          ))}
        </aside>
        <div className={styles.main}>
          {children}
        </div>
      </div>
    </RequireAuth>
  );
}
