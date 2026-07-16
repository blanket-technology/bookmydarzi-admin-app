import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Avatar, Badge, Button, Card, ConfirmModal, EmptyState, Header, Loader } from '@/components/ui';
import { useUser, useUpdateUserStatusMutation } from '@/features/users/hooks/useUsers';
import { usePermissions } from '@/hooks/usePermissions';
import { useTheme } from '@/hooks/useTheme';
import { formatDate } from '@/utils/errors';

export default function CustomerDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const { permissions } = usePermissions();
  const [confirmVisible, setConfirmVisible] = useState(false);
  const { data: user, isLoading, isError } = useUser(id, permissions.users);
  const statusMutation = useUpdateUserStatusMutation();

  if (isLoading) return <Loader fullScreen message="Loading customer..." />;

  if (isError || !user) {
    return (
      <View className="flex-1" style={{ backgroundColor: colors.background }}>
        <Header title="Customer Details" showMenu={false} />
        <EmptyState title="Customer not found" actionLabel="Go Back" onAction={() => router.back()} />
      </View>
    );
  }

  const handleConfirmStatus = () => {
    if (!user) return;
    const action = user.is_active ? 'deactivate' : 'activate';
    statusMutation.mutate(
      { userId: user.id, payload: { action } },
      { onSuccess: () => setConfirmVisible(false) },
    );
  };

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <Header
        title="Customer Details"
        showMenu={false}
        rightAction={
          <Pressable onPress={() => router.back()}>
            <Ionicons name="close" size={24} color={colors.text} />
          </Pressable>
        }
      />
      <ScrollView className="px-5">
        <Card className="items-center mb-4">
          <Avatar name={user?.full_name} size={80} />
          <Text className="text-xl font-bold mt-4" style={{ color: colors.text }}>
            {user?.full_name ?? 'Customer'}
          </Text>
          <Badge
            label={user?.is_active ? 'Active' : 'Inactive'}
            backgroundColor={user?.is_active ? '#dcfce7' : '#fee2e2'}
            color={user?.is_active ? '#16a34a' : '#dc2626'}
          />
        </Card>

        <Card className="mb-8">
          <InfoRow label="Email" value={user?.email ?? '—'} colors={colors} />
          <InfoRow label="Mobile" value={user?.mobile ?? '—'} colors={colors} />
          <InfoRow label="Role" value={user?.role ?? 'user'} colors={colors} />
          <InfoRow
            label="Email Verified"
            value={user?.is_email_verified ? 'Yes' : 'No'}
            colors={colors}
          />
          <InfoRow
            label="Mobile Verified"
            value={user?.is_mobile_verified ? 'Yes' : 'No'}
            colors={colors}
          />
          <InfoRow label="Joined" value={formatDate(user?.created_at)} colors={colors} />
        </Card>

        <Button
          title={user?.is_active ? 'Deactivate User' : 'Activate User'}
          variant={user?.is_active ? 'danger' : 'primary'}
          onPress={() => setConfirmVisible(true)}
          loading={statusMutation.isPending}
          fullWidth
        />
      </ScrollView>

      <ConfirmModal
        visible={confirmVisible}
        title={user?.is_active ? 'Deactivate User' : 'Activate User'}
        message={`Are you sure you want to ${user?.is_active ? 'deactivate' : 'activate'} ${user?.full_name ?? user?.email ?? 'this user'}?`}
        confirmLabel={user?.is_active ? 'Deactivate' : 'Activate'}
        loading={statusMutation.isPending}
        onConfirm={handleConfirmStatus}
        onCancel={() => setConfirmVisible(false)}
      />
    </View>
  );
}

const InfoRow = ({
  label,
  value,
  colors,
}: {
  label: string;
  value: string;
  colors: ReturnType<typeof useTheme>['colors'];
}) => (
  <View className="flex-row justify-between py-3 border-b" style={{ borderColor: colors.border }}>
    <Text style={{ color: colors.textSecondary }}>{label}</Text>
    <Text className="font-medium capitalize" style={{ color: colors.text }}>
      {value}
    </Text>
  </View>
);
