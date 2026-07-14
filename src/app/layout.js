import '@/styles/globals.css';
import Analytics from '@/components/Analytics';
import { I18nProvider } from '@/lib/i18n';

export const metadata = {
  title: 'Developer Portal | Municipal & Real-Estate API Solutions',
  description: 'A unified API platform connecting your systems to municipal and real-estate services.',
};

// The default language is English. The provider corrects lang/dir after mount
// if the user has previously chosen Arabic.
export default function RootLayout({ children }) {
  return (
    <html lang="en" dir="ltr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body>
        <I18nProvider>
          <Analytics />
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}
