import { t } from '@/i18n';
import { toast } from '@/store/toastStore';

export type AmountInput = { ok: true; value: number | undefined } | { ok: false };

/**
 * Strict parse of a money field typed by a person. Accepts digits with an
 * optional decimal part of up to 2 places ("499", "499.5", "499,50" - a comma is
 * treated as the decimal separator). Blank is valid and means "not provided".
 *
 * Never use Number(raw) for money: "1,500" or "abc" become NaN, JSON.stringify
 * turns NaN into null, and the backend reads null as "use the default" - which
 * for refunds means refunding the full amount.
 */
export const parseAmountInput = (raw: string, options?: { max?: number }): AmountInput => {
  const trimmed = raw.trim().replace(',', '.');
  if (!trimmed) return { ok: true, value: undefined };
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return { ok: false };
  const value = Number(trimmed);
  if (!Number.isFinite(value) || value <= 0) return { ok: false };
  if (options?.max !== undefined && value > options.max) return { ok: false };
  return { ok: true, value };
};

/** Parse and toast on failure. Returns undefined when invalid (caller must stop). */
export const requireAmountInput = (
  raw: string,
  options?: { max?: number },
): { value: number | undefined } | null => {
  const parsed = parseAmountInput(raw, options);
  if (!parsed.ok) {
    toast.error(t('common.invalidAmount'));
    return null;
  }
  return { value: parsed.value };
};
