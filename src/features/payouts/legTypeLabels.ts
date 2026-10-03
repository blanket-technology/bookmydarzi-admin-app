import type { BridgeLegType } from '@/types/bridgePayouts';

// Human-readable labels for BridgeLegType - shared by the admin Bridge
// Payouts screen, the Mark Paid sheet, and the employee's own My Earnings
// screen, so the wording stays identical everywhere a leg type is shown.
export const LEG_TYPE_LABELS: Record<BridgeLegType, string> = {
  pickup: 'Pickup',
  delivery: 'Delivery',
  return: 'Return',
  repair_pickup: 'Repair Pickup',
  repair_delivery: 'Repair Delivery',
};
