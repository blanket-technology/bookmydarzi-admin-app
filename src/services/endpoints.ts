export const ENDPOINTS = {
  // Generic authenticated app-wide socket (app/api/v1/endpoints/ws.py) -
  // distinct from CHAT.WS below, which is a separate per-session endpoint.
  // Every connected client joins "user:{id}" automatically server-side;
  // this is what NOTIFICATION events (and any future app-wide push) arrive on.
  WS: '/api/v1/ws',
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
    PROFILE_PHOTO: '/api/v1/users/profile/photo',
    CHANGE_PASSWORD: '/api/v1/users/change-password',
    CHANGE_EMAIL_REQUEST: '/api/v1/users/change-email/request',
    CHANGE_EMAIL_VERIFY: '/api/v1/users/change-email/verify',
    CHANGE_MOBILE_CURRENT_REQUEST: '/api/v1/users/change-mobile/verify-current/request',
    CHANGE_MOBILE_CURRENT_VERIFY: '/api/v1/users/change-mobile/verify-current',
    CHANGE_MOBILE_REQUEST: '/api/v1/users/change-mobile/request',
    CHANGE_MOBILE_VERIFY: '/api/v1/users/change-mobile/verify',
  },
  ADMIN: {
    DASHBOARD: '/api/v1/admin/dashboard',
    USERS: '/api/v1/admin/users',
    USER_DETAIL: (userId: string) => `/api/v1/admin/users/${userId}`,
    USER_STATUS: (userId: string) => `/api/v1/admin/users/${userId}/status`,
    USER_PHOTO: (userId: string) => `/api/v1/admin/users/${userId}/photo`,
    CUSTOMER_FULL_DETAIL: (userId: string) => `/api/v1/admin/customers/${userId}/full-detail`,
    AUDIT_LOGS: '/api/v1/admin/audit-logs',
    STAFF: '/api/v1/admin/staff',
    STAFF_PAGINATED: '/api/v1/admin/staff/paginated',
    STAFF_DETAIL: (staffId: string) => `/api/v1/admin/staff/${staffId}`,
    STAFF_BRIDGE_PROFILE: (staffId: string) => `/api/v1/admin/staff/${staffId}/bridge-profile`,
    STAFF_VERIFICATION: (staffId: string) => `/api/v1/admin/staff/${staffId}/verification`,
    STAFF_KYC: (staffId: string) => `/api/v1/admin/staff/${staffId}/kyc`,
    TAILORS: '/api/v1/admin/tailors',
    TAILORS_PAGINATED: '/api/v1/admin/tailors/paginated',
    TAILORS_WORKLOAD: '/api/v1/admin/tailors/workload',
    TAILOR_DETAIL: (tailorId: string) => `/api/v1/admin/tailors/${tailorId}`,
    TAILOR_KYC: (tailorId: string) => `/api/v1/admin/tailors/${tailorId}/kyc`,
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
    ORDER_ASSIGN_PICKUP_EMPLOYEE: (orderId: string) =>
      `/api/v1/admin/orders/${orderId}/assign-pickup-employee`,
    ORDER_ASSIGN_DELIVERY_EMPLOYEE: (orderId: string) =>
      `/api/v1/admin/orders/${orderId}/assign-delivery-employee`,
    ORDER_ASSIGN_RETURN_EMPLOYEE: (orderId: string) =>
      `/api/v1/admin/orders/${orderId}/assign-return-employee`,
    ORDER_ASSIGN_REPAIR_PICKUP_EMPLOYEE: (orderId: string) =>
      `/api/v1/admin/orders/${orderId}/assign-repair-pickup-employee`,
    ORDER_ASSIGN_REPAIR_DELIVERY_EMPLOYEE: (orderId: string) =>
      `/api/v1/admin/orders/${orderId}/assign-repair-delivery-employee`,
    BRIDGE_EMPLOYEES: '/api/v1/admin/bridge-employees',
    ORDER_MEASUREMENT: (orderId: string) =>
      `/api/v1/admin/orders/${orderId}/measurement`,
    ORDER_STATUS: (orderId: string) => `/api/v1/admin/orders/${orderId}/status`,
    ORDER_CANCEL: (orderId: string) => `/api/v1/admin/orders/${orderId}/cancel`,
    ORDER_CANCELLATION_PREVIEW: (orderId: string) => `/api/v1/admin/orders/${orderId}/cancellation-preview`,
    ORDER_CANCELLATION_RECORD: (orderId: string) => `/api/v1/admin/orders/${orderId}/cancellation`,
    ORDER_ITEM_CANCEL: (orderId: string, itemId: string) =>
      `/api/v1/admin/orders/${orderId}/items/${itemId}/cancel`,
    ORDER_ITEM_CANCELLATION_PREVIEW: (orderId: string, itemId: string) =>
      `/api/v1/admin/orders/${orderId}/items/${itemId}/cancellation-preview`,
    ORDER_NOTES: (orderId: string) => `/api/v1/admin/orders/${orderId}/notes`,
    ORDER_BROADCAST: (orderId: string) => `/api/v1/admin/orders/${orderId}/broadcast`,
    HOMEPAGE_BANNERS: '/api/v1/admin/homepage/banners',
    HOMEPAGE_BANNER: (bannerId: string) => `/api/v1/admin/homepage/banners/${bannerId}`,
    HOMEPAGE_BANNER_UPLOAD_IMAGE: '/api/v1/admin/homepage/banners/upload-image',
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
    HOMEPAGE_OFFER_UPLOAD_IMAGE: '/api/v1/admin/homepage/offers/upload-image',
    HOMEPAGE_CACHE_CLEAR: '/api/v1/admin/homepage/cache/clear',
    CANCELLATIONS: '/api/v1/admin/cancellations',
    CANCELLATION_DETAIL: (id: string) => `/api/v1/admin/cancellations/${id}`,
    CANCELLATION_APPROVE: (id: string) => `/api/v1/admin/cancellations/${id}/approve`,
    CANCELLATION_REJECT: (id: string) => `/api/v1/admin/cancellations/${id}/reject`,
    CANCELLATION_POLICY: '/api/v1/admin/cancellation-policy',
    CANCELLATION_POLICY_STAGE: (stage: string) => `/api/v1/admin/cancellation-policy/${stage}`,
    AUDIT_LOG_FILTERS: '/api/v1/admin/audit-logs/filters',
    BILLING_SETTINGS: '/api/v1/admin/settings/billing',
    DASHBOARD_EXPORT: '/api/v1/admin/dashboard/export',
    PAYOUTS: '/api/v1/admin/payouts',
    PAYOUT_MARK_PAID: (payoutId: string) => `/api/v1/admin/payouts/${payoutId}/mark-paid`,
    PAYOUT_SUMMARY: (tailorId: string) => `/api/v1/admin/payouts/summary/${tailorId}`,
    COMMISSION_RATES: '/api/v1/admin/commission-rates',
    COMMISSION_RATE_DETAIL: (rateId: string) => `/api/v1/admin/commission-rates/${rateId}`,
    BRIDGE_PAYOUTS: '/api/v1/admin/bridge-payouts',
    BRIDGE_PAYOUT_MARK_PAID: (payoutId: string) => `/api/v1/admin/bridge-payouts/${payoutId}/mark-paid`,
    BRIDGE_PAYOUT_SUMMARY: (employeeId: string) => `/api/v1/admin/bridge-payouts/summary/${employeeId}`,
    BRIDGE_LEG_RATES: '/api/v1/admin/bridge-leg-rates',
    BRIDGE_LEG_RATE_DETAIL: (rateId: string) => `/api/v1/admin/bridge-leg-rates/${rateId}`,
  },
  LOCATION: {
    ADMIN_SERVICE_AREAS: '/api/v1/location/admin/service-areas',
    ADMIN_SERVICE_AREA_DETAIL: (areaId: string) => `/api/v1/location/admin/service-areas/${areaId}`,
    ADMIN_SERVICE_AREA_INTERESTS: '/api/v1/location/admin/service-area-interests',
  },
  EMPLOYEE: {
    ORDER_ACCEPT: (orderId: string) => `/api/v1/employee/orders/${orderId}/accept`,
    ORDER_REJECT: (orderId: string) => `/api/v1/employee/orders/${orderId}/reject`,
    ORDER_ASSIGN_TAILOR: (orderId: string) =>
      `/api/v1/employee/orders/${orderId}/assign-tailor`,
    ORDER_SCHEDULE_PICKUP: (orderId: string) =>
      `/api/v1/employee/orders/${orderId}/schedule-pickup`,
    ORDER_CONFIRM_PICKUP: (orderId: string) => `/api/v1/employee/orders/${orderId}/pickup`,
    ORDER_HAND_TO_TAILOR: (orderId: string) =>
      `/api/v1/employee/orders/${orderId}/hand-to-tailor`,
    ORDER_DELIVERY: (orderId: string) => `/api/v1/employee/orders/${orderId}/delivery`,
    ORDER_COMPLETE: (orderId: string) => `/api/v1/employee/orders/${orderId}/complete`,
    ORDER_REFUSE_DELIVERY: (orderId: string) =>
      `/api/v1/employee/orders/${orderId}/refuse-delivery`,
    ORDER_COLLECT_PAYMENT: (orderId: string) =>
      `/api/v1/employee/orders/${orderId}/collect-payment`,
    ORDER_PAYMENT_QR: (orderId: string) => `/api/v1/employee/orders/${orderId}/payment-qr`,
    ORDER_PAYMENT_QR_CANCEL: (orderId: string) =>
      `/api/v1/employee/orders/${orderId}/payment-qr/cancel`,
    ORDER_PAYMENT_STATUS: (orderId: string) =>
      `/api/v1/employee/orders/${orderId}/payment-status`,
    ORDER_MEASUREMENT: (orderId: string) =>
      `/api/v1/employee/orders/${orderId}/measurement`,
    ORDER_ADD_ADDON: (orderId: string) => `/api/v1/employee/orders/${orderId}/addons`,
    TAILORS: '/api/v1/employee/tailors',
    ONLINE_STATUS: '/api/v1/employee/me/online',
    DELIVERY_BROADCASTS: '/api/v1/employee/delivery-broadcasts',
    DELIVERY_BROADCAST_ACCEPT: (orderId: string) =>
      `/api/v1/employee/orders/${orderId}/delivery-broadcast/accept`,
    DELIVERY_BROADCAST_DECLINE: (orderId: string) =>
      `/api/v1/employee/orders/${orderId}/delivery-broadcast/decline`,
    DELIVERY_BROADCAST_BACK_OUT: (orderId: string) =>
      `/api/v1/employee/orders/${orderId}/delivery-broadcast/back-out`,
    // Pickup broadcast (Rapido-style FCFS pickup-leg claim), mirrors delivery.
    PICKUP_BROADCASTS: '/api/v1/employee/pickup-broadcasts',
    PICKUP_BROADCAST_ACCEPT: (orderId: string) =>
      `/api/v1/employee/orders/${orderId}/pickup-broadcast/accept`,
    PICKUP_BROADCAST_DECLINE: (orderId: string) =>
      `/api/v1/employee/orders/${orderId}/pickup-broadcast/decline`,
    PICKUP_BROADCAST_BACK_OUT: (orderId: string) =>
      `/api/v1/employee/orders/${orderId}/pickup-broadcast/back-out`,
    // Return broadcast (post-cancellation reverse trip), mirrors delivery.
    RETURN_BROADCASTS: '/api/v1/employee/return-broadcasts',
    RETURN_BROADCAST_ACCEPT: (orderId: string) =>
      `/api/v1/employee/orders/${orderId}/return-broadcast/accept`,
    RETURN_BROADCAST_DECLINE: (orderId: string) =>
      `/api/v1/employee/orders/${orderId}/return-broadcast/decline`,
    RETURN_BROADCAST_BACK_OUT: (orderId: string) =>
      `/api/v1/employee/orders/${orderId}/return-broadcast/back-out`,
    RETURN_IN_TRANSIT: (orderId: string) => `/api/v1/employee/orders/${orderId}/return/in-transit`,
    RETURN_COMPLETE: (orderId: string) => `/api/v1/employee/orders/${orderId}/return/complete`,
    // Repair-pickup broadcast (garment at customer's home -> tailor, post-
    // delivery repair loop), mirrors pickup's geography.
    REPAIR_PICKUP_BROADCASTS: '/api/v1/employee/repair-pickup-broadcasts',
    REPAIR_PICKUP_BROADCAST_ACCEPT: (orderId: string) =>
      `/api/v1/employee/orders/${orderId}/repair-pickup-broadcast/accept`,
    REPAIR_PICKUP_BROADCAST_DECLINE: (orderId: string) =>
      `/api/v1/employee/orders/${orderId}/repair-pickup-broadcast/decline`,
    REPAIR_PICKUP_BROADCAST_BACK_OUT: (orderId: string) =>
      `/api/v1/employee/orders/${orderId}/repair-pickup-broadcast/back-out`,
    REPAIR_PICKUP_IN_TRANSIT: (orderId: string) =>
      `/api/v1/employee/orders/${orderId}/repair-pickup/in-transit`,
    REPAIR_PICKUP_DELIVERED_TO_TAILOR: (orderId: string) =>
      `/api/v1/employee/orders/${orderId}/repair-pickup/delivered-to-tailor`,
    // Repair-delivery broadcast (repaired garment at tailor -> customer),
    // mirrors delivery's geography.
    REPAIR_DELIVERY_BROADCASTS: '/api/v1/employee/repair-delivery-broadcasts',
    REPAIR_DELIVERY_BROADCAST_ACCEPT: (orderId: string) =>
      `/api/v1/employee/orders/${orderId}/repair-delivery-broadcast/accept`,
    REPAIR_DELIVERY_BROADCAST_DECLINE: (orderId: string) =>
      `/api/v1/employee/orders/${orderId}/repair-delivery-broadcast/decline`,
    REPAIR_DELIVERY_BROADCAST_BACK_OUT: (orderId: string) =>
      `/api/v1/employee/orders/${orderId}/repair-delivery-broadcast/back-out`,
    REPAIR_DELIVERY_IN_TRANSIT: (orderId: string) =>
      `/api/v1/employee/orders/${orderId}/repair-delivery/in-transit`,
    REPAIR_DELIVERY_COMPLETE: (orderId: string) =>
      `/api/v1/employee/orders/${orderId}/repair-delivery/complete`,
    MY_BRIDGE_PROFILE: '/api/v1/employee/me/bridge-profile',
    MY_KYC: '/api/v1/employee/me/kyc',
    MY_PAYOUTS: '/api/v1/employee/me/payouts',
    MY_PAYOUT_SUMMARY: '/api/v1/employee/me/payouts/summary',
  },
  TAILOR: {
    BROADCASTS: '/api/v1/tailor/orders/broadcasts',
    BROADCAST_ACCEPT: (orderId: string) => `/api/v1/tailor/orders/${orderId}/broadcast/accept`,
    BROADCAST_DECLINE: (orderId: string) => `/api/v1/tailor/orders/${orderId}/broadcast/decline`,
    ONLINE_STATUS: '/api/v1/tailors/me/online',
    ME: '/api/v1/tailors/me',
    PORTFOLIO_UPLOAD: '/api/v1/tailors/me/portfolio/upload',
    MY_KYC: '/api/v1/tailors/me/kyc',
    MY_PAYOUTS: '/api/v1/tailors/me/payouts',
    MY_PAYOUT_SUMMARY: '/api/v1/tailors/me/payouts/summary',
  },
  // Shared by both Tailor and Bridge/Employee roles - same backend routes,
  // require_roles(TAILOR, EMPLOYEE) (app/api/v1/endpoints/leave_request.py).
  LEAVE: {
    LIST_MY: '/api/v1/leave-requests/my',
    CREATE: '/api/v1/leave-requests',
    CANCEL: (requestId: string) => `/api/v1/leave-requests/${requestId}/cancel`,
    // Admin/superadmin review - require_admin_permission(ADMIN, SUPERADMIN,
    // screen="leave_requests") (app/api/v1/endpoints/leave_request.py).
    ADMIN_LIST: '/api/v1/admin/leave-requests',
    ADMIN_APPROVE: (requestId: string) => `/api/v1/admin/leave-requests/${requestId}/approve`,
    ADMIN_REJECT: (requestId: string) => `/api/v1/admin/leave-requests/${requestId}/reject`,
  },
  REVIEWS: {
    // Admin/superadmin moderation - require_admin_permission(ADMIN,
    // SUPERADMIN, screen="orders") (app/api/v1/endpoints/admin_reviews.py).
    LIST: '/api/v1/admin/reviews',
    HIDE: (reviewId: number) => `/api/v1/admin/reviews/${reviewId}/hide`,
    UNHIDE: (reviewId: number) => `/api/v1/admin/reviews/${reviewId}/unhide`,
    DELETE: (reviewId: number) => `/api/v1/admin/reviews/${reviewId}`,
  },
  ORDERS: {
    MY_ORDERS: '/api/v1/orders/my-orders',
    DETAIL: (orderId: string) => `/api/v1/orders/${orderId}`,
    UPDATE_STATUS: (orderId: string) => `/api/v1/orders/${orderId}/status`,
    COMPLETE_REPAIR: (orderId: string) => `/api/v1/orders/${orderId}/complete-repair`,
    PHOTOS: (orderId: string) => `/api/v1/orders/${orderId}/photos`,
    INVOICE: (orderId: string) => `/api/v1/orders/${orderId}/invoice`,
    BROADCAST_STATUS: (orderId: string) => `/api/v1/tailor/orders/${orderId}/broadcast/status`,
  },
  PAYMENTS: {
    BY_ORDER: (orderId: string) => `/api/v1/payments/order/${orderId}`,
    BY_ID: (paymentId: string) => `/api/v1/payments/${paymentId}`,
    UPDATE_STATUS: (paymentId: string) => `/api/v1/payments/${paymentId}/status`,
    REFUND: (paymentId: string) => `/api/v1/payments/${paymentId}/refund`,
    REFUND_MARK_MANUAL: (paymentId: string, refundId: string) =>
      `/api/v1/payments/${paymentId}/refund/${refundId}/manual`,
  },
  MEASUREMENTS: {
    LIST: '/api/v1/users/measurements',
    DETAIL: (measurementId: string) => `/api/v1/users/measurements/${measurementId}`,
  },
  SUPPORT: {
    TICKETS: '/api/v1/support/tickets',
    TICKET_DETAIL: (ticketId: string) => `/api/v1/support/tickets/${ticketId}`,
    TICKET_MESSAGES: (ticketId: string) => `/api/v1/support/tickets/${ticketId}/messages`,
    TICKET_STATUS: (ticketId: string) => `/api/v1/support/tickets/${ticketId}/status`,
    FAQS: '/api/v1/support/faqs',
    FAQ_DETAIL: (faqId: string) => `/api/v1/support/faqs/${faqId}`,
  },
  INVENTORY: {
    LIST: '/api/v1/inventory',
    DETAIL: (itemId: string) => `/api/v1/inventory/${itemId}`,
  },
  LOOKBOOK: {
    LIST: '/api/v1/lookbook',
    ADMIN_LIST: '/api/v1/admin/lookbook',
    ADMIN_DETAIL: (itemId: string) => `/api/v1/admin/lookbook/${itemId}`,
    ADMIN_UPLOAD_IMAGE: '/api/v1/admin/lookbook/upload-image',
  },
  CATALOG: {
    TREE: '/api/v1/catalog/categories/tree',
    ADMIN_TREE: '/api/v1/catalog/admin/tree',
    UPLOAD_IMAGE: '/api/v1/catalog/upload-image',
    CATEGORIES: '/api/v1/catalog/categories',
    CATEGORY_DETAIL: (categoryId: string) => `/api/v1/catalog/categories/${categoryId}`,
    SERVICE_LINES: '/api/v1/catalog/service-lines',
    SERVICE_LINE_DETAIL: (lineId: string) => `/api/v1/catalog/service-lines/${lineId}`,
    SERVICES: '/api/v1/catalog/services',
    SERVICE_DETAIL: (serviceId: string) => `/api/v1/catalog/services/${serviceId}`,
    SERVICE_ADDONS: (serviceId: string | number) => `/api/v1/catalog/services/${serviceId}/addons`,
    ADMIN_SERVICE_ADDONS: (serviceId: string | number) => `/api/v1/catalog/admin/services/${serviceId}/addons`,
    ADMIN_SERVICE_ADDON_DETAIL: (serviceId: string | number, addonId: string | number) =>
      `/api/v1/catalog/admin/services/${serviceId}/addons/${addonId}`,
  },
  NOTIFICATIONS: {
    LIST: '/api/v1/notifications',
    UNREAD_COUNT: '/api/v1/notifications/unread-count',
    MARK_READ: (notificationId: string) => `/api/v1/notifications/${notificationId}/read`,
    MARK_ALL_READ: '/api/v1/notifications/read-all',
    DEVICE_TOKENS: '/api/v1/notifications/device-tokens',
    ADMIN_BROADCAST: '/api/v1/admin/notifications/broadcast',
  },
  CHAT: {
    SESSIONS: '/api/v1/admin/chat/sessions',
    SESSION_DETAIL: (sessionUuid: string) => `/api/v1/chat/v2/sessions/${sessionUuid}`,
    MESSAGES: (sessionUuid: string) => `/api/v1/admin/chat/sessions/${sessionUuid}/messages`,
    ASSIGN: (sessionUuid: string) => `/api/v1/admin/chat/sessions/${sessionUuid}/assign`,
    RESOLVE: (sessionUuid: string) => `/api/v1/admin/chat/sessions/${sessionUuid}/resolve`,
    ESCALATE: (sessionUuid: string) => `/api/v1/admin/chat/sessions/${sessionUuid}/escalate`,
    ASSIGNMENT_HISTORY: (sessionUuid: string) =>
      `/api/v1/admin/chat/sessions/${sessionUuid}/assignment-history`,
    QUICK_REPLIES: '/api/v1/admin/chat/quick-replies',
    UPLOAD: '/api/v1/chat/v2/upload',
    WS: (sessionUuid: string) => `/api/v1/ws/chat/${sessionUuid}`,
    // Bug fix: both were missing the /chat segment - chat_v2's admin_router
    // is mounted at /admin/chat (see app/api/v1/router.py), not /admin, so
    // these 404'd every time ("Endpoint not found: /api/v1/admin/agents/
    // {id}/status") instead of ever reaching the real backend route.
    MY_AGENT_STATUS: '/api/v1/admin/chat/agents/me/status',
    AGENT_STATUS: (agentId: number) => `/api/v1/admin/chat/agents/${agentId}/status`,
    ANALYTICS: '/api/v1/admin/chat/analytics',
  },
  RBAC: {
    SCREENS: '/api/v1/rbac/screens',
    PERMISSIONS: '/api/v1/rbac/permissions',
    MY_EFFECTIVE: '/api/v1/rbac/user-permissions/me/effective',
    EFFECTIVE: (userId: number | string) => `/api/v1/rbac/user-permissions/${userId}/effective`,
    GRANT: '/api/v1/rbac/user-permissions/grant',
    REVOKE: '/api/v1/rbac/user-permissions/revoke',
    CLEAR_OVERRIDE: (mappingId: number) => `/api/v1/rbac/user-permissions/${mappingId}`,
    LOCKOUT_STATUS: (userId: number | string) =>
      `/api/v1/rbac/user-permissions/${userId}/lockout-status`,
    UNLOCK: (userId: number | string) => `/api/v1/rbac/user-permissions/${userId}/unlock`,
  },
} as const;
