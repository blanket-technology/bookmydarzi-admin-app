export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'bdm_access_token',
  REFRESH_TOKEN: 'bdm_refresh_token',
  REMEMBER_EMAIL: 'bdm_remember_email',
  // 'true' = keep the session across app restarts (default). 'false' = single
  // session: the stored session is cleared on next app launch (see
  // authContext initializeSession). Absent is treated as 'true' so sessions
  // created before this flag existed are never unexpectedly logged out.
  REMEMBER_ME: 'bdm_remember_me',
  SELECTED_ROLE: 'bdm_selected_role',
  THEME: 'bdm_theme',
  BIOMETRIC_LOCK: 'bdm_biometric_lock',
} as const;
