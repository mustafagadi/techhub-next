'use client';
import { useEffect, useRef, useState } from 'react';
import { getProductSpec, getProxySpec } from '@/lib/api';
import { useI18n } from '@/lib/i18n';

// Displays a service's OpenAPI spec via Redoc (loaded from a CDN).
// Fetches the spec from /products/{name}/spec and passes it to Redoc.
export default function RedocViewer({ productName }) {
  const { t } = useI18n();
  const containerRef = useRef(null);
  const [status, setStatus] = useState('loading'); // loading | ready | empty | error

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        // 1) Fetch the stored documentation first (uploaded or generated and saved), and if it doesn't exist, generate it from the proxy on the fly
        let spec = await getProductSpec(productName).catch(() => null);
        if (!spec || !spec.paths || Object.keys(spec.paths).length === 0) {
          spec = await getProxySpec(productName).catch(() => null);
        }
        if (!spec || !spec.paths || Object.keys(spec.paths).length === 0) {
          if (!cancelled) setStatus('empty');
          return;
        }

        // 2) Load Redoc from the CDN once
        if (!window.Redoc) {
          await new Promise((resolve, reject) => {
            const s = document.createElement('script');
            s.src = '/vendor/redoc/redoc.standalone.js';
            s.onload = resolve;
            s.onerror = reject;
            document.body.appendChild(s);
          });
        }

        // 3) Pass the spec to Redoc (a direct object, not a URL)
        if (cancelled || !containerRef.current) return;
        window.Redoc.init(
          spec,
          {
            scrollYOffset: 72,
            hideDownloadButton: false,
            theme: {
              colors: { primary: { main: '#009C6D' } },
              typography: { fontFamily: "'IBM Plex Sans Arabic', sans-serif" },
            },
          },
          containerRef.current
        );
        if (!cancelled) setStatus('ready');
      } catch {
        if (!cancelled) setStatus('error');
      }
    }

    init();
    return () => { cancelled = true; };
  }, [productName]);

  return (
    <div>
      {status === 'loading' && <div style={{ padding: 24, color: '#5A6B82' }}>{t('doc_viewer.loading')}</div>}
      {status === 'empty' && <div style={{ padding: 24, color: '#5A6B82' }}>{t('doc_viewer.empty')}</div>}
      {status === 'error' && <div style={{ padding: 24, color: '#C0392B' }}>{t('doc_viewer.error')}</div>}
      <div ref={containerRef} dir="ltr" />
    </div>
  );
}
