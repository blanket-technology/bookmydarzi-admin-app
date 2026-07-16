import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Avatar, Badge, Card, EmptyState, Header, Loader } from '@/components/ui';
import { useStaffMember } from '@/features/staff/hooks/useStaff';
import { useTheme } from '@/hooks/useTheme';
import { formatDate } from '@/utils/errors';

export default function StaffDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const { data: staff, isLoading, isError } = useStaffMember(id);

  if (isLoading) return <Loader fullScreen />;
  if (isError || !staff) {
    return (
      <View className="flex-1" style={{ backgroundColor: colors.background }}>
        <Header title="Staff Details" showMenu={false} />
        <EmptyState title="Staff not found" actionLabel="Go Back" onAction={() => router.back()} />
      </View>
    );
  }

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <Header
        title="Staff Details"
        showMenu={false}
        rightAction={
          <Pressable onPress={() => router.back()}>
            <Ionicons name="close" size={24} color={colors.text} />
          </Pressable>
        }
      />
      <ScrollView className="px-5">
        <Card className="items-center mb-4">
          <Avatar name={staff.full_name} size={80} />
          <Text className="text-xl font-bold mt-4 capitalize" style={{ color: colors.text }}>
            {staff.full_name}
          </Text>
          <Badge label={staff.role} backgroundColor={colors.primaryLight} color={colors.primary} />
        </Card>
        <Card className="mb-8">
          <Row label="Email" value={staff.email ?? '—'} colors={colors} />
          <Row label="Mobile" value={staff.mobile ?? '—'} colors={colors} />
          <Row label="Status" value={staff.is_active ? 'Active' : 'Inactive'} colors={colors} />
          <Row label="Tailor ID" value={staff.tailor_id ?? '—'} colors={colors} />
          <Row label="Created" value={formatDate(staff.created_at)} colors={colors} />
        </Card>
      </ScrollView>
    </View>
  );
}

const Row = ({
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
    <Text className="font-medium" style={{ color: colors.text }}>
      {value}
    </Text>
  </View>
);
