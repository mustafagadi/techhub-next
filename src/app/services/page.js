'use client';
import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ServiceCard from '@/components/ServiceCard';
import { getProducts } from '@/lib/api';
import styles from './services.module.css';

// الكتالوج يعرض المنتجات (apiproducts) — وحدة الاشتراك في Apigee، لا البروكسيات.
export default function ServicesPage() {
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

  // الفئات الموجودة فعليًّا (من سمة category) — لا فئات وهمية
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

  return (
    <>
      <Header />
      <div className={styles.pageHead}>
        <div className="container">
          <h1>قائمة الخدمات</h1>
          <p>تصفّح الواجهات البرمجية المتاحة، واطّلع على توثيقها قبل الاشتراك.</p>
        </div>
      </div>

      <div className="container">
        <div className={styles.toolbar}>
          <div className={styles.search}>
            <input type="text" placeholder="ابحث عن خدمة..." value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <div className={styles.filters}>
            {[['all','الكل'],['free','المجانية'],['paid','المدفوعة']].map(([k,l]) => (
              <button key={k} className={`${styles.chip} ${filter===k ? styles.active : ''}`} onClick={() => setFilter(k)}>{l}</button>
            ))}
          </div>
        </div>

        {categories.length > 0 && (
          <div className={styles.catBar}>
            <button className={`${styles.catChip} ${catFilter==='all' ? styles.catActive : ''}`} onClick={() => setCatFilter('all')}>كل الفئات</button>
            {categories.map((c) => (
              <button key={c} className={`${styles.catChip} ${catFilter===c ? styles.catActive : ''}`} onClick={() => setCatFilter(c)}>{c}</button>
            ))}
          </div>
        )}

        <div className={styles.count}>{loading ? 'جارٍ التحميل…' : `${list.length.toLocaleString('ar-SA')} خدمة`}</div>
        {error ? (
          <div className={styles.errorBox}>
            تعذّر الاتصال بالخادم. تأكّد من تشغيل الخدمة، ثم أعد المحاولة.
          </div>
        ) : (
          <div className={styles.grid}>
            {list.map((p) => <ServiceCard key={p.name} service={p} />)}
            {!list.length && !loading && <div className={styles.empty}>لا توجد خدمات تطابق بحثك.</div>}
          </div>
        )}
      </div>
      <Footer />
    </>
  );
}
