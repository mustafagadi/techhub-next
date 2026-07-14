'use client';
import { useState, useRef, useEffect } from 'react';
import { useI18n } from '@/lib/i18n';
import styles from './ServicePicker.module.css';

// Custom dropdown for selecting a service, showing the price as a colored badge (green for free, gold for paid).
export default function ServicePicker({ products, value, onChange, placeholder }) {
  const { t } = useI18n();
  const resolvedPlaceholder = placeholder ?? t('service_picker.default_placeholder');
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Close the dropdown when clicking outside it
  useEffect(() => {
    function onDocClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const selected = products.find((p) => p.name === value);

  function priceBadge(p) {
    const paid = p.price && p.price > 0;
    return (
      <span className={paid ? styles.badgePaid : styles.badgeFree}>
        {paid ? `${p.price.toLocaleString('ar-SA')} ${t('service.currency')}` : t('orders.free')}
      </span>
    );
  }

  function pick(name) {
    onChange(name);
    setOpen(false);
  }

  return (
    <div className={styles.wrap} ref={ref}>
      <button
        type="button"
        className={styles.trigger}
        onClick={() => setOpen(!open)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={styles.triggerText}>
          {selected ? (selected.displayName || selected.name) : resolvedPlaceholder}
        </span>
        {selected && priceBadge(selected)}
        <span className={styles.arrow}>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <ul className={styles.list} role="listbox">
          <li
            className={styles.option}
            role="option"
            aria-selected={!value}
            onClick={() => pick('')}
          >
            <span className={styles.optName}>{resolvedPlaceholder}</span>
          </li>
          {products.map((p, i) => {
            const isSel = p.name === value;
            return (
              <li
                key={i}
                className={`${styles.option} ${isSel ? styles.optionSel : ''}`}
                role="option"
                aria-selected={isSel}
                onClick={() => pick(p.name)}
              >
                <span className={styles.optName}>{p.displayName || p.name}</span>
                {priceBadge(p)}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
