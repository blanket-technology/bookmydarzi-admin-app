import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, Text, View } from 'react-native';
import { z } from 'zod';
import { Button, Header, Input, PasswordInput, Pressable, ScreenContent } from '@/components/ui';
import { useCreateStaffMutation } from '@/features/staff/hooks/useStaff';
import { useTheme } from '@/hooks/useTheme';

// Only employee/admin are selectable here - tailor is not a creatable role
// via POST /admin/staff (see the interface doc below), so this form uses its
// own restricted picker rather than the shared RoleSelector, which also
// offers "Tailor" for the login-role-selection use case elsewhere.
const CREATABLE_ROLES: { label: string; value: 'employee' | 'admin' }[] = [
  { label: 'Employee', value: 'employee' },
  { label: 'Admin', value: 'admin' },
];

const staffSchema = z.object({
  firstName: z.string().min(2, 'First name is required'),
  lastName: z.string().min(2, 'Last name is required'),
  email: z.string().email('Valid email required'),
  mobile: z.string().regex(/^[6-9]\d{9}$/, 'Valid 10-digit mobile required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['employee', 'admin']),
});

type StaffFormData = z.infer<typeof staffSchema>;

interface AddStaffFormProps {
  /** POST /admin/staff accepts employee/admin/superadmin only - tailor is
   * deliberately NOT creatable here (see staff_service.py's module
   * docstring on the backend). Tailor accounts are only ever created by
   * approving a TailorApplication (AddTailorApplicationForm), so every
   * tailor - admin-added or self-applied - goes through the one review
   * queue. */
  lockedRole?: 'employee' | 'admin';
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
        <ScreenContent keyboardShouldPersistTaps="handled" avoidKeyboard={false}>
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
            <View className="mb-4">
              <Text className="text-sm font-medium text-slate-500 mb-2">Staff Role</Text>
              <View className="flex-row gap-2">
                {CREATABLE_ROLES.map((role) => {
                  const selected = selectedRole === role.value;
                  return (
                    <Pressable
                      key={role.value}
                      onPress={() => setValue('role', role.value, { shouldValidate: true })}
                      haptic="selection"
                      className={`flex-1 py-3 rounded-2xl border items-center ${
                        selected ? 'bg-primary-50 border-primary-600' : 'border-slate-200 bg-white'
                      }`}
                    >
                      <Text className={`text-sm font-semibold ${selected ? 'text-primary-700' : 'text-slate-600'}`}>
                        {role.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              {errors.role?.message ? (
                <Text className="text-xs text-red-500 mt-1.5">{errors.role.message}</Text>
              ) : null}
            </View>
          )}
          <Button
            title="Create Staff"
            onPress={handleSubmit(onSubmit)}
            loading={createMutation.isPending}
            fullWidth
          />
        </ScreenContent>
      </KeyboardAvoidingView>
    </View>
  );
}
