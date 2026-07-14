// Project-wide date formatting.
// Rule: stored in UTC, displayed in Saudi Arabia time (GMT+3),
// with the Gregorian calendar and Latin numerals (en-GB) — clearer for admin tables.

const TZ = 'Asia/Riyadh';
const LOCALE = 'en-GB'; // Gregorian + Latin numerals + day/month/year format

/** Date only: 09/07/2026 */
export function fmtDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  try {
    return date.toLocaleDateString(LOCALE, {
      timeZone: TZ,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  } catch {
    return '—';
  }
}

/** Date and time: 09/07/2026, 14:32 */
export function fmtDateTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  try {
    return date.toLocaleString(LOCALE, {
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
