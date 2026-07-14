import Header from '@/components/Header';
import Footer from '@/components/Footer';
import HomeSections from '@/components/HomeSections';
import { getProducts } from '@/lib/api';

// Force the page into dynamic rendering: without this, Next.js freezes this server page during
// docker build (when the backend isn't available yet), so the list stays empty forever even though the backend works later.
export const dynamic = 'force-dynamic';

// Fetch the featured services (first 3 published) actually from the server — no mock samples.
// If the connection fails or there are no published services, an empty list is shown (the UI handles the empty state).
async function getFeatured() {
  try {
    const products = await getProducts();
    if (Array.isArray(products)) {
      return products.slice(0, 3);
    }
  } catch {
    // No services — the list stays empty instead of showing mock data
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
