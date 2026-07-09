import { normalizePromotionStatus, PROMOTION_STATUS_LABEL } from '../status';

describe('normalizePromotionStatus', () => {
  it('maps numeric backend codes to their string status', () => {
    expect(normalizePromotionStatus(0)).toBe('Pending');
    expect(normalizePromotionStatus(1)).toBe('Approved');
    expect(normalizePromotionStatus(2)).toBe('Rejected');
  });

  it('maps single-digit string codes the same way as numbers', () => {
    expect(normalizePromotionStatus('0')).toBe('Pending');
    expect(normalizePromotionStatus('1')).toBe('Approved');
    expect(normalizePromotionStatus('2')).toBe('Rejected');
  });

  it('passes already-named string statuses through unchanged', () => {
    expect(normalizePromotionStatus('Pending')).toBe('Pending');
    expect(normalizePromotionStatus('Approved')).toBe('Approved');
  });

  it('falls back to String() for unknown numeric codes', () => {
    expect(normalizePromotionStatus(99)).toBe('99');
  });
});

describe('PROMOTION_STATUS_LABEL', () => {
  it('has an Arabic label for every known status', () => {
    expect(PROMOTION_STATUS_LABEL.Pending).toBeTruthy();
    expect(PROMOTION_STATUS_LABEL.Approved).toBeTruthy();
    expect(PROMOTION_STATUS_LABEL.Rejected).toBeTruthy();
  });
});
