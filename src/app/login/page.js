'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { login } from '@/lib/api';
import styles from './login.module.css';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await login(email, password);
      // توجيه حسب الدور
      if (res.role === 'portal-admin') router.push('/admin');
      else if (res.role === 'portal-partner') router.push('/partner');
      else router.push('/');
    } catch (err) {
      setError(err.message || 'فشل تسجيل الدخول.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <Link href="/" className={styles.logo}>
          <span className={styles.mark}>ب</span>
          <span>TechHub Portal</span>
        </Link>
        <h1>تسجيل الدخول</h1>
        <p className={styles.sub}>ادخل بياناتك للوصول إلى حسابك.</p>

        <form onSubmit={handleSubmit}>
          <label className={styles.label}>
            البريد الإلكتروني
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoComplete="email"
            />
          </label>
          <label className={styles.label}>
            كلمة المرور
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />
          </label>

          {error && <div className={styles.error}>{error}</div>}

          <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
            {loading ? 'جارٍ الدخول…' : 'دخول'}
          </button>
        </form>

        <Link href="/" className={styles.back}>← العودة للرئيسية</Link>
      </div>
    </div>
  );
}
