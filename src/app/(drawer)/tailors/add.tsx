import { AddTailorApplicationForm } from '@/features/applications/components/AddTailorApplicationForm';

// Tailor is no longer a role POST /admin/staff (AddStaffForm) can create -
// every tailor account must go through the TailorApplication review queue
// instead, admin-added or self-applied alike. See staff_service.py's module
// docstring on the backend for the full rationale.
export default function AddTailorScreen() {
  return <AddTailorApplicationForm />;
}
