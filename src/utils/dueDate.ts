/**
 * Delivery-date helpers shared by every order screen, so "when is this due" reads
 * the same for tailors, bridge staff and admins. Pure (no React/i18n).
 *
 * The backend sends the promised date as a calendar date in IST
 * (ExpectedDeliveryDateIso, e.g. "2026-10-12"). Date-only strings are parsed as a
 * LOCAL calendar day, so the day never shifts with the device timezone.
 */
export type DueTone = 'overdue' | 'today' | 'soon' | 'ok';

export interface DueInfo {
  tone: DueTone;
  /** Whole calendar days from today to the due date (negative = overdue). */
  daysLeft: number;
  date: Date;
}

const parseDue = (value: string): Date | null => {
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  const d = dateOnly ? new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3])) : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

const startOfDay = (d: Date): number => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

export const getDueInfo = (value: string | null | undefined, now: Date = new Date()): DueInfo | null => {
  if (!value) return null;
  const date = parseDue(value);
  if (!date) return null;
  const daysLeft = Math.round((startOfDay(date) - startOfDay(now)) / 86_400_000);
  const tone: DueTone = daysLeft < 0 ? 'overdue' : daysLeft === 0 ? 'today' : daysLeft <= 2 ? 'soon' : 'ok';
  return { tone, daysLeft, date };
};

/** Orders past the point where a delivery date still matters. */
const FINISHED = new Set([
  'delivered',
  'completed',
  'cancelled',
  'order_rejected',
  'inspection_window',
  'delivery_refused',
  'returned',
  'return_pending',
  'return_scheduled',
  'return_in_transit',
]);

export const isDueRelevant = (status: string | null | undefined): boolean => !FINISHED.has(String(status ?? ''));
