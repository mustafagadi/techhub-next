'use client';
import { useState, useEffect } from 'react';
import { getEnvironments, getEnvironment, setEnvironment } from '@/lib/api';
import styles from './EnvSwitcher.module.css';

// مبدّل البيئات (prod/test) — يجلب المتاح من الخلفية ويغيّر البيئة النشطة.
// تغيير البيئة يُعيد تحميل الصفحة ليُطبّق على كل البيانات المعروضة.
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
      .catch(() => setEnvs(['prod'])); // احتياط
  }, []);

  function choose(env) {
    if (env === current) { setOpen(false); return; }
    setEnvironment(env);
    setCurrent(env);
    setOpen(false);
    // إعادة تحميل ليُطبّق على كل البيانات (الكتالوج، التفاصيل...)
    window.location.reload();
  }

  // لا تعرض المبدّل إن كانت بيئة واحدة فقط
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
