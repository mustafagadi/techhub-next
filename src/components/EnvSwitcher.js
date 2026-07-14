'use client';
import { useState, useEffect } from 'react';
import { getEnvironments, getEnvironment, setEnvironment } from '@/lib/api';
import styles from './EnvSwitcher.module.css';

// Environment switcher (prod/test) — fetches what's available from the backend and changes the active environment.
// Changing the environment reloads the page so it applies to all displayed data.
export default function EnvSwitcher() {
  const [envs, setEnvs] = useState([]);
  const [current, setCurrent] = useState(getEnvironment());
  const [open, setOpen] = useState(false);

  useEffect(() => {
    getEnvironments()
      .then((d) => {
        const available = d?.available || d?.environments || [];
        setEnvs(Array.isArray(available) ? available : []);
      })
      .catch(() => setEnvs(['prod'])); // fallback
  }, []);

  function choose(env) {
    if (env === current) { setOpen(false); return; }
    setEnvironment(env);
    setCurrent(env);
    setOpen(false);
    // Reload so it applies to all data (catalog, details...)
    window.location.reload();
  }

  // Don't show the switcher if there's only one environment
  if (envs.length <= 1) return null;

  return (
    <div className={styles.wrap}>
      <button className={styles.trigger} onClick={() => setOpen(!open)}>
        <span className={styles.dot} data-env={current} />
        {current}
        <span className={styles.caret}>▾</span>
      </button>
      {open && (
        <div className={styles.menu}>
          {envs.map((env) => (
            <button
              key={env}
              className={`${styles.item} ${env === current ? styles.active : ''}`}
              onClick={() => choose(env)}
            >
              <span className={styles.dot} data-env={env} />
              {env}
              {env === current && <span className={styles.check}>✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
