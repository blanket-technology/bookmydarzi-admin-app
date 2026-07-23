// LoginRole no longer names a login-time role selector (removed — the
// server is the sole source of truth for a user's role). It's still used
// where an admin picks a role FOR SOMEONE ELSE, e.g. creating a new staff
// account in (drawer)/employees/add.tsx.
export type LoginRole = 'admin' | 'employee' | 'tailor';

export const LOGIN_ROLES: { label: string; value: LoginRole }[] = [
  { label: 'Admin', value: 'admin' },
  { label: 'Employee', value: 'employee' },
  { label: 'Tailor', value: 'tailor' },
];
