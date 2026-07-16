import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { ScrollView, Pressable, Text, View } from 'react-native';
import { Avatar, Badge, Card, EmptyState, Header, Loader } from '@/components/ui';
import { useTailor } from '@/features/tailors/hooks/useTailors';
import { useTheme } from '@/hooks/useTheme';

export default function TailorDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const { data: tailor, isLoading, isError } = useTailor(id);

  if (isLoading) return <Loader fullScreen />;
  if (isError || !tailor) {
    return (
      <View className="flex-1" style={{ backgroundColor: colors.background }}>
        <Header title="Tailor Details" showMenu={false} />
        <EmptyState title="Tailor not found" actionLabel="Go Back" onAction={() => router.back()} />
      </View>
    );
  }

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <Header
        title="Tailor Details"
        showMenu={false}
        rightAction={
          <Pressable onPress={() => router.back()}>
            <Ionicons name="close" size={24} color={colors.text} />
          </Pressable>
        }
      />
      <ScrollView className="px-5">
        <Card className="items-center mb-4">
          <Avatar name={tailor.full_name} size={80} />
          <Text className="text-xl font-bold mt-4" style={{ color: colors.text }}>
            {tailor.full_name}
          </Text>
          <Text className="text-sm mt-1" style={{ color: colors.textSecondary }}>
            {tailor.specialization}
          </Text>
          <View className="flex-row gap-2 mt-3">
            <Badge
              label={tailor.is_available ? 'Available' : 'Busy'}
              backgroundColor={tailor.is_available ? '#dcfce7' : '#fef3c7'}
              color={tailor.is_available ? '#16a34a' : '#d97706'}
            />
            {tailor.is_featured ? (
              <Badge label="Featured" backgroundColor="#ede9fe" color="#7c3aed" />
            ) : null}
          </View>
        </Card>

        <Card className="mb-8">
          <MetricRow label="Rating" value={`${tailor.rating?.toFixed(1) ?? '—'} / 5`} colors={colors} />
          <MetricRow label="Experience" value={`${tailor.experience ?? 0} years`} colors={colors} />
          <MetricRow label="Location" value={tailor.location ?? '—'} colors={colors} />
          <MetricRow label="Email" value={tailor.email ?? '—'} colors={colors} />
          <MetricRow label="Mobile" value={tailor.mobile ?? '—'} colors={colors} />
          <MetricRow label="Active Orders" value={String(tailor.active_orders ?? 0)} colors={colors} />
          <MetricRow label="Completed Orders" value={String(tailor.completed_orders ?? 0)} colors={colors} />
        </Card>
      </ScrollView>
    </View>
  );
}

const MetricRow = ({
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
