import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, View } from 'react-native';
import { z } from 'zod';
import { Button, Header, Input, PasswordInput, RoleSelector, ScreenContent } from '@/components/ui';
import type { LoginRole } from '@/constants/roles';
import { useCreateStaffMutation } from '@/features/staff/hooks/useStaff';
import { useTheme } from '@/hooks/useTheme';

const staffSchema = z.object({
  firstName: z.string().min(2, 'First name is required'),
  lastName: z.string().min(2, 'Last name is required'),
  email: z.string().email('Valid email required'),
  mobile: z.string().regex(/^[6-9]\d{9}$/, 'Valid 10-digit mobile required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['employee', 'tailor', 'admin']),
});

type StaffFormData = z.infer<typeof staffSchema>;

interface AddStaffFormProps {
  /** POST /admin/staff accepts employee/tailor/admin uniformly (see
   * admin_service.create_staff, which returns a Tailor row alongside the
   * User when role === "tailor") - this form is shared by the Bridge and
   * Tailors sections rather than duplicated, differing only in which role
   * is preselected/locked and the header copy. */
  lockedRole?: Extract<LoginRole, 'employee' | 'tailor' | 'admin'>;
  title: string;
  subtitle: string;
}

export function AddStaffForm({ lockedRole, title, subtitle }: AddStaffFormProps) {
  const { colors } = useTheme();
  const createMutation = useCreateStaffMutation();

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<StaffFormData>({
    resolver: zodResolver(staffSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      mobile: '',
      password: '',
      role: lockedRole ?? 'employee',
    },
  });

  const selectedRole = watch('role');

  const onSubmit = (data: StaffFormData) => {
    createMutation.mutate(
      {
        first_name: data.firstName,
        last_name: data.lastName,
        email: data.email,
        mobile: data.mobile,
        password: data.password,
        role: data.role,
        is_active: true,
      },
      { onSuccess: () => router.back() },
    );
  };

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <Header title={title} subtitle={subtitle} showMenu={false} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
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
          {lockedRole ? null : (
            <RoleSelector
              label="Staff Role"
              value={selectedRole as LoginRole}
              onChange={(role) => setValue('role', role, { shouldValidate: true })}
              error={errors.role?.message}
            />
          )}
          <Button
            title={lockedRole === 'tailor' ? 'Create Tailor' : 'Create Staff'}
            onPress={handleSubmit(onSubmit)}
            loading={createMutation.isPending}
            fullWidth
          />
        </ScreenContent>
      </KeyboardAvoidingView>
    </View>
  );
}
