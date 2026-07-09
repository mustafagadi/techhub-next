import '@/styles/globals.css';
import Analytics from '@/components/Analytics';

export const metadata = {
  title: 'بوابة المطوّرين | حلول تقنية عقارية',
  description: 'منصّة واجهات برمجية موحّدة لربط أنظمتك بالخدمات العقارية والبلدية.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body>
        <Analytics />
        {children}
      </body>
    </html>
  );
}
