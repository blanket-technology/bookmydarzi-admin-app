import type { AxiosError } from 'axios';
import type { ApiError, HTTPValidationError, ValidationErrorItem } from '@/types/api';

export const isApiError = (error: unknown): error is ApiError =>
  typeof error === 'object' &&
  error !== null &&
  'message' in error &&
  typeof (error as ApiError).message === 'string';

export const parseApiError = (error: unknown): ApiError => {
  if (!error) {
    return { message: 'An unexpected error occurred' };
  }

  // An AxiosError also has a string `message` ("Request failed with status
  // code 400"), so it must NOT take this shortcut - its response body holds the
  // backend's real message, parsed below.
  if (!(error as AxiosError).isAxiosError && isApiError(error)) {
    return error;
  }

  const axiosError = error as AxiosError<HTTPValidationError & { message?: string; detail?: string }>;

  if (!axiosError.response) {
    if (axiosError.code === 'ECONNABORTED') {
      return { message: 'Request timed out. Please try again.', code: 'TIMEOUT' };
    }
    return {
      message: 'Network error. Please check your connection.',
      code: 'NETWORK_ERROR',
    };
  }

  const { status, data } = axiosError.response;
  let message = 'Something went wrong';
  const detail = data?.detail;

  if (typeof detail === 'string') {
    message = detail;
  } else if (Array.isArray(detail)) {
    message = (detail as ValidationErrorItem[]).map((item) => item.msg).join(', ');
  } else if (data?.message) {
    message = data.message;
  }

  return {
    message,
    status,
    details: data,
  };
};

/** True when the failure says nothing about the credentials themselves: no
 * connection, a timeout, rate limiting or a server/gateway error (e.g. a
 * sleeping Railway container). Callers must NOT treat these as "session
 * invalid" - the same token may well work a moment later. */
export const isTransientApiError = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') return false;
  const parsed = parseApiError(error);
  if (parsed.code === 'NETWORK_ERROR' || parsed.code === 'TIMEOUT' || parsed.code === 'SERVER_ERROR') return true;
  const raw = error as { code?: string; message?: string };
  if (raw.code === 'ERR_NETWORK' || raw.code === 'ECONNABORTED' || raw.message === 'Network Error') return true;
  return parsed.status === 429 || parsed.status === 408 || (parsed.status !== undefined && parsed.status >= 500);
};

export const enrichApiError = (
  apiError: ApiError,
  rawError?: unknown,
  url?: string,
): ApiError => {
  const axiosError = rawError as AxiosError | undefined;
  const endpoint =
    url ??
    (axiosError?.config
      ? `${axiosError.config.baseURL ?? ''}${axiosError.config.url ?? ''}`
      : undefined);

  return {
    ...apiError,
    details: apiError.details ?? axiosError?.response?.data,
    code: apiError.code ?? axiosError?.code,
    status: apiError.status ?? axiosError?.response?.status,
    ...(endpoint ? { endpoint } : {}),
  } as ApiError & { endpoint?: string };
};

const SERVER_ERROR_MESSAGE = 'Something went wrong on our side. Please try again in a moment.';

/** The message a person should read: plain language, no HTTP codes, URLs or
 * stack-ish detail. Server errors carry the backend's request id as a short
 * reference so support can find the exact failure in the logs. */
export const getUserFacingMessage = (error: unknown): string => {
  if (!error) return 'Something went wrong. Please try again.';
  const parsed = parseApiError(error);
  const details = parsed.details as { request_id?: unknown } | undefined;
  const ref =
    details && typeof details.request_id === 'string' ? ` (Ref: ${details.request_id.slice(0, 8)})` : '';

  if (parsed.status && parsed.status >= 500) return `${SERVER_ERROR_MESSAGE}${ref}`;
  if (parsed.status === 429) return 'Too many attempts. Please wait a moment and try again.';
  if (parsed.status === 404 && /^endpoint not found/i.test(parsed.message)) {
    return 'We could not find that. It may have been removed or moved.';
  }
  return parsed.message || 'Something went wrong. Please try again.';
};

/** Developer diagnostics (status, code, endpoint, body) - console only in dev builds. */
const logApiErrorDetail = (error: unknown): void => {
  if (!__DEV__) return;
  const parsed = parseApiError(error);
  const endpoint = (parsed as ApiError & { endpoint?: string }).endpoint;
  console.error('[API Error Detail]', {
    message: parsed.message,
    status: parsed.status,
    code: parsed.code,
    endpoint,
    details: parsed.details,
  });
};

// Used for toasts and inline error states. Always returns the clean,
// user-facing message; technical detail goes to the dev console only.
export const formatApiErrorDetail = (error: unknown): string => {
  if (!error) return '';
  logApiErrorDetail(error);
  return getUserFacingMessage(error);
};

// Bare message for toasts.
export const getMutationError = (error: unknown): string => getUserFacingMessage(error);

/** Exact rupees-and-paise for anything that is paid out, refunded or reconciled
 * (formatCurrency rounds to whole rupees and is only for dashboard summaries). */
export const formatMoney = (amount?: number | string | null): string => {
  const value = Number(amount ?? 0);
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);
};

export const formatCurrency = (amount?: number): string => {
  if (amount === undefined || amount === null) return '₹0';
  // Whole rupees stay clean ("₹500"); a fractional amount keeps its paise
  // ("₹12.50", "₹49.50 off") instead of being silently rounded.
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: Number.isInteger(amount) ? 0 : 2,
  }).format(amount);
};

export const formatDate = (date?: string): string => {
  if (!date) return '-';
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date));
};

export const formatDateTime = (date?: string): string => {
  if (!date) return '-';
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
};

export const capitalize = (value?: string): string => {
  if (!value) return '';
  return value.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
};
