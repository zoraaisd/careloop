export const formatCurrency = (value: number): string =>
  `Rs. ${Math.round(value || 0).toLocaleString('en-IN')}`;

export const formatDate = (value?: string | null): string => {
  if (!value) return '-';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString('en-IN');
};

export const statusClass = (status: string): string => {
  if (['Active', 'Paid', 'Delivered', 'Approved', 'Confirmed'].includes(status)) {
    return 'bg-emerald-50 text-emerald-700 border-emerald-100';
  }
  if (['Inactive', 'Cancelled', 'Overdue', 'Refunded'].includes(status)) {
    return 'bg-red-50 text-red-700 border-red-100';
  }
  if (['Pending', 'Draft', 'Requested', 'Partially Paid', 'Picked Up'].includes(status)) {
    return 'bg-amber-50 text-amber-700 border-amber-100';
  }
  return 'bg-slate-50 text-slate-700 border-slate-100';
};
