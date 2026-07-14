import Header from '@/components/Header';
import Footer from '@/components/Footer';
import HomeSections from '@/components/HomeSections';
import { getProducts } from '@/lib/api';

// جلب الخدمات المميّزة (أول 3 منشورة) فعليًّا من الخادم — لا عيّنات وهمية.
// إن تعذّر الاتصال أو لم تكن هناك خدمات منشورة، تُعرض قائمة فارغة (تتولى الواجهة حالة الفراغ).
async function getFeatured() {
  try {
    const products = await getProducts();
    if (Array.isArray(products)) {
      return products.slice(0, 3);
    }
  } catch {
    // لا خدمات — تبقى القائمة فارغة بدل عرض بيانات وهمية
  }
  return [];
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
