import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';

// Mirrors app/constants/audit_action.py's AuditAction enum - kept as a
// lookup rather than importing the Python enum (no shared codegen exists
// between this app and the backend). Any action code not listed here
// still renders correctly via the humanizeAction()/DEFAULT_TONE fallback,
// so a new backend action never breaks this screen - it just shows up
// title-cased with a neutral dot until someone adds a proper entry.
export type AuditTone = 'success' | 'warning' | 'error' | 'info';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

interface AuditActionMeta {
  label: string;
  icon: IoniconName;
  tone: AuditTone;
}

const ACTION_META: Record<string, AuditActionMeta> = {
  TAILOR_APPLICATION_SUBMITTED: { label: 'Tailor application submitted', icon: 'document-text-outline', tone: 'info' },
  TAILOR_APPROVED: { label: 'Tailor approved', icon: 'checkmark-circle-outline', tone: 'success' },
  TAILOR_REJECTED: { label: 'Tailor rejected', icon: 'close-circle-outline', tone: 'error' },
  TAILOR_ASSIGNED_TO_ORDER: { label: 'Tailor assigned to order', icon: 'person-add-outline', tone: 'info' },
  TAILOR_REASSIGNED: { label: 'Tailor reassigned', icon: 'swap-horizontal-outline', tone: 'warning' },
  TAILOR_STATUS_CHANGED: { label: 'Tailor status changed', icon: 'sync-outline', tone: 'warning' },
  PAYMENT_UPDATED: { label: 'Payment updated', icon: 'card-outline', tone: 'info' },
  ADMIN_ACCOUNT_UNLOCKED: { label: 'Admin account unlocked', icon: 'lock-open-outline', tone: 'warning' },
  REFUND_CREATED: { label: 'Refund created', icon: 'cash-outline', tone: 'warning' },
  ORDER_CANCELLED: { label: 'Order cancelled', icon: 'close-circle-outline', tone: 'error' },
  ORDER_STATUS_CHANGED: { label: 'Order status changed', icon: 'sync-outline', tone: 'info' },
  ORDER_NOTES_UPDATED: { label: 'Order notes updated', icon: 'create-outline', tone: 'info' },
  ORDER_PICKUP_RESCHEDULED: { label: 'Pickup rescheduled', icon: 'calendar-outline', tone: 'warning' },
  STAFF_CREATED: { label: 'Staff created', icon: 'person-add-outline', tone: 'success' },
  STAFF_UPDATED: { label: 'Staff updated', icon: 'create-outline', tone: 'info' },
  STAFF_DELETED: { label: 'Staff deleted', icon: 'trash-outline', tone: 'error' },
  USER_STATUS_CHANGED: { label: 'User status changed', icon: 'sync-outline', tone: 'warning' },
  USER_DELETED: { label: 'User deleted', icon: 'trash-outline', tone: 'error' },
  BILLING_CONFIG_UPDATED: { label: 'Billing config updated', icon: 'settings-outline', tone: 'warning' },
  BROADCAST_INITIATED: { label: 'Broadcast initiated', icon: 'megaphone-outline', tone: 'info' },
  BROADCAST_ACCEPTED: { label: 'Broadcast accepted', icon: 'checkmark-circle-outline', tone: 'success' },
  BROADCAST_DECLINED: { label: 'Broadcast declined', icon: 'close-circle-outline', tone: 'warning' },
  BROADCAST_ESCALATED: { label: 'Broadcast escalated', icon: 'alert-circle-outline', tone: 'error' },
  LEAVE_REQUESTED: { label: 'Leave requested', icon: 'calendar-outline', tone: 'info' },
  LEAVE_APPROVED: { label: 'Leave approved', icon: 'checkmark-circle-outline', tone: 'success' },
  LEAVE_REJECTED: { label: 'Leave rejected', icon: 'close-circle-outline', tone: 'error' },
  LEAVE_CANCELLED: { label: 'Leave cancelled', icon: 'ban-outline', tone: 'warning' },
};

const DEFAULT_TONE: AuditTone = 'info';
const DEFAULT_ICON: IoniconName = 'ellipse-outline';

function humanizeAction(action: string): string {
  return action
    .toLowerCase()
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export function getAuditActionMeta(action: string): AuditActionMeta {
  return ACTION_META[action] ?? { label: humanizeAction(action), icon: DEFAULT_ICON, tone: DEFAULT_TONE };
}

export function toneColor(tone: AuditTone, colors: Record<string, string>): string {
  return colors[tone] ?? colors.info;
}
