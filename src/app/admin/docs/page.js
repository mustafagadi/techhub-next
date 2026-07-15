'use client';
import { useState, useEffect, useCallback } from 'react';
import { getAllProducts, importPostman, generateSpec, uploadDocFile } from '@/lib/api';
import PermissionGate from '@/components/PermissionGate';
import { useI18n } from '@/lib/i18n';
import EnvSwitcher from '@/components/EnvSwitcher';
import styles from '../admin.module.css';

export default function DocsPage() {
  const { t } = useI18n();
  const [services, setServices] = useState([]);
  const [busy, setBusy] = useState(null);
  const [toast, setToast] = useState(null);

  const loadServices = useCallback(() => {
    getAllProducts().then((d) => setServices(Array.isArray(d) ? d : [])).catch(() => {});
  }, []);
  useEffect(() => { loadServices(); }, [loadServices]);

  function notify(message, ok = true) {
    setToast({ message, ok });
    setTimeout(() => setToast(null), 3000);
  }

  async function handleImportPostman(serviceName, file) {
    if (!serviceName || !file) { notify(t('docs.select_service_file_first'), false); return; }
    setBusy('upload');
    try {
      await importPostman(serviceName, file);
      notify(t('docs.upload_success', { name: serviceName }));
      loadServices();
    } catch (err) {
      notify(err.message || t('docs.upload_failed'), false);
    } finally {
      setBusy(null);
    }
  }

  async function handleGenerateSpec(serviceName) {
    if (!serviceName) { notify(t('docs.select_service_first'), false); return; }
    setBusy('generate');
    try {
      await generateSpec(serviceName);
      notify(t('docs.generate_success', { name: serviceName }));
      loadServices();
    } catch (err) {
      notify(err.message || t('docs.generate_failed'), false);
    } finally {
      setBusy(null);
    }
  }

  async function handleUploadDocFile(serviceName, file) {
    if (!serviceName || !file) { notify(t('docs.select_service_file_first'), false); return; }
    setBusy('docfile');
    try {
      await uploadDocFile(serviceName, file);
      notify(t('docs.docfile_upload_success', { name: serviceName }));
    } catch (err) {
      notify(err.message || t('docs.upload_failed'), false);
    } finally {
      setBusy(null);
    }
  }

  return (
    <PermissionGate permission="docs.manage">
      <div className={styles.topbar}>
        <h1>{t('admin_nav.docs')}</h1>
        <EnvSwitcher />
      </div>
      <div className={styles.content}>
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
    </PermissionGate>
  );
}

function DocsTab({ services, busy, onImport, onGenerate, onUploadDoc }) {
  const { t } = useI18n();
  const [selected, setSelected] = useState('');
  const [file, setFile] = useState(null);
  const [docFile, setDocFile] = useState(null);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);

  const filtered = services.filter((s) => {
    if (!search) return true;
    const name = (s.displayName || s.name || '').toLowerCase();
    return name.includes(search.toLowerCase());
  });

  const selectedLabel = selected
    ? (() => { const s = services.find((x) => x.name === selected); return s ? (s.displayName || s.name) : selected; })()
    : '';

  return (
    <div className={styles.card}>
      <div className={styles.cardHead}><span>{t('docs.add_docs_title')}</span></div>
      <div className={styles.docsBody}>
        <label className={styles.docsLabel}>
          {t('orders.col_service')}
          <div className={styles.searchSelect}>
            <input
              type="text"
              placeholder={t('docs.search_placeholder')}
              value={open ? search : selectedLabel}
              onChange={(e) => { setSearch(e.target.value); setOpen(true); }}
              onFocus={() => { setOpen(true); setSearch(''); }}
              onBlur={() => setTimeout(() => setOpen(false), 150)}
            />
            {open && (
              <div className={styles.searchDropdown}>
                {filtered.length === 0 ? (
                  <div className={styles.searchEmpty}>{t('docs.no_results')}</div>
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
                      {s.displayName || s.name} {s.hasSpec ? <span className={styles.hasSpec}>{t('docs.has_spec')}</span> : ''}
                    </div>
                  ))
                )}
                {filtered.length > 50 && <div className={styles.searchEmpty}>{t('docs.narrow_search', { count: filtered.length })}</div>}
              </div>
            )}
          </div>
        </label>

        <div className={styles.docsOption}>
          <h4>{t('docs.method1_title')}</h4>
          <p>{t('docs.method1_desc')}</p>
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
            {busy === 'upload' ? t('docs.uploading') : t('docs.upload_convert')}
          </button>
        </div>

        <div className={styles.docsDivider}>{t('docs.or')}</div>

        <div className={styles.docsOption}>
          <h4>{t('docs.method2_title')}</h4>
          <p>{t('docs.method2_desc')}</p>
          <button
            className={styles.btnGhost}
            onClick={() => onGenerate(selected)}
            disabled={busy === 'generate' || !selected}
          >
            {busy === 'generate' ? t('docs.generating') : t('docs.generate_from_proxy')}
          </button>
        </div>

        <div className={styles.docsDivider}>{t('docs.or')}</div>

        <div className={styles.docsOption}>
          <h4>{t('docs.method3_title')}</h4>
          <p>{t('docs.method3_desc')}</p>
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
            {busy === 'docfile' ? t('docs.uploading') : t('docs.upload_doc_file')}
          </button>
        </div>
      </div>
    </div>
  );
}
