import { AddStaffForm } from '@/features/staff/components/AddStaffForm';

// Bridge staff are Employee accounts; an Admin cannot create Admin accounts, so
// the role picker is not offered here.
export default function AddStaffScreen() {
  return <AddStaffForm lockedRole="employee" title="Add Staff" subtitle="Create new employee account" />;
}
