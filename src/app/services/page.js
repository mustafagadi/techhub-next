'use client';
import { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { getProducts } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import styles from './services.module.css';

const PAGE_SIZE = 12;
// How long a service keeps the "جديد" (new) badge after being published to the catalog.
const NEW_BADGE_DAYS = 30;

function isRecentlyPublished(publishedAt) {
  if (!publishedAt) return false;
  const ageMs = Date.now() - new Date(publishedAt).getTime();
  return ageMs >= 0 && ageMs <= NEW_BADGE_DAYS * 24 * 60 * 60 * 1000;
}

// Matches known category names to a real partner logo — same mapping as ServiceCard.
const CATEGORY_LOGOS = {
  sakani: '/images/partner-sakani.svg',
  ejar: '/images/partner-ejar.svg',
  baladi: '/images/partner-baladi.svg',
  balady: '/images/partner-baladi.svg',
  fal: '/images/partner-fal.svg',
  farz: '/images/partner-farz.svg',
  mullak: '/images/partner-mullak.svg',
};

// Shown only when the backend can't be reached at all (network/server down) — so a visitor never
// hits a blank/broken page. Deliberately NOT real, subscribable services: names are prefixed so they
// can never collide with an actual Apigee product, and the set intentionally exercises every card
// state (free/paid, category logo, featured star, "new" badge, "test environment" badge).
const DUMMY_PRODUCTS = [
  {
    name: '__sample-sakani', displayName: 'الاستعلام عن الوحدات السكنية', category: 'sakani',
    description: 'خدمة مقدمة من سكني تتيح للمستفيدين إمكانية الاستعلام عن الوحدات والأراضي.',
    price: 25, billingType: 'subscription', operationCount: 4,
  },
  {
    name: '__sample-ejar', displayName: 'عقود الإيجار', category: 'ejar',
    description: 'خدمة مقدمة من إيجار تتيح للمستفيدين إمكانية الاستعلام عن كامل بيانات الوسيط.',
    price: 0, billingType: 'one-time', operationCount: 2,
  },
  {
    name: '__sample-baladi', displayName: 'التراخيص البلدية', category: 'baladi',
    description: 'خدمة مقدمة من بلدي تتيح للمستفيدين إمكانية الاستعلام عن رخص البناء والمحال.',
    price: 40, billingType: 'subscription', operationCount: 6,
  },
  {
    name: '__sample-fal', displayName: 'التحقق العقاري', category: 'fal',
    description: 'خدمة مقدمة من فال تتيح للمستفيدين إمكانية التحقق من صحة الإعلانات العقارية.',
    price: 0, billingType: 'one-time', operationCount: 1,
  },
  {
    name: '__sample-farz', displayName: 'فرز الوحدات العقارية', category: 'farz',
    description: 'خدمة مقدمة من فرز الوحدات تتيح للمستفيدين إمكانية الاستعلام عن بيانات المساح.',
    price: 16, billingType: 'one-time', operationCount: 1,
  },
  {
    name: '__sample-mullak', displayName: 'ملاك العقار', category: 'mullak',
    description: 'خدمة مقدمة من ملاك تتيح للمستفيدين إمكانية إدارة صكوك الملكية العقارية.',
    price: 30, billingType: 'subscription', operationCount: 3, featured: true,
  },
  {
    name: '__sample-licenses', displayName: 'الاستعلام عن الرخص',
    description: 'خدمة تتيح للمستفيدين إمكانية الاستعلام عن حالة طلبات الرخص الصادرة.',
    price: 0, billingType: 'one-time', operationCount: 2,
  },
  {
    name: '__sample-new', displayName: 'التحقق من الملكية',
    description: 'خدمة مقدمة حديثًا تتيح للمستفيدين إمكانية التحقق الفوري من بيانات الملكية.',
    price: 20, billingType: 'quota', operationCount: 3,
    publishedAt: new Date().toISOString(),
  },
  {
    name: '__sample-test-env', displayName: 'حجز المواعيد',
    description: 'خدمة تجريبية تتيح للمستفيدين إمكانية حجز موعد لمراجعة المعاملات العقارية.',
    price: 10, billingType: 'subscription', operationCount: 2,
    environments: ['test'],
  },
];

// The catalog displays products (apiproducts) — the subscription unit in Apigee, not proxies.
export default function ServicesPage() {
  const { t, locale } = useI18n();
  const [products, setProducts] = useState([]);
  const [filter, setFilter] = useState('all'); // all | free | paid
  const [catFilter, setCatFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('name'); // name | price_asc | price_desc
  const [view, setView] = useState('grid'); // grid | list
  const [page, setPage] = useState(1);
  const [filterOpen, setFilterOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [usingFallback, setUsingFallback] = useState(false);

  useEffect(() => {
    getProducts()
      .then((data) => { if (Array.isArray(data)) setProducts(data); })
      .catch(() => { setProducts(DUMMY_PRODUCTS); setUsingFallback(true); })
      .finally(() => setLoading(false));
  }, []);

  // Categories that actually exist (from the category attribute) — no mock categories
  const categories = [...new Set(products.map((p) => p.category).filter(Boolean))];

  const list = useMemo(() => {
    const filtered = products.filter((p) => {
      const isFree = !p.price || Number(p.price) === 0;
      const matchF =
        filter === 'all' ||
        (filter === 'free' && isFree) ||
        (filter === 'paid' && !isFree);
      const matchCat = catFilter === 'all' || p.category === catFilter;
      const title = (p.displayName || p.name || '').toLowerCase();
      const desc = (p.description || '').toLowerCase();
      const q = query.toLowerCase();
      const matchQ = !query || title.includes(q) || desc.includes(q) || (p.category || '').toLowerCase().includes(q);
      return matchF && matchCat && matchQ;
    });
    const sorted = [...filtered];
    if (sort === 'price_asc') sorted.sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0));
    else if (sort === 'price_desc') sorted.sort((a, b) => (Number(b.price) || 0) - (Number(a.price) || 0));
    else sorted.sort((a, b) => (a.displayName || a.name || '').localeCompare(b.displayName || b.name || '', locale));
    return sorted;
  }, [products, filter, catFilter, query, sort, locale]);

  // Reset to the first page whenever the visible set changes
  useEffect(() => { setPage(1); }, [filter, catFilter, query, sort]);

  // Design always uses Western digits on this page, even under Arabic — 'ar-SA' formats
  // numbers with Eastern Arabic-Indic digits (e.g. ١٦), which the approved catalog design doesn't use.
  const numLocale = 'en-US';
  const totalPages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = list.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const from = list.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const to = Math.min(safePage * PAGE_SIZE, list.length);

  const activeChips = [
    filter !== 'all' && { key: 'price', label: filter === 'free' ? t('catalog.filter_free') : t('catalog.filter_paid'), clear: () => setFilter('all') },
    catFilter !== 'all' && { key: 'cat', label: catFilter, clear: () => setCatFilter('all') },
  ].filter(Boolean);

  // Windowed page numbers: 1 … around current … last (matches the mockup's "1 2 3 … 999" shape)
  const pageNumbers = useMemo(() => {
    const nums = new Set([1, totalPages, safePage - 1, safePage, safePage + 1]);
    const sorted = [...nums].filter((n) => n >= 1 && n <= totalPages).sort((a, b) => a - b);
    const out = [];
    let prev = 0;
    for (const n of sorted) {
      if (n - prev > 1) out.push('…');
      out.push(n);
      prev = n;
    }
    return out;
  }, [safePage, totalPages]);

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
        {/* Toolbar: search + filter on one side, sort + view toggle on the other */}
        <div className={styles.toolbar}>
          <div className={styles.search}>
            <span className={styles.searchIcon} aria-hidden>⌕</span>
            <input
              type="text"
              placeholder={t('catalog.search_placeholder')}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <div className={styles.filterWrap}>
            <button className={styles.toolBtn} onClick={() => setFilterOpen((v) => !v)}>
              {t('catalog.filter_button')} <span aria-hidden>⚟</span>
            </button>
            {filterOpen && (
              <div className={styles.filterMenu}>
                <div className={styles.filterGroupTitle}>{t('catalog.filter_price_group')}</div>
                {[['all', t('catalog.filter_all')], ['free', t('catalog.filter_free')], ['paid', t('catalog.filter_paid')]].map(([k, l]) => (
                  <label key={k} className={styles.filterOption}>
                    <input type="radio" name="price" checked={filter === k} onChange={() => setFilter(k)} />
                    <span>{l}</span>
                  </label>
                ))}
                {categories.length > 0 && (
                  <>
                    <div className={styles.filterGroupTitle}>{t('catalog.filter_category_group')}</div>
                    <label className={styles.filterOption}>
                      <input type="radio" name="cat" checked={catFilter === 'all'} onChange={() => setCatFilter('all')} />
                      <span>{t('catalog.all_categories')}</span>
                    </label>
                    {categories.map((c) => (
                      <label key={c} className={styles.filterOption}>
                        <input type="radio" name="cat" checked={catFilter === c} onChange={() => setCatFilter(c)} />
                        <span>{c}</span>
                      </label>
                    ))}
                  </>
                )}
                <button className={styles.filterDone} onClick={() => setFilterOpen(false)}>{t('common.close')}</button>
              </div>
            )}
          </div>

          <div className={styles.toolbarEnd}>
            <label className={styles.sortWrap}>
              <span className={styles.sortLabel}>{t('catalog.sort_label')}</span>
              <select value={sort} onChange={(e) => setSort(e.target.value)}>
                <option value="name">{t('catalog.sort_name')}</option>
                <option value="price_asc">{t('catalog.sort_price_asc')}</option>
                <option value="price_desc">{t('catalog.sort_price_desc')}</option>
              </select>
            </label>
            <div className={styles.viewToggle} role="group" aria-label={t('catalog.view_toggle')}>
              <button
                className={view === 'grid' ? styles.viewActive : ''}
                onClick={() => setView('grid')}
                aria-label={t('catalog.view_grid')}
              >▦</button>
              <button
                className={view === 'list' ? styles.viewActive : ''}
                onClick={() => setView('list')}
                aria-label={t('catalog.view_list')}
              >☰</button>
            </div>
          </div>
        </div>

        {/* Active filter chips + count */}
        {activeChips.length > 0 && (
          <div className={styles.chipsRow}>
            {activeChips.map((c) => (
              <button key={c.key} className={styles.activeChip} onClick={c.clear}>
                <span aria-hidden>×</span> {c.label}
              </button>
            ))}
            <button className={styles.clearAll} onClick={() => { setFilter('all'); setCatFilter('all'); setQuery(''); }}>
              {t('catalog.clear_filters')}
            </button>
          </div>
        )}

        <div className={styles.count}>
          {loading
            ? t('common.loading')
            : t('catalog.count', { count: list.length.toLocaleString(numLocale) })}
        </div>

        {/* Server unreachable: keep the page looking normal (sample services) rather than a dead
            page, but say so plainly — these cards aren't real, subscribable services. */}
        {usingFallback && <div className={styles.fallbackNotice}>{t('catalog.fallback_notice')}</div>}

        <div className={view === 'grid' ? styles.grid : styles.listView}>
          {pageItems.map((p) => <CatalogCard key={p.name} service={p} t={t} numLocale={numLocale} />)}
          {!list.length && !loading && (
            <div className={styles.empty}>{t('catalog.empty')}</div>
          )}
        </div>

        {/* Pagination */}
        {!loading && list.length > 0 && (
          <div className={styles.pagination}>
            <span className={styles.pageInfo}>
              {t('catalog.showing', {
                from: from.toLocaleString(numLocale),
                to: to.toLocaleString(numLocale),
                total: list.length.toLocaleString(numLocale),
              })}
            </span>
            <div className={styles.pageNav}>
              {/* Glyphs are authored canonically for LTR (‹ = prev, › = next) and mirrored via CSS
                  under RTL — same technique as .cardGo — so both languages get the visually
                  correct direction without hardcoding opposite Unicode characters per language. */}
              <button className={styles.pagePrev} disabled={safePage <= 1} onClick={() => setPage(safePage - 1)} aria-label={t('catalog.prev_page')}>‹</button>
              {pageNumbers.map((n, i) =>
                n === '…'
                  ? <span key={`gap-${i}`} className={styles.pageGap}>…</span>
                  : (
                    <button
                      key={n}
                      className={n === safePage ? styles.pageActive : ''}
                      onClick={() => setPage(n)}
                    >
                      {n.toLocaleString(numLocale)}
                    </button>
                  ))}
              <button className={styles.pageNext} disabled={safePage >= totalPages} onClick={() => setPage(safePage + 1)} aria-label={t('catalog.next_page')}>›</button>
            </div>
          </div>
        )}

        {/* "Didn't find the service you're looking for?" banner */}
        <div className={styles.ctaBanner}>
          <div>
            <h2>{t('catalog.cta_title')}</h2>
            <p>{t('catalog.cta_sub')}</p>
          </div>
          <a href="/#Contact" className={styles.ctaBtn}>{t('catalog.cta_btn')} ›</a>
        </div>
      </div>
      <Footer />
    </>
  );
}

// Card layout matching the approved design: a badge + status dot on top, title/description,
// meta row (category logo + billing), price, then arrow link + operations chip at the bottom.
function CatalogCard({ service, t, numLocale }) {
  const name = service.name;
  const title = service.displayName || service.name;
  const tag = service.tag || service.category;
  const desc = service.description || service.desc || '';
  const ops = service.operationCount ?? service.ops ?? (service.apiProxies?.length);
  const price = service.price;
  const logo = tag ? CATEGORY_LOGOS[String(tag).toLowerCase().trim()] : null;
  // Fallback/demo cards (see DUMMY_PRODUCTS) aren't real Apigee products — the detail page would
  // just fail to load one, so the arrow link is inert for them instead of dangling.
  const isSample = String(name).startsWith('__sample-');
  // The badge slot shows "جديد" for a recently-published service; else an informational badge if
  // the service isn't deployed to the "prod" Apigee environment yet (real signal from
  // ApiProduct.Environments); else the category, if set — matches the mixed badge content in the
  // approved mockup (some cards show "البيئة الاختبارية" instead of a category name).
  const isNew = isRecentlyPublished(service.publishedAt);
  const isTestOnly = Array.isArray(service.environments) && service.environments.length > 0
    && !service.environments.some((e) => String(e).toLowerCase() === 'prod');

  const billingLabel = {
    'subscription': t('service_card.billing_subscription'),
    'one-time': t('service_card.billing_one_time'),
    'quota': t('service_card.billing_usage'),
  }[service.billingType];

  return (
    <div className={styles.card}>
      {/* Badge sits at the start (right in RTL), the status at the end — per the approved card design */}
      <div className={styles.cardTop}>
        {isNew ? (
          <span className={styles.cardTagNew}>{t('catalog.badge_new')}</span>
        ) : isTestOnly ? (
          <span className={styles.cardTagInfo}>{t('catalog.badge_test_env')}</span>
        ) : tag ? (
          <span className={styles.cardTag}>{tag}</span>
        ) : <span />}
        {/* Everything in the public catalog is a published, subscribable service */}
        <span className={styles.statusAvailable}>
          <span className={styles.statusDot} aria-hidden>●</span> {t('catalog.status_available')}
        </span>
      </div>

      <h3 className={styles.cardTitle}>{title}</h3>
      <p className={styles.cardDesc}>{desc}</p>

      <div className={styles.cardMeta}>
        <span className={styles.cardProvider}>
          {logo && <img src={logo} alt="" />}
          {tag && <span className={styles.cardProviderName}>{tag}</span>}
        </span>
        <span className={styles.cardPrice}>
          {price ? (
            <>
              <span className={styles.cardPriceNumber}>{Number(price).toLocaleString(numLocale)}</span>{' '}
              <span className={styles.cardPriceCurrency}>{t('service_card.currency')}</span>
            </>
          ) : (
            <span className={styles.cardFree}>{t('service_card.free')}</span>
          )}
          {billingLabel && <small className={styles.cardBilling}> · {billingLabel}</small>}
        </span>
      </div>

      <div className={styles.cardFoot}>
        <div className={styles.cardFootStart}>
          {service.featured && <span className={styles.cardStar} aria-hidden>★</span>}
          {ops != null && (
            <span className={styles.cardOps} title={t('service_card.operations', { count: ops })}>
              {Number(ops).toLocaleString(numLocale)} <span aria-hidden>⧉</span>
            </span>
          )}
        </div>
        {isSample ? (
          <span className={`${styles.cardGo} ${styles.cardGoDisabled}`} aria-hidden>←</span>
        ) : (
          <Link href={`/services/${encodeURIComponent(name)}`} className={styles.cardGo} aria-label={t('service_card.browse_api')}>
            ←
          </Link>
        )}
      </div>
    </div>
  );
}
