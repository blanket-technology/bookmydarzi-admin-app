export const QUERY_KEYS = {
  DASHBOARD: ['dashboard'] as const,
  ORDERS: (params?: Record<string, unknown>) => ['orders', params] as const,
  ORDER: (id: string) => ['order', id] as const,
  USERS: (params?: Record<string, unknown>) => ['users', params] as const,
  USER: (id: string) => ['user', id] as const,
  STAFF: (params?: Record<string, unknown>) => ['staff', params] as const,
  TAILORS: (params?: Record<string, unknown>) => ['tailors', params] as const,
  TAILOR_WORKLOAD: ['tailor-workload'] as const,
  APPLICATIONS: (params?: Record<string, unknown>) => ['applications', params] as const,
  APPLICATION: (id: string) => ['application', id] as const,
  PROFILE: ['profile'] as const,
} as const;
