// تنسيق التواريخ على مستوى المشروع.
// القاعدة: التخزين UTC، والعرض بتوقيت السعودية (GMT+3)،
// بتقويم ميلادي وأرقام لاتينية (en-GB) — أوضح للجداول الإدارية.

const TZ = 'Asia/Riyadh';
const LOCALE = 'en-GB'; // ميلادي + أرقام لاتينية + صيغة يوم/شهر/سنة

/** التاريخ فقط: 09/07/2026 */
export function fmtDate(value) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleDateString(LOCALE, {
      timeZone: TZ,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  } catch {
    return '—';
  }
}

/** التاريخ والوقت: 09/07/2026, 14:32 */
export function fmtDateTime(value) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString(LOCALE, {
      timeZone: TZ,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  } catch {
    return '—';
  }
}
