import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { EmptyState, FilterSheet, Header, Loader, Pagination, Pressable } from '@/components/ui';
import { useAuditLogFilterOptions, useAuditLogs } from '@/features/auditLog/hooks/useAuditLog';
import { useTheme } from '@/hooks/useTheme';
import { useResponsive } from '@/hooks/useResponsive';
import { formatApiErrorDetail, formatDate } from '@/utils/errors';

const PAGE_LIMIT = 25;

// AuditLog.Details is a JSON column (app/models/audit_log.py) - most
// callers store a plain string, but several pass structured objects (e.g.
// {leg: "pickup", reason: "..."}), which React cannot render directly.
function formatAuditDetails(details: unknown): string {
  if (typeof details === 'string') return details;
  if (typeof details === 'number' || typeof details === 'boolean') return String(details);
  try {
    return JSON.stringify(details);
  } catch {
    return String(details);
  }
}

export default function AuditLogScreen() {
  const { colors } = useTheme();
  const { contentMaxWidth } = useResponsive();
  const [page, setPage] = useState(1);
  const [actorFilter, setActorFilter] = useState<string>('');
  const [actionFilter, setActionFilter] = useState<string>('');
  const [actorSheetVisible, setActorSheetVisible] = useState(false);
  const [actionSheetVisible, setActionSheetVisible] = useState(false);

  const { data: filterOptions } = useAuditLogFilterOptions();
  const { data, isLoading, isError, error, refetch } = useAuditLogs({
    page,
    limit: PAGE_LIMIT,
    performed_by: actorFilter ? Number(actorFilter) : undefined,
    action: actionFilter || undefined,
  });

  const items = data?.items ?? [];
  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_LIMIT)) : 1;

  const actorOptions = [
    { label: 'All actors', value: '' },
    ...(filterOptions?.actors.map((a) => ({ label: `${a.name} (${a.role})`, value: String(a.id) })) ?? []),
  ];
  const actionOptions = [
    { label: 'All actions', value: '' },
    ...(filterOptions?.actions.map((a) => ({ label: a, value: a })) ?? []),
  ];
  const selectedActorLabel = actorOptions.find((o) => o.value === actorFilter)?.label ?? 'All actors';
  const selectedActionLabel = actionOptions.find((o) => o.value === actionFilter)?.label ?? 'All actions';

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <Header title="Audit Log" subtitle={data ? `${data.total} entries` : undefined} />
      <View className="px-5 flex-1 w-full self-center" style={{ maxWidth: contentMaxWidth }}>
        <View className="flex-row mb-3" style={{ gap: 8 }}>
          <Pressable
            onPress={() => setActorSheetVisible(true)}
            className="flex-1 px-3 py-2.5 rounded-xl border"
            style={{ borderColor: colors.border, backgroundColor: colors.card }}
          >
            <Text className="text-xs" style={{ color: colors.textSecondary }} numberOfLines={1}>
              {selectedActorLabel}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setActionSheetVisible(true)}
            className="flex-1 px-3 py-2.5 rounded-xl border"
            style={{ borderColor: colors.border, backgroundColor: colors.card }}
          >
            <Text className="text-xs" style={{ color: colors.textSecondary }} numberOfLines={1}>
              {selectedActionLabel}
            </Text>
          </Pressable>
        </View>

        {isLoading ? (
          <Loader message="Loading audit log..." />
        ) : isError ? (
          <EmptyState title="Failed to load audit log" description={formatApiErrorDetail(error)} actionLabel="Retry" onAction={() => refetch()} />
        ) : items.length === 0 ? (
          <EmptyState icon="time-outline" title="No audit entries found" />
        ) : (
          <ScrollView showsVerticalScrollIndicator={false}>
            {items.map((item) => (
              <View
                key={item.id}
                className="rounded-2xl p-4 mb-3 border"
                style={{ backgroundColor: colors.card, borderColor: colors.border }}
              >
                <View className="flex-row items-start justify-between mb-1">
                  <Text className="font-bold text-sm flex-1 mr-2" style={{ color: colors.text }}>
                    {item.action}
                  </Text>
                  <Text className="text-xs" style={{ color: colors.textMuted }}>
                    {item.created_at ? formatDate(item.created_at) : ''}
                  </Text>
                </View>
                <Text className="text-xs" style={{ color: colors.textSecondary }}>
                  By {item.performed_by_name ?? `User #${item.performed_by ?? '—'}`}
                </Text>
                {item.details != null ? (
                  <Text className="text-xs mt-2" style={{ color: colors.textMuted }} numberOfLines={3}>
                    {formatAuditDetails(item.details)}
                  </Text>
                ) : null}
                <View className="flex-row flex-wrap mt-2" style={{ gap: 6 }}>
                  {item.order_id ? (
                    <Text className="text-[11px]" style={{ color: colors.textMuted }}>
                      Order #{item.order_id}
                    </Text>
                  ) : null}
                  {item.tailor_id ? (
                    <Text className="text-[11px]" style={{ color: colors.textMuted }}>
                      Tailor #{item.tailor_id}
                    </Text>
                  ) : null}
                  {item.user_id ? (
                    <Text className="text-[11px]" style={{ color: colors.textMuted }}>
                      User #{item.user_id}
                    </Text>
                  ) : null}
                  {item.application_id ? (
                    <Text className="text-[11px]" style={{ color: colors.textMuted }}>
                      Application #{item.application_id}
                    </Text>
                  ) : null}
                </View>
              </View>
            ))}
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
            <View className="mb-6" />
          </ScrollView>
        )}
      </View>

      <FilterSheet
        visible={actorSheetVisible}
        onClose={() => setActorSheetVisible(false)}
        title="Filter by actor"
        options={actorOptions}
        selectedValue={actorFilter}
        onSelect={(v) => {
          setActorFilter(v);
          setPage(1);
        }}
      />
      <FilterSheet
        visible={actionSheetVisible}
        onClose={() => setActionSheetVisible(false)}
        title="Filter by action"
        options={actionOptions}
        selectedValue={actionFilter}
        onSelect={(v) => {
          setActionFilter(v);
          setPage(1);
        }}
      />
    </View>
  );
}
