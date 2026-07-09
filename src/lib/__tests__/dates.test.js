import { fmtDate, fmtDateTime } from '../dates';

describe('fmtDate', () => {
  it('formats a valid ISO date as DD/MM/YYYY in Asia/Riyadh time', () => {
    expect(fmtDate('2026-07-09T10:00:00Z')).toBe('09/07/2026');
  });

  it('returns — for empty input', () => {
    expect(fmtDate(null)).toBe('—');
    expect(fmtDate(undefined)).toBe('—');
    expect(fmtDate('')).toBe('—');
  });

  it('returns — for an unparseable date', () => {
    expect(fmtDate('not-a-date')).toBe('—');
  });
});

describe('fmtDateTime', () => {
  it('formats a valid ISO date with 24h time in Asia/Riyadh time', () => {
    expect(fmtDateTime('2026-07-09T10:00:00Z')).toBe('09/07/2026, 13:00');
  });

  it('returns — for empty input', () => {
    expect(fmtDateTime(null)).toBe('—');
  });

  it('returns — for an unparseable date', () => {
    expect(fmtDateTime('not-a-date')).toBe('—');
  });
});
