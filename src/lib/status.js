// حالة طلبات الترقية للإنتاج — الخلفية قد تُرجعها كرقم (0/1/2) أو كنص، نوحّدها هنا.
// مشتركة بين لوحة تحكّم المسؤول (admin/promotions) وصفحة الشريك (partner).

const STATUS_BY_NUM = { 0: 'Pending', 1: 'Approved', 2: 'Rejected' };

export function normalizePromotionStatus(status) {
  if (typeof status === 'number') return STATUS_BY_NUM[status] ?? String(status);
  if (typeof status === 'string' && /^[0-2]$/.test(status)) return STATUS_BY_NUM[Number(status)];
  return status;
}

export const PROMOTION_STATUS_LABEL = {
  Pending: 'بانتظار المراجعة',
  Approved: 'مقبول',
  Rejected: 'مرفوض',
};
