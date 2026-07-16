export interface ApiError {
  message: string;
  status?: number;
  code?: string;
  details?: unknown;
  endpoint?: string;
}

export interface PaginatedResponse<T> {
  items?: T[];
  data?: T[];
  total: number;
  page?: number;
  limit?: number;
}

export interface ValidationErrorItem {
  loc: (string | number)[];
  msg: string;
  type: string;
}

export interface HTTPValidationError {
  detail: ValidationErrorItem[] | string;
}
