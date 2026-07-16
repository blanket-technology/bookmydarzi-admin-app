export const ENDPOINTS = {
  AUTH: {
    LOGIN: '/api/v1/auth/email/login',
    REFRESH: '/api/v1/auth/refresh',
    LOGOUT: '/api/v1/auth/logout',
    MOBILE_REQUEST_OTP: '/api/v1/auth/mobile/request-otp',
    MOBILE_VERIFY_OTP: '/api/v1/auth/mobile/verify-otp',
    SIGNUP: '/api/v1/auth/email/signup',
    VERIFY_OTP: '/api/v1/auth/email/verify-otp',
    RESEND_OTP: '/api/v1/auth/email/resend-otp',
    FORGOT_PASSWORD_REQUEST: '/api/v1/auth/forgot-password/request',
    FORGOT_PASSWORD_VERIFY: '/api/v1/auth/forgot-password/verify',
    FORGOT_PASSWORD_RESET: '/api/v1/auth/forgot-password/reset',
  },
  USERS: {
    PROFILE: '/api/v1/users/profile',
    ME: '/api/v1/users/me',
    CHANGE_PASSWORD: '/api/v1/users/change-password',
  },
  ADMIN: {
    DASHBOARD: '/api/v1/admin/dashboard',
    USERS: '/api/v1/admin/users',
    USER_DETAIL: (userId: string) => `/api/v1/admin/users/${userId}`,
    USER_STATUS: (userId: string) => `/api/v1/admin/users/${userId}/status`,
    STAFF: '/api/v1/admin/staff',
    TAILORS: '/api/v1/admin/tailors',
    TAILORS_WORKLOAD: '/api/v1/admin/tailors/workload',
    TAILOR_APPLICATIONS: '/api/v1/admin/tailor-applications',
    TAILOR_APPLICATION_DETAIL: (applicationId: string) =>
      `/api/v1/admin/tailor-applications/${applicationId}`,
    TAILOR_APPLICATION_APPROVE: (applicationId: string) =>
      `/api/v1/admin/tailor-applications/${applicationId}/approve`,
    TAILOR_APPLICATION_REJECT: (applicationId: string) =>
      `/api/v1/admin/tailor-applications/${applicationId}/reject`,
    ORDERS: '/api/v1/admin/orders',
    ORDER_ASSIGN_TAILOR: (orderId: string) =>
      `/api/v1/admin/orders/${orderId}/assign-tailor`,
    ORDER_MEASUREMENT: (orderId: string) =>
      `/api/v1/admin/orders/${orderId}/measurement`,
    ORDER_STATUS: (orderId: string) => `/api/v1/admin/orders/${orderId}/status`,
    ORDER_CANCEL: (orderId: string) => `/api/v1/admin/orders/${orderId}/cancel`,
    ORDER_NOTES: (orderId: string) => `/api/v1/admin/orders/${orderId}/notes`,
    HOMEPAGE_BANNERS: '/api/v1/admin/homepage/banners',
    HOMEPAGE_BANNER: (bannerId: string) => `/api/v1/admin/homepage/banners/${bannerId}`,
    HOMEPAGE_CATEGORIES: '/api/v1/admin/homepage/categories',
    HOMEPAGE_CATEGORY: (categoryId: string) =>
      `/api/v1/admin/homepage/categories/${categoryId}`,
    HOMEPAGE_SUB_CATEGORIES: (categoryId: string) =>
      `/api/v1/admin/homepage/categories/${categoryId}/sub-categories`,
    HOMEPAGE_SUB_CATEGORY: (categoryId: string, subId: string) =>
      `/api/v1/admin/homepage/categories/${categoryId}/sub-categories/${subId}`,
    HOMEPAGE_SUB_CATEGORY_BY_ID: (subId: string) =>
      `/api/v1/admin/homepage/sub-categories/${subId}`,
    HOMEPAGE_OFFERS: '/api/v1/admin/homepage/offers',
    HOMEPAGE_OFFER: (offerId: string) => `/api/v1/admin/homepage/offers/${offerId}`,
    HOMEPAGE_CACHE_CLEAR: '/api/v1/admin/homepage/cache/clear',
  },
} as const;
