export const ENDPOINTS = {
  AUTH: {
    LOGIN: '/api/v1/auth/email/login',
    LOGIN_VERIFY_OTP: '/api/v1/auth/email/login/verify-otp',
    LOGIN_RESEND_OTP: '/api/v1/auth/email/login/resend-otp',
    REFRESH: '/api/v1/auth/refresh',
    LOGOUT: '/api/v1/auth/logout',
    FORGOT_PASSWORD_REQUEST: '/api/v1/auth/forgot-password/request',
    FORGOT_PASSWORD_VERIFY: '/api/v1/auth/forgot-password/verify',
    FORGOT_PASSWORD_RESET: '/api/v1/auth/forgot-password/reset',
  },
  USERS: {
    PROFILE: '/api/v1/users/profile',
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
  EMPLOYEE: {
    ORDER_ACCEPT: (orderId: string) => `/api/v1/employee/orders/${orderId}/accept`,
    ORDER_REJECT: (orderId: string) => `/api/v1/employee/orders/${orderId}/reject`,
    ORDER_SCHEDULE_PICKUP: (orderId: string) =>
      `/api/v1/employee/orders/${orderId}/schedule-pickup`,
    ORDER_CONFIRM_PICKUP: (orderId: string) => `/api/v1/employee/orders/${orderId}/pickup`,
    ORDER_HAND_TO_TAILOR: (orderId: string) =>
      `/api/v1/employee/orders/${orderId}/hand-to-tailor`,
    ORDER_DELIVERY: (orderId: string) => `/api/v1/employee/orders/${orderId}/delivery`,
    ORDER_COMPLETE: (orderId: string) => `/api/v1/employee/orders/${orderId}/complete`,
    ORDER_COLLECT_PAYMENT: (orderId: string) =>
      `/api/v1/employee/orders/${orderId}/collect-payment`,
  },
  ORDERS: {
    MY_ORDERS: '/api/v1/orders/my-orders',
    UPDATE_STATUS: (orderId: string) => `/api/v1/orders/${orderId}/status`,
    PHOTOS: (orderId: string) => `/api/v1/orders/${orderId}/photos`,
  },
  PAYMENTS: {
    BY_ORDER: (orderId: string) => `/api/v1/payments/order/${orderId}`,
    BY_ID: (paymentId: string) => `/api/v1/payments/${paymentId}`,
    UPDATE_STATUS: (paymentId: string) => `/api/v1/payments/${paymentId}/status`,
    REFUND: (paymentId: string) => `/api/v1/payments/${paymentId}/refund`,
  },
  NOTIFICATIONS: {
    LIST: '/api/v1/notifications',
    UNREAD_COUNT: '/api/v1/notifications/unread-count',
    MARK_READ: (notificationId: string) => `/api/v1/notifications/${notificationId}/read`,
    MARK_ALL_READ: '/api/v1/notifications/read-all',
  },
  CHAT: {
    SESSIONS: '/api/v1/admin/chat/sessions',
    MESSAGES: (sessionUuid: string) => `/api/v1/admin/chat/sessions/${sessionUuid}/messages`,
    ASSIGN: (sessionUuid: string) => `/api/v1/admin/chat/sessions/${sessionUuid}/assign`,
    RESOLVE: (sessionUuid: string) => `/api/v1/admin/chat/sessions/${sessionUuid}/resolve`,
    ESCALATE: (sessionUuid: string) => `/api/v1/admin/chat/sessions/${sessionUuid}/escalate`,
    QUICK_REPLIES: '/api/v1/admin/chat/quick-replies',
    WS: (sessionUuid: string) => `/api/v1/ws/chat/${sessionUuid}`,
  },
} as const;
