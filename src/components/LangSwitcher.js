'use client';
import { useState, useRef, useEffect } from 'react';
import { useI18n, LOCALES } from '@/lib/i18n';
import styles from './LangSwitcher.module.css';

// مبدّل اللغة (English / العربية). يحفظ التفضيل ويغيّر اتجاه الصفحة فورًا.
export default function LangSwitcher() {
  const { locale, setLocale } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function onDocClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const current = LOCALES.find((l) => l.code === locale) || LOCALES[0];

  function choose(code) {
    setOpen(false);
    if (code !== locale) setLocale(code);
  }

  return (
    <div className={styles.wrap} ref={ref}>
      <button
        className={styles.trigger}
        onClick={() => setOpen(!open)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Change language"
      >
        <span className={styles.globe} aria-hidden="true">⌘</span>
        <span className={styles.code}>{current.code.toUpperCase()}</span>
        <span className={styles.caret} aria-hidden="true">▾</span>
      </button>

      {open && (
        <div className={styles.menu} role="listbox">
          {LOCALES.map((l) => (
            <button
              key={l.code}
              className={`${styles.item} ${l.code === locale ? styles.active : ''}`}
              onClick={() => choose(l.code)}
              role="option"
              aria-selected={l.code === locale}
              lang={l.code}
            >
              {l.label}
              {l.code === locale && <span className={styles.check} aria-hidden="true">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
