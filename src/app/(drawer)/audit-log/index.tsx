import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { BottomSheet, Button, DateField, EmptyState, FilterSheet, Header, Loader, Pagination, Pressable, SearchBar } from '@/components/ui';
import { useAuditLogFilterOptions, useAuditLogs } from '@/features/auditLog/hooks/useAuditLog';
import { getAuditActionMeta, toneColor } from '@/features/auditLog/utils/auditActionMeta';
import { useTheme } from '@/hooks/useTheme';
import { useResponsive } from '@/hooks/useResponsive';
import { formatApiErrorDetail, formatDate, formatDateTime } from '@/utils/errors';
import type { AuditLogItem } from '@/types/auditLog';

const PAGE_LIMIT = 25;

// AuditLog.Details is a JSON column (app/models/audit_log.py) - most
// callers store a plain string, but several pass structured objects (e.g.
// {leg: "pickup", reason: "..."}), which React cannot render directly.
function formatAuditDetails(details: unknown): string {
  if (typeof details === 'string') return details;
  if (typeof details === 'number' || typeof details === 'boolean') return String(details);
  try {
    // Pretty-printed rather than single-line JSON.stringify - a raw
    // {"leg":"pickup","reason":"no tailors nearby"} blob was unreadable
    // wedged into 3 lines of body text; one key: value pair per line at
    // least lets an admin actually scan a broadcast/escalation payload.
    const obj = details as Record<string, unknown>;
    return Object.entries(obj)
      .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : String(v)}`)
      .join('\n');
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
  const [dateFrom, setDateFrom] = useState<string | null>(null);
  const [dateTo, setDateTo] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [actorSheetVisible, setActorSheetVisible] = useState(false);
  const [actionSheetVisible, setActionSheetVisible] = useState(false);
  const [dateSheetVisible, setDateSheetVisible] = useState(false);

  const { data: filterOptions } = useAuditLogFilterOptions();
  const { data, isLoading, isError, error, refetch, isFetching } = useAuditLogs({
    page,
    limit: PAGE_LIMIT,
    performed_by: actorFilter ? Number(actorFilter) : undefined,
    action: actionFilter || undefined,
    date_from: dateFrom ?? undefined,
    date_to: dateTo ? `${dateTo}T23:59:59` : undefined,
  });

  const items = data?.items ?? [];
  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_LIMIT)) : 1;

  // Search is client-side only, scoped to the current page - the backend
  // has no free-text search param (only performed_by/action/date_from/
  // date_to), and adding one is a backend change out of scope for this
  // screen's UX pass. Filters against the same text an admin actually
  // reads: action label, actor name, and the details blob.
  const visibleItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => {
      const meta = getAuditActionMeta(item.action);
      const haystack = [
        meta.label,
        item.action,
        item.performed_by_name ?? '',
        formatAuditDetails(item.details),
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [items, search]);

  const actorOptions = [
    { label: 'All actors', value: '' },
    ...(filterOptions?.actors.map((a) => ({ label: `${a.name} (${a.role})`, value: String(a.id) })) ?? []),
  ];
  const actionOptions = [
    { label: 'All actions', value: '' },
    ...(filterOptions?.actions.map((a) => ({ label: getAuditActionMeta(a).label, value: a })) ?? []),
  ];
  const selectedActorLabel = actorOptions.find((o) => o.value === actorFilter)?.label ?? 'All actors';
  const selectedActionLabel = actionOptions.find((o) => o.value === actionFilter)?.label ?? 'All actions';
  const dateRangeLabel =
    dateFrom && dateTo
      ? `${formatDate(dateFrom)} – ${formatDate(dateTo)}`
      : dateFrom
        ? `From ${formatDate(dateFrom)}`
        : dateTo
          ? `Until ${formatDate(dateTo)}`
          : 'Any date';

  const activeFilterCount = [actorFilter, actionFilter, dateFrom, dateTo].filter(Boolean).length;

  const clearFilters = () => {
    setActorFilter('');
    setActionFilter('');
    setDateFrom(null);
    setDateTo(null);
    setSearch('');
    setPage(1);
  };

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <Header
        title="Audit Log"
        subtitle={data ? `${data.total} entries` : undefined}
        rightAction={
          activeFilterCount > 0 ? (
            <Pressable
              onPress={clearFilters}
              haptic="selection"
              className="flex-row items-center px-3 py-2 rounded-xl"
              style={{ backgroundColor: colors.primaryLight }}
            >
              <Ionicons name="close-circle" size={14} color={colors.primary} />
              <Text className="text-xs font-semibold ml-1" style={{ color: colors.primary }}>
                Clear ({activeFilterCount})
              </Text>
            </Pressable>
          ) : undefined
        }
      />
      <View className="px-5 flex-1 w-full self-center" style={{ maxWidth: contentMaxWidth }}>
        <SearchBar value={search} onChangeText={setSearch} placeholder="Search this page..." />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3" style={{ flexGrow: 0 }}>
          <View className="flex-row" style={{ gap: 8 }}>
            <FilterChip
              icon="person-outline"
              label={selectedActorLabel}
              active={!!actorFilter}
              onPress={() => setActorSheetVisible(true)}
            />
            <FilterChip
              icon="flash-outline"
              label={selectedActionLabel}
              active={!!actionFilter}
              onPress={() => setActionSheetVisible(true)}
            />
            <FilterChip
              icon="calendar-outline"
              label={dateRangeLabel}
              active={!!(dateFrom || dateTo)}
              onPress={() => setDateSheetVisible(true)}
            />
          </View>
        </ScrollView>

        {isLoading ? (
          <Loader message="Loading audit log..." />
        ) : isError ? (
          <EmptyState title="Failed to load audit log" description={formatApiErrorDetail(error)} actionLabel="Retry" onAction={() => refetch()} />
        ) : visibleItems.length === 0 ? (
          <EmptyState
            icon="time-outline"
            title={search ? 'No entries match your search' : 'No audit entries found'}
            description={activeFilterCount > 0 || search ? 'Try adjusting your filters.' : undefined}
            actionLabel={activeFilterCount > 0 || search ? 'Clear filters' : undefined}
            onAction={activeFilterCount > 0 || search ? clearFilters : undefined}
          />
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} style={{ opacity: isFetching ? 0.6 : 1 }}>
            {visibleItems.map((item) => (
              <AuditLogCard key={item.id} item={item} />
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
      <DateRangeSheet
        visible={dateSheetVisible}
        onClose={() => setDateSheetVisible(false)}
        dateFrom={dateFrom}
        dateTo={dateTo}
        onApply={(from, to) => {
          setDateFrom(from);
          setDateTo(to);
          setPage(1);
        }}
      />
    </View>
  );
}

function FilterChip({
  icon,
  label,
  active,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      haptic="selection"
      className="flex-row items-center px-3 py-2.5 rounded-xl border"
      style={{
        borderColor: active ? colors.primary : colors.border,
        backgroundColor: active ? colors.primaryLight : colors.card,
      }}
    >
      <Ionicons name={icon} size={13} color={active ? colors.primary : colors.textSecondary} />
      <Text
        className="text-xs ml-1.5"
        style={{ color: active ? colors.primary : colors.textSecondary, fontWeight: active ? '700' : '400' }}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function AuditLogCard({ item }: { item: AuditLogItem }) {
  const { colors } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const meta = getAuditActionMeta(item.action);
  const tone = toneColor(meta.tone, colors);
  const details = item.details != null ? formatAuditDetails(item.details) : null;
  const isLongDetails = (details?.length ?? 0) > 90 || (details?.includes('\n') ?? false);

  const refTags = [
    item.order_id ? { icon: 'receipt-outline' as const, label: `Order #${item.order_id}` } : null,
    item.tailor_id ? { icon: 'cut-outline' as const, label: `Tailor #${item.tailor_id}` } : null,
    item.user_id ? { icon: 'person-outline' as const, label: `User #${item.user_id}` } : null,
    item.application_id ? { icon: 'document-text-outline' as const, label: `Application #${item.application_id}` } : null,
  ].filter(Boolean) as { icon: React.ComponentProps<typeof Ionicons>['name']; label: string }[];

  return (
    <View
      className="rounded-2xl p-4 mb-3 border"
      style={{ backgroundColor: colors.card, borderColor: colors.border }}
    >
      <View className="flex-row items-start">
        <View
          className="w-9 h-9 rounded-full items-center justify-center mr-3 shrink-0"
          style={{ backgroundColor: `${tone}1A` }}
        >
          <Ionicons name={meta.icon} size={17} color={tone} />
        </View>
        <View className="flex-1">
          <View className="flex-row items-start justify-between">
            <Text className="font-bold text-sm flex-1 mr-2" style={{ color: colors.text }}>
              {meta.label}
            </Text>
            <Text className="text-[11px]" style={{ color: colors.textMuted }}>
              {item.created_at ? formatDateTime(item.created_at) : ''}
            </Text>
          </View>
          <Text className="text-xs mt-0.5" style={{ color: colors.textSecondary }}>
            By {item.performed_by_name ?? `User #${item.performed_by ?? '—'}`}
          </Text>
        </View>
      </View>

      {details ? (
        <Pressable
          onPress={() => isLongDetails && setExpanded((e) => !e)}
          className="mt-2.5 rounded-xl px-3 py-2.5"
          style={{ backgroundColor: colors.background }}
        >
          <Text
            className="text-xs"
            style={{ color: colors.textSecondary, lineHeight: 18 }}
            numberOfLines={expanded ? undefined : 2}
          >
            {details}
          </Text>
          {isLongDetails ? (
            <Text className="text-[11px] font-semibold mt-1" style={{ color: colors.primary }}>
              {expanded ? 'Show less' : 'Show more'}
            </Text>
          ) : null}
        </Pressable>
      ) : null}

      {refTags.length > 0 ? (
        <View className="flex-row flex-wrap mt-2.5" style={{ gap: 6 }}>
          {refTags.map((tag) => (
            <View
              key={tag.label}
              className="flex-row items-center px-2 py-1 rounded-lg"
              style={{ backgroundColor: colors.background }}
            >
              <Ionicons name={tag.icon} size={11} color={colors.textMuted} />
              <Text className="text-[11px] ml-1" style={{ color: colors.textMuted }}>
                {tag.label}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function DateRangeSheet({
  visible,
  onClose,
  dateFrom,
  dateTo,
  onApply,
}: {
  visible: boolean;
  onClose: () => void;
  dateFrom: string | null;
  dateTo: string | null;
  onApply: (from: string | null, to: string | null) => void;
}) {
  const [from, setFrom] = useState(dateFrom);
  const [to, setTo] = useState(dateTo);

  // Re-seed the draft from the applied filters every time the sheet opens -
  // otherwise closing without applying (native back gesture, tapping the
  // backdrop) would leave stale draft values shown the next time it opens.
  useEffect(() => {
    if (visible) {
      setFrom(dateFrom);
      setTo(dateTo);
    }
  }, [visible, dateFrom, dateTo]);

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Filter by date"
      footer={
        <View className="flex-row" style={{ gap: 10 }}>
          <View className="flex-1">
            <Button
              title="Reset"
              variant="outline"
              onPress={() => {
                setFrom(null);
                setTo(null);
              }}
            />
          </View>
          <View className="flex-1">
            <Button
              title="Apply"
              onPress={() => {
                onApply(from, to);
                onClose();
              }}
            />
          </View>
        </View>
      }
    >
      <DateField label="From" value={from} onChange={setFrom} maximumDate={to ? new Date(`${to}T00:00:00`) : undefined} />
      <DateField label="To" value={to} onChange={setTo} minimumDate={from ? new Date(`${from}T00:00:00`) : undefined} />
    </BottomSheet>
  );
}
