'use client';
import { useEffect, useRef, useState } from 'react';
import { getProductSpec, getProxySpec } from '@/lib/api';
import { useI18n } from '@/lib/i18n';

// يعرض مواصفة OpenAPI لـ proxy عبر Swagger UI (يُحمّل من CDN).
// [النهج ب] يجلب المواصفة المولّدة من الـ proxy مباشرة.
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
        // 1) نجلب التوثيق المخزّن أولًا (المرفوع أو المولّد والمحفوظ)، وإن لم يوجد نولّد من proxy لحظيًّا
        let spec = await getProductSpec(productName).catch(() => null);
        if (!spec || !spec.paths || Object.keys(spec.paths).length === 0) {
          spec = await getProxySpec(productName).catch(() => null);
        }
        if (!spec || !spec.paths || Object.keys(spec.paths).length === 0) {
          if (!cancelled) setStatus('empty');
          return;
        }

        // 2) تحميل أصول Swagger UI من CDN
        await Promise.all([loadCss(), loadScript()]);

        // 3) تهيئة Swagger UI بالمواصفة مباشرة (كائن، لا رابط)
        if (cancelled || !containerRef.current) return;
        window.SwaggerUIBundle({
          spec,
          domNode: containerRef.current,
          deepLinking: true,
          // للتوثيق فقط — لا تنفيذ طلبات فعلية من هنا (لا "Try it out")
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
