import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { View } from 'react-native';
import { z } from 'zod';
import { Button, Header, Input, PasswordInput, ScreenContent } from '@/components/ui';
import { useCreateStaffMutation } from '@/features/staff/hooks/useStaff';
import { useTheme } from '@/hooks/useTheme';

// No role picker here, unlike (drawer)/employees/add.tsx — this screen only
// ever registers 'admin' accounts. The backend enforces this independently
// (app/services/admin/staff_service.py's _CREATABLE_BY only lets a
// superadmin-role caller create an 'admin'/'superadmin' account), so this
// isn't the security boundary, just a form that can't submit anything else.
const adminSchema = z.object({
  firstName: z.string().min(2, 'First name is required'),
  lastName: z.string().min(2, 'Last name is required'),
  email: z.string().email('Valid email required'),
  mobile: z.string().regex(/^[6-9]\d{9}$/, 'Valid 10-digit mobile required'),
  // Mirrors backend's StaffCreateRequest.validate_password (app/schemas/
  // staff.py) exactly - min 6 chars, 1 uppercase, 1 digit.
  password: z
    .string()
    .min(6, 'Password must be at least 6 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});

type AdminFormData = z.infer<typeof adminSchema>;

export default function AddAdminScreen() {
  const { colors } = useTheme();
  const createMutation = useCreateStaffMutation();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<AdminFormData>({
    resolver: zodResolver(adminSchema),
    defaultValues: { firstName: '', lastName: '', email: '', mobile: '', password: '' },
  });

  const onSubmit = (data: AdminFormData) => {
    createMutation.mutate(
      {
        first_name: data.firstName,
        last_name: data.lastName,
        email: data.email,
        mobile: data.mobile,
        password: data.password,
        role: 'admin',
        is_active: true,
      },
      { onSuccess: () => router.back() },
    );
  };

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <Header title="Register Admin" subtitle="Create a new admin account" showBack />
      {/* ScreenContent already wraps itself in a correctly-configured
          KeyboardAvoidingView (avoidKeyboard defaults true) - this screen
          doesn't need its own, and nesting two caused Android to
          double-apply keyboard avoidance (one from this now-removed outer
          KAV, one from ScreenContent's), hiding/squishing the form. */}
      <ScreenContent keyboardShouldPersistTaps="handled">
          <Controller
            control={control}
            name="firstName"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="First Name"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.firstName?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="lastName"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Last Name"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.lastName?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Email"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.email?.message}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            )}
          />
          <Controller
            control={control}
            name="mobile"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Mobile"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.mobile?.message}
                keyboardType="phone-pad"
                maxLength={10}
              />
            )}
          />
          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, onBlur, value } }) => (
              <PasswordInput
                label="Password"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.password?.message}
              />
            )}
          />
          <Button
            title="Create Admin"
            onPress={() => void handleSubmit(onSubmit)()}
            loading={createMutation.isPending}
            fullWidth
          />
      </ScreenContent>
    </View>
  );
}
