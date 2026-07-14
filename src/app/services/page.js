'use client';
import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ServiceCard from '@/components/ServiceCard';
import { getProducts } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import styles from './services.module.css';

// The catalog displays products (apiproducts) — the subscription unit in Apigee, not proxies.
export default function ServicesPage() {
  const { t, locale } = useI18n();
  const [products, setProducts] = useState([]);
  const [filter, setFilter] = useState('all');
  const [catFilter, setCatFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    getProducts()
      .then((data) => { if (Array.isArray(data)) setProducts(data); })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  // Categories that actually exist (from the category attribute) — no mock categories
  const categories = [...new Set(products.map((p) => p.category).filter(Boolean))];

  const list = products.filter((p) => {
    const isFree = !p.price || Number(p.price) === 0;
    const matchF =
      filter === 'all' ||
      (filter === 'free' && isFree) ||
      (filter === 'paid' && !isFree);
    const matchCat = catFilter === 'all' || p.category === catFilter;
    const title = (p.displayName || p.name || '').toLowerCase();
    const matchQ = !query || title.includes(query.toLowerCase());
    return matchF && matchCat && matchQ;
  });

  const numLocale = locale === 'ar' ? 'ar-SA' : 'en-US';

  const FILTERS = [
    ['all', t('catalog.filter_all')],
    ['free', t('catalog.filter_free')],
    ['paid', t('catalog.filter_paid')],
  ];

  return (
    <>
      <Header />
      <div className={styles.pageHead}>
        <div className="container">
          <div className={styles.breadcrumb}>
            <a href="/">{t('nav.home')}</a> › <span>{t('nav.services')}</span>
          </div>
          <h1>{t('catalog.title')}</h1>
          <p>{t('catalog.subtitle')}</p>
        </div>
      </div>

      <div className="container">
        <div className={styles.toolbar}>
          <div className={styles.search}>
            <input
              type="text"
              placeholder={t('catalog.search_placeholder')}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className={styles.filters}>
            {FILTERS.map(([k, l]) => (
              <button
                key={k}
                className={`${styles.chip} ${filter === k ? styles.active : ''}`}
                onClick={() => setFilter(k)}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        {categories.length > 0 && (
          <div className={styles.catBar}>
            <button
              className={`${styles.catChip} ${catFilter === 'all' ? styles.catActive : ''}`}
              onClick={() => setCatFilter('all')}
            >
              {t('catalog.all_categories')}
            </button>
            {categories.map((c) => (
              <button
                key={c}
                className={`${styles.catChip} ${catFilter === c ? styles.catActive : ''}`}
                onClick={() => setCatFilter(c)}
              >
                {c}
              </button>
            ))}
          </div>
        )}

        <div className={styles.count}>
          {loading
            ? t('common.loading')
            : t('catalog.count', { count: list.length.toLocaleString(numLocale) })}
        </div>

        {error ? (
          <div className={styles.errorBox}>{t('catalog.error')}</div>
        ) : (
          <div className={styles.grid}>
            {list.map((p) => <ServiceCard key={p.name} service={p} />)}
            {!list.length && !loading && (
              <div className={styles.empty}>{t('catalog.empty')}</div>
            )}
          </div>
        )}
      </div>
      <Footer />
    </>
  );
}
