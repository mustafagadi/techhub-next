import Header from '@/components/Header';
import Footer from '@/components/Footer';
import HomeSections from '@/components/HomeSections';
import { getProducts } from '@/lib/api';

// عيّنات احتياطية تُعرض إن تعذّر الاتصال بالـ API.
// الأسماء والأوصاف تأتي من الخلفية عادةً، فلا تُترجَم هنا.
const fallbackFeatured = [
  { name: 'Service Ratings', tag: 'ratings', desc: '', ops: 7, price: null },
  { name: 'National Address', tag: 'addresses', desc: '', ops: 5, price: 1000 },
  { name: 'Municipal Services', tag: 'municipal', desc: '', ops: 12, price: 2500 },
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

export default async function Home() {
  const featured = await getFeatured();
  return (
    <>
      <Header />
      <HomeSections featured={featured} />
      <Footer />
    </>
  );
}
