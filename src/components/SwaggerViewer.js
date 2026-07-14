'use client';
import { useEffect, useRef, useState } from 'react';
import { getProductSpec, getProxySpec } from '@/lib/api';
import { useI18n } from '@/lib/i18n';

// Displays a proxy's OpenAPI spec via Swagger UI (loaded from a CDN).
// [Approach B] fetches the spec generated from the proxy directly.
export default function SwaggerViewer({ productName }) {
  const { t } = useI18n();
  const containerRef = useRef(null);
  const [status, setStatus] = useState('loading'); // loading | ready | empty | error

  useEffect(() => {
    let cancelled = false;

    async function loadCss() {
      if (document.getElementById('swagger-css')) return;
      const link = document.createElement('link');
      link.id = 'swagger-css';
      link.rel = 'stylesheet';
      link.href = '/vendor/swagger-ui/swagger-ui.css';
      document.head.appendChild(link);
    }

    async function loadScript() {
      if (window.SwaggerUIBundle) return;
      await new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = '/vendor/swagger-ui/swagger-ui-bundle.js';
        s.onload = resolve;
        s.onerror = reject;
        document.body.appendChild(s);
      });
    }

    async function init() {
      try {
        // 1) Fetch the stored documentation first (uploaded or generated and saved); if none exists, generate it from the proxy on the fly
        let spec = await getProductSpec(productName).catch(() => null);
        if (!spec || !spec.paths || Object.keys(spec.paths).length === 0) {
          spec = await getProxySpec(productName).catch(() => null);
        }
        if (!spec || !spec.paths || Object.keys(spec.paths).length === 0) {
          if (!cancelled) setStatus('empty');
          return;
        }

        // 2) Load Swagger UI assets from the CDN
        await Promise.all([loadCss(), loadScript()]);

        // 3) Initialize Swagger UI directly with the spec (an object, not a URL)
        if (cancelled || !containerRef.current) return;
        window.SwaggerUIBundle({
          spec,
          domNode: containerRef.current,
          deepLinking: true,
          // Documentation only — no actual requests executed from here (no "Try it out")
          tryItOutEnabled: false,
          supportedSubmitMethods: [],
        });
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
