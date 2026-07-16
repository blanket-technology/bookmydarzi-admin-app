import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Alert, ScrollView, Text, View } from 'react-native';
import { z } from 'zod';
import { Avatar, Button, Card, Header, Input, PasswordInput } from '@/components/ui';
import { useLogoutMutation } from '@/features/auth/hooks/useAuthMutations';
import {
  useChangePasswordMutation,
  useProfile,
  useUpdateProfileMutation,
} from '@/features/settings/hooks/useProfile';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';

const profileSchema = z.object({
  firstName: z.string().min(2),
  lastName: z.string().min(2),
});

const passwordSchema = z
  .object({
    oldPassword: z.string().min(6),
    newPassword: z.string().min(8),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type ProfileForm = z.infer<typeof profileSchema>;
type PasswordForm = z.infer<typeof passwordSchema>;

export default function ProfileScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const updateMutation = useUpdateProfileMutation();
  const passwordMutation = useChangePasswordMutation();
  const logoutMutation = useLogoutMutation();
  const [showPasswordForm, setShowPasswordForm] = useState(false);

  const profileForm = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    values: {
      firstName: profile?.FirstName ?? user?.first_name ?? '',
      lastName: profile?.LastName ?? user?.last_name ?? '',
    },
  });

  const passwordForm = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { oldPassword: '', newPassword: '', confirmPassword: '' },
  });

  const onUpdateProfile = (data: ProfileForm) => {
    updateMutation.mutate(
      { FirstName: data.firstName, LastName: data.lastName },
      {
        onSuccess: () => Alert.alert('Success', 'Profile updated'),
        onError: () => Alert.alert('Error', 'Failed to update profile'),
      },
    );
  };

  const onChangePassword = (data: PasswordForm) => {
    passwordMutation.mutate(
      { old_password: data.oldPassword, new_password: data.newPassword },
      {
        onSuccess: () => {
          Alert.alert('Success', 'Password changed successfully');
          passwordForm.reset();
          setShowPasswordForm(false);
        },
        onError: () => Alert.alert('Error', 'Failed to change password'),
      },
    );
  };

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <Header title="Profile" subtitle="Manage your account" />
      <ScrollView className="px-5">
        <Card className="items-center mb-4">
          <Avatar
            name={profile?.FullName ?? user?.full_name}
            imageUrl={profile?.ProfileImageUrl}
            size={88}
          />
          <Text className="text-xl font-bold mt-4" style={{ color: colors.text }}>
            {profile?.FullName ?? user?.full_name ?? 'Admin'}
          </Text>
          <Text className="text-sm capitalize mt-1" style={{ color: colors.textSecondary }}>
            {profile?.Role ?? user?.role}
          </Text>
          <Text className="text-sm mt-1" style={{ color: colors.textMuted }}>
            {profile?.Email ?? user?.email}
          </Text>
        </Card>

        <Card className="mb-4">
          <Text className="text-lg font-bold mb-4" style={{ color: colors.text }}>
            Update Profile
          </Text>
          <Controller
            control={profileForm.control}
            name="firstName"
            render={({ field: { onChange, value } }) => (
              <Input label="First Name" value={value} onChangeText={onChange} />
            )}
          />
          <Controller
            control={profileForm.control}
            name="lastName"
            render={({ field: { onChange, value } }) => (
              <Input label="Last Name" value={value} onChangeText={onChange} />
            )}
          />
          <Button
            title="Save Changes"
            onPress={profileForm.handleSubmit(onUpdateProfile)}
            loading={updateMutation.isPending}
            fullWidth
          />
        </Card>

        <Card className="mb-4">
          <Button
            title={showPasswordForm ? 'Cancel' : 'Change Password'}
            variant="outline"
            onPress={() => setShowPasswordForm((prev) => !prev)}
            fullWidth
          />
          {showPasswordForm ? (
            <View className="mt-4">
              <Controller
                control={passwordForm.control}
                name="oldPassword"
                render={({ field: { onChange, value } }) => (
                  <PasswordInput label="Current Password" value={value} onChangeText={onChange} />
                )}
              />
              <Controller
                control={passwordForm.control}
                name="newPassword"
                render={({ field: { onChange, value } }) => (
                  <PasswordInput label="New Password" value={value} onChangeText={onChange} />
                )}
              />
              <Controller
                control={passwordForm.control}
                name="confirmPassword"
                render={({ field: { onChange, value } }) => (
                  <PasswordInput label="Confirm Password" value={value} onChangeText={onChange} />
                )}
              />
              <Button
                title="Update Password"
                onPress={passwordForm.handleSubmit(onChangePassword)}
                loading={passwordMutation.isPending}
                fullWidth
              />
            </View>
          ) : null}
        </Card>

        <Button
          title="Logout"
          variant="danger"
          onPress={() => logoutMutation.mutate()}
          loading={logoutMutation.isPending}
          fullWidth
          className="mb-8"
        />
      </ScrollView>
    </View>
  );
}
