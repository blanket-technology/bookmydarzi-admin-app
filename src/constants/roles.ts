export type LoginRole = 'admin' | 'employee' | 'tailor';

export const LOGIN_ROLES: { label: string; value: LoginRole }[] = [
  { label: 'Admin', value: 'admin' },
  { label: 'Employee', value: 'employee' },
  { label: 'Tailor', value: 'tailor' },
];

export const roleMatchesSession = (
  selectedRole: LoginRole,
  userRole: string,
): boolean => {
  if (userRole === selectedRole) return true;
  if (selectedRole === 'admin' && (userRole === 'admin' || userRole === 'superadmin')) {
    return true;
  }
  return false;
};
