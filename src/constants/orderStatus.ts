export const ORDER_STATUS_OPTIONS = [
  { label: 'All', value: '' },
  { label: 'Pending', value: 'pending' },
  { label: 'Accepted', value: 'accepted' },
  { label: 'In Progress', value: 'in_progress' },
  { label: 'Stitching', value: 'stitching' },
  { label: 'Ready', value: 'ready' },
  { label: 'Delivered', value: 'delivered' },
  { label: 'Completed', value: 'completed' },
  { label: 'Cancelled', value: 'cancelled' },
] as const;

export const ORDER_STATUS_UPDATE_OPTIONS = ORDER_STATUS_OPTIONS.filter((o) => o.value);

export const ORDER_STATUS_COLORS: Record<string, string> = {
  pending: '#f59e0b',
  accepted: '#6366f1',
  in_progress: '#0ea5e9',
  stitching: '#8b5cf6',
  ready: '#14b8a6',
  delivered: '#22c55e',
  completed: '#10b981',
  cancelled: '#ef4444',
  confirmed: '#3b82f6',
  tailor_assigned: '#a855f7',
};
