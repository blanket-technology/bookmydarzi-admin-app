// Shared with the Add-staff/Add-admin zod schemas (features/staff/components/
// AddStaffForm.tsx, admins/add.tsx) so edit screens for the same fields
// enforce identical rules instead of drifting looser than their Add-flow
// counterparts.
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const MOBILE_REGEX = /^[6-9]\d{9}$/;

export const isValidEmail = (value: string): boolean => EMAIL_REGEX.test(value.trim());
export const isValidMobile = (value: string): boolean => MOBILE_REGEX.test(value.trim());
