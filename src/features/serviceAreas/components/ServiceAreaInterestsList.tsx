import { useState } from 'react';
import { Text, View } from 'react-native';
import { EmptyState, Loader, Pagination } from '@/components/ui';
import { useServiceAreaInterests } from '@/features/serviceAreas/hooks/useServiceAreas';
import { useTheme } from '@/hooks/useTheme';
import { formatApiErrorDetail, formatDate } from '@/utils/errors';

const LIMIT = 20;

// Read-only "notify me" lead list - captured when a customer's booking is
// rejected as outside the current service area (see app/api/v1/endpoints/
// location.py's POST /location/service-area-interest). Mirrors final's
// ServiceAreasPage.jsx interests tab (useServiceAreaInterests.js).
export function ServiceAreaInterestsList() {
  const { colors } = useTheme();
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, error } = useServiceAreaInterests((page - 1) * LIMIT, LIMIT);

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  if (isLoading) return <Loader message="Loading interest leads..." />;
  if (isError) return <EmptyState title="Failed to load leads" description={formatApiErrorDetail(error)} />;
  if (items.length === 0) {
    return (
      <EmptyState
        icon="location-outline"
        title="No interest leads yet"
        description="Shown here when a customer's booking is rejected as outside a service area and they ask to be notified"
      />
    );
  }

  return (
    <View>
      {items.map((item) => (
        <View
          key={item.id}
          className="rounded-2xl p-4 mb-3 border"
          style={{ backgroundColor: colors.card, borderColor: colors.border }}
        >
          <Text className="font-bold text-base" style={{ color: colors.text }}>
            {item.customer_name ?? 'Unknown customer'}
          </Text>
          {item.customer_mobile ? (
            <Text className="text-xs mt-0.5" style={{ color: colors.textSecondary }}>
              {item.customer_mobile}
            </Text>
          ) : null}
          <Text className="text-xs mt-1.5" style={{ color: colors.textSecondary }}>
            {[item.address_text, item.city, item.pincode].filter(Boolean).join(', ') || 'No address on file'}
          </Text>
          {item.latitude != null && item.longitude != null ? (
            <Text className="text-xs mt-0.5" style={{ color: colors.textMuted }}>
              {item.latitude.toFixed(4)}, {item.longitude.toFixed(4)}
            </Text>
          ) : null}
          <Text className="text-xs mt-1.5" style={{ color: colors.textMuted }}>
            {formatDate(item.created_at)}
          </Text>
        </View>
      ))}
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      <View className="mb-6" />
    </View>
  );
}
