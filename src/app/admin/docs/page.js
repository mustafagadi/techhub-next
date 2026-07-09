'use client';
import { useState, useEffect, useCallback } from 'react';
import { getAllProducts, importPostman, generateSpec, uploadDocFile } from '@/lib/api';
import styles from '../admin.module.css';

export default function DocsPage() {
  const [services, setServices] = useState([]);
  const [busy, setBusy] = useState(null);
  const [toast, setToast] = useState(null);
  const [loadError, setLoadError] = useState(false);

  const loadServices = useCallback(() => {
    setLoadError(false);
    getAllProducts().then((d) => setServices(Array.isArray(d) ? d : [])).catch(() => setLoadError(true));
  }, []);
  useEffect(() => { loadServices(); }, [loadServices]);

  function notify(message, ok = true) {
    setToast({ message, ok });
    setTimeout(() => setToast(null), 3000);
  }

  async function handleImportPostman(serviceName, file) {
    if (!serviceName || !file) { notify('اختر الخدمة والملف أولًا.', false); return; }
    setBusy('upload');
    try {
      await importPostman(serviceName, file);
      notify(`تم رفع التوثيق لـ «${serviceName}».`);
      loadServices();
    } catch (err) {
      notify(err.message || 'تعذّر رفع الملف.', false);
    } finally {
      setBusy(null);
    }
  }

  async function handleGenerateSpec(serviceName) {
    if (!serviceName) { notify('اختر الخدمة أولًا.', false); return; }
    setBusy('generate');
    try {
      await generateSpec(serviceName);
      notify(`تم توليد التوثيق لـ «${serviceName}».`);
      loadServices();
    } catch (err) {
      notify(err.message || 'تعذّر توليد التوثيق.', false);
    } finally {
      setBusy(null);
    }
  }

  async function handleUploadDocFile(serviceName, file) {
    if (!serviceName || !file) { notify('اختر الخدمة والملف أولًا.', false); return; }
    setBusy('docfile');
    try {
      await uploadDocFile(serviceName, file);
      notify(`تم رفع ملف التوثيق لـ «${serviceName}».`);
    } catch (err) {
      notify(err.message || 'تعذّر رفع الملف.', false);
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <div className={styles.topbar}>
        <h1>التوثيق</h1>
        <span className={styles.env}>● بيئة prod</span>
      </div>
      <div className={styles.content}>
        {loadError && (
          <div className={styles.error}>
            تعذّر تحميل قائمة الخدمات. <button className={styles.priceBtn} onClick={loadServices}>إعادة المحاولة</button>
          </div>
        )}
        <DocsTab
          services={services}
          busy={busy}
          onImport={handleImportPostman}
          onGenerate={handleGenerateSpec}
          onUploadDoc={handleUploadDocFile}
        />
      </div>

      {toast && (
        <div className={`${styles.toast} ${toast.ok ? styles.toastOk : styles.toastErr}`}>
          {toast.message}
        </div>
      )}
    </>
  );
}

function DocsTab({ services, busy, onImport, onGenerate, onUploadDoc }) {
  const [selected, setSelected] = useState('');
  const [file, setFile] = useState(null);
  const [docFile, setDocFile] = useState(null);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);

  const filtered = services.filter((s) => {
    if (!search) return true;
    const t = (s.displayName || s.name || '').toLowerCase();
    return t.includes(search.toLowerCase());
  });

  const selectedLabel = selected
    ? (() => { const s = services.find((x) => x.name === selected); return s ? (s.displayName || s.name) : selected; })()
    : '';

  return (
    <div className={styles.card}>
      <div className={styles.cardHead}><span>إضافة توثيق لخدمة</span></div>
      <div className={styles.docsBody}>
        <label className={styles.docsLabel}>
          الخدمة
          <div className={styles.searchSelect}>
            <input
              type="text"
              placeholder="ابحث واختر خدمة…"
              value={open ? search : selectedLabel}
              onChange={(e) => { setSearch(e.target.value); setOpen(true); }}
              onFocus={() => { setOpen(true); setSearch(''); }}
              onBlur={() => setTimeout(() => setOpen(false), 150)}
            />
            {open && (
              <div className={styles.searchDropdown}>
                {filtered.length === 0 ? (
                  <div className={styles.searchEmpty}>لا توجد نتائج</div>
                ) : (
                  filtered.slice(0, 50).map((s, i) => (
                    <div
                      key={i}
                      className={styles.searchOption}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setSelected(s.name);
                        setSearch('');
                        setOpen(false);
                      }}
                    >
                      {s.displayName || s.name} {s.hasSpec ? <span className={styles.hasSpec}>(لها توثيق)</span> : ''}
                    </div>
                  ))
                )}
                {filtered.length > 50 && <div className={styles.searchEmpty}>اكتب للتضييق… ({filtered.length} نتيجة)</div>}
              </div>
            )}
          </div>
        </label>

        <div className={styles.docsOption}>
          <h4>الطريقة الأولى: رفع ملف Postman</h4>
          <p>ارفع ملف Postman Collection (JSON)، لتحويله الى توثيق OpenAPI.</p>
          <input
            type="file"
            accept=".json"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
          <button
            className="btn btn-primary"
            onClick={() => onImport(selected, file)}
            disabled={busy === 'upload' || !selected || !file}
          >
            {busy === 'upload' ? 'جارٍ الرفع…' : 'رفع وتحويل'}
          </button>
        </div>

        <div className={styles.docsDivider}>أو</div>

        <div className={styles.docsOption}>
          <h4>الطريقة الثانية: توليد من الـ Proxy</h4>
          <p>توليد توثيق أوّلي تلقائيًّا من تعريف الـ proxy في Apigee.</p>
          <button
            className={styles.btnGhost}
            onClick={() => onGenerate(selected)}
            disabled={busy === 'generate' || !selected}
          >
            {busy === 'generate' ? 'جارٍ التوليد…' : 'توليد من Proxy'}
          </button>
        </div>

        <div className={styles.docsDivider}>أو</div>

        <div className={styles.docsOption}>
          <h4>الطريقة الثالثة: رفع ملف توثيق (PDF / Word)</h4>
          <p>ارفع ملف توثيق جاهزًا (PDF أو Word)، ليتمكّن الشريك من تنزيله من صفحة الخدمة.</p>
          <input
            type="file"
            accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={(e) => setDocFile(e.target.files?.[0] || null)}
          />
          <button
            className={styles.btnGhost}
            onClick={() => onUploadDoc(selected, docFile)}
            disabled={busy === 'docfile' || !selected || !docFile}
            style={{ marginTop: 8 }}
          >
            {busy === 'docfile' ? 'جارٍ الرفع…' : 'رفع ملف التوثيق'}
          </button>
        </div>
      </div>
    </div>
  );
}
