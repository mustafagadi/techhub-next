'use client';
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import en from '@/locales/en.json';
import ar from '@/locales/ar.json';

const DICTS = { en, ar };
const STORAGE_KEY = 'portal_locale';
const DEFAULT_LOCALE = 'en';

export const LOCALES = [
  { code: 'en', label: 'English', dir: 'ltr' },
  { code: 'ar', label: 'العربية', dir: 'rtl' },
];

const I18nContext = createContext({
  locale: DEFAULT_LOCALE,
  dir: 'ltr',
  setLocale: () => {},
  t: (key) => key,
});

/**
 * يقرأ مفتاحًا متداخلًا: t('login.title') → dict.login.title
 * ويستبدل المتغيّرات: t('greeting', { name: 'Ali' }) مع "Hello {name}"
 * إن غاب المفتاح، يرجع للإنجليزية، ثم للمفتاح نفسه (يكشف النقص بوضوح).
 */
function translate(dict, fallback, key, vars) {
  const read = (d) => key.split('.').reduce((o, k) => (o == null ? undefined : o[k]), d);
  let value = read(dict);
  if (typeof value !== 'string') value = read(fallback);
  if (typeof value !== 'string') return key; // مفتاح ناقص — يظهر كما هو

  if (!vars) return value;
  return value.replace(/\{(\w+)\}/g, (m, k) => (vars[k] ?? m));
}

export function I18nProvider({ children }) {
  // نبدأ بالافتراضي (لتطابق الخادم مع العميل)، ثم نقرأ التفضيل بعد التركيب
  const [locale, setLocaleState] = useState(DEFAULT_LOCALE);

  useEffect(() => {
    let saved;
    try { saved = localStorage.getItem(STORAGE_KEY); } catch {}
    if (saved && DICTS[saved]) setLocaleState(saved);
  }, []);

  // نضبط lang/dir على <html> — التخطيط الجذري خادمي، فنغيّره من العميل
  useEffect(() => {
    const meta = LOCALES.find((l) => l.code === locale) || LOCALES[0];
    document.documentElement.lang = meta.code;
    document.documentElement.dir = meta.dir;
  }, [locale]);

  const setLocale = useCallback((next) => {
    if (!DICTS[next]) return;
    try { localStorage.setItem(STORAGE_KEY, next); } catch {}
    setLocaleState(next);
  }, []);

  const t = useCallback(
    (key, vars) => translate(DICTS[locale], DICTS[DEFAULT_LOCALE], key, vars),
    [locale]
  );

  const dir = (LOCALES.find((l) => l.code === locale) || LOCALES[0]).dir;

  return (
    <I18nContext.Provider value={{ locale, dir, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

/** الخطّاف الذي تستخدمه المكوّنات: const { t, locale, dir, setLocale } = useI18n(); */
export function useI18n() {
  return useContext(I18nContext);
}
