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

  if (isApiError(error)) {
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

export const formatApiErrorDetail = (error: unknown): string => {
  const parsed = parseApiError(error);
  const endpoint = (parsed as ApiError & { endpoint?: string }).endpoint;
  const parts = [
    parsed.message,
    parsed.status ? `HTTP ${parsed.status}` : null,
    parsed.code ? `(${parsed.code})` : null,
    endpoint ? `→ ${endpoint}` : null,
  ].filter(Boolean);

  if (parsed.details && typeof parsed.details === 'object') {
    try {
      const body = JSON.stringify(parsed.details);
      if (body !== '{}' && body.length < 280) {
        parts.push(body);
      }
    } catch {
      // ignore serialization errors
    }
  }

  const message = parts.join(' ');
  if (__DEV__) {
    console.error('[API Error Detail]', message, parsed);
  }
  return message;
};

export const formatCurrency = (amount?: number): string => {
  if (amount === undefined || amount === null) return '₹0';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
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
