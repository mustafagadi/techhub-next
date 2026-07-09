'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import RequireAuth from '@/components/RequireAuth';
import styles from './admin.module.css';

// أقسام لوحة التحكم ومساراتها
const NAV = [
  { href: '/admin/overview', label: 'نظرة عامة' },
  { href: '/admin/services', label: 'الخدمات' },
  { href: '/admin/docs', label: 'التوثيق' },
  { href: '/admin/access', label: 'طلبات الاشتراك' },
  { href: '/admin/interest', label: 'طلبات الاهتمام' },
  { href: '/admin/promotions', label: 'طلبات الترقية للإنتاج' },
];

export default function AdminLayout({ children }) {
  const pathname = usePathname();
  return (
    <RequireAuth role="portal-admin">
      <div className={styles.shell}>
        <aside className={styles.sidebar}>
          <div className={styles.brand}><span className={styles.mark}>ب</span><span>لوحة التحكم</span></div>
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.navItem} ${pathname === item.href ? styles.active : ''}`}
            >
              {item.label}
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
