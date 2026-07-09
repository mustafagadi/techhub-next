import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ServiceCard from '@/components/ServiceCard';
import { getProducts } from '@/lib/api';
import styles from './page.module.css';

// عيّنات احتياطية تُعرض إن تعذّر الاتصال بالـ API
const fallbackFeatured = [
  { name: 'تقييم الخدمات', tag: 'تقييم', desc: 'إرسال واستعلام تقييمات المستفيدين للخدمات والمراكز.', ops: 7, price: null },
  { name: 'العنوان الوطني', tag: 'عناوين', desc: 'الاستعلام عن بيانات العناوين الوطنية والمدن والمناطق.', ops: 5, price: 1000 },
  { name: 'خدمات الأمانات', tag: 'بلدي', desc: 'تكامل مع خدمات الأمانات والرخص البلدية.', ops: 12, price: 2500 },
];

// جلب الخدمات المميّزة (أول 3 منشورة) على الخادم — يعيد للعيّنات إن فشل الاتصال
async function getFeatured() {
  try {
    const products = await getProducts();
    if (Array.isArray(products) && products.length) {
      return products.slice(0, 3);
    }
  } catch {
    // يبقى على العيّنات الاحتياطية
  }
  return fallbackFeatured;
}

const advantages = [
  { t: 'حلول ذكية', d: 'واجهات برمجية تعزّز كفاءتك وتمنحك الريادة في القطاع.' },
  { t: 'سرعة الاستجابة', d: 'معالجة آلاف العمليات يوميًا بكفاءة عالية توفّر وقتك.' },
  { t: 'حماية وأمان', d: 'أعلى معايير الأمان لحماية بياناتك وبيانات عملائك.' },
  { t: 'سهولة الاشتراك', d: 'ابدأ بالاستفادة خلال دقائق بخطوات بسيطة وسلسة.' },
];

export default async function Home() {
  const featured = await getFeatured();
  return (
    <>
      <Header />

      <section className={styles.hero}>
        <div className={styles.heroGrid} />
        <div className="container">
          <div className={styles.heroInner}>
            <span className={styles.eyebrow}>◆ منصّة واجهات برمجية موحّدة</span>
            <h1>اربط أنظمتك بخدمات <span className={styles.accent}>عقارية وبلدية</span> موثوقة عبر واجهات برمجية</h1>
            <p>قائمة واجهات برمجية آمنة وموثّقة، يمكّن مستخدميك من الوصول للبيانات والخدمات الحكومية بكفاءة وسرعة.</p>
            <div className={styles.actions}>
              <a href="/services" className="btn btn-primary">تصفّح الخدمات ←</a>
              <a href="#advantages" className="btn btn-ghost">المزايا</a>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.block} id="services">
        <div className="container">
          <div className={styles.head}>
            <h2>الخدمات</h2>
            <p>نقدّم حلولًا تقنية عقارية وبلدية مبتكرة، موثّقة وجاهزة للتكامل.</p>
          </div>
          <div className={styles.grid}>
            {featured.map((s) => <ServiceCard key={s.name} service={s} />)}
          </div>
          <div className={styles.more}><a href="/services" className="btn btn-primary">جميع الخدمات</a></div>
        </div>
      </section>

      <section className={`${styles.block} ${styles.cloud}`} id="advantages">
        <div className="container">
          <div className={styles.head}><h2>لماذا بوابة المطوّرين؟</h2><p>حلول مبتكرة ترفع إنتاجيتك وتبسّط التكامل.</p></div>
          <div className={styles.advGrid}>
            {advantages.map((a) => (
              <div key={a.t} className={styles.adv}>
                <div className={styles.advIcon} />
                <h3>{a.t}</h3>
                <p>{a.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
