import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { FlatList, RefreshControl, Text, View } from 'react-native';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  Modal,
  Pagination,
  Pressable,
  SkeletonList,
} from '@/components/ui';
import {
  useAdminReviews,
  useDeleteReviewMutation,
  useHideReviewMutation,
  useUnhideReviewMutation,
} from '@/features/reviews/hooks/useReviews';
import { useTheme } from '@/hooks/useTheme';
import type { AdminReview } from '@/types/review';
import { formatApiErrorDetail, formatDate } from '@/utils/errors';

const LIMIT = 15;

const VISIBILITY_FILTERS: { label: string; value: '' | 'true' | 'false' }[] = [
  { label: 'All', value: '' },
  { label: 'Visible', value: 'false' },
  { label: 'Hidden', value: 'true' },
];

function Stars({ rating, color }: { rating: number; color: string }) {
  return (
    <View className="flex-row" style={{ gap: 1 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Ionicons key={i} name={i <= rating ? 'star' : 'star-outline'} size={13} color={color} />
      ))}
    </View>
  );
}

function ReviewRow({
  item,
  onHide,
  onUnhide,
  onDelete,
  busy,
}: {
  item: AdminReview;
  onHide: () => void;
  onUnhide: () => void;
  onDelete: () => void;
  busy: boolean;
}) {
  const { colors } = useTheme();

  return (
    <Card className="mb-3">
      <View className="flex-row items-start justify-between mb-2">
        <View className="flex-1 mr-2">
          <Text className="font-bold text-base" style={{ color: colors.text }}>
            {item.customer_name ?? `Customer #${item.id}`}
          </Text>
          <Text className="text-xs mt-0.5" style={{ color: colors.textMuted }}>
            {item.order_code ?? `Order #${item.order_id}`}
          </Text>
        </View>
        {item.is_hidden ? (
          <Badge label="Hidden" backgroundColor="#fee2e2" color="#dc2626" />
        ) : (
          <Badge label="Visible" backgroundColor="#dcfce7" color="#16a34a" />
        )}
      </View>

      <Stars rating={item.rating} color="#f59e0b" />

      {item.comment ? (
        <Text className="text-sm mt-2" style={{ color: colors.textSecondary }}>
          {item.comment}
        </Text>
      ) : (
        <Text className="text-sm mt-2" style={{ color: colors.textMuted }}>
          No comment
        </Text>
      )}

      {item.is_hidden && item.hidden_reason ? (
        <View className="mt-2 p-3 rounded-2xl" style={{ backgroundColor: colors.surface }}>
          <Text className="text-xs font-semibold mb-0.5" style={{ color: colors.textMuted }}>
            Hidden reason
          </Text>
          <Text className="text-sm" style={{ color: colors.text }}>
            {item.hidden_reason}
          </Text>
        </View>
      ) : null}

      <Text className="text-xs mt-2" style={{ color: colors.textMuted }}>
        {formatDate(item.created_at ?? undefined)}
      </Text>

      <View className="flex-row mt-3" style={{ gap: 10 }}>
        {item.is_hidden ? (
          <Pressable
            onPress={onUnhide}
            disabled={busy}
            className="flex-1 py-2.5 rounded-xl items-center"
            style={{ backgroundColor: colors.primary, opacity: busy ? 0.6 : 1 }}
          >
            <Text className="text-sm font-semibold" style={{ color: colors.onPrimary }}>Unhide</Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={onHide}
            disabled={busy}
            className="flex-1 py-2.5 rounded-xl border items-center"
            style={{ borderColor: colors.error, opacity: busy ? 0.6 : 1 }}
          >
            <Text className="text-sm font-semibold" style={{ color: colors.error }}>Hide</Text>
          </Pressable>
        )}
        <Pressable
          onPress={onDelete}
          disabled={busy}
          className="flex-1 py-2.5 rounded-xl border items-center"
          style={{ borderColor: colors.border, opacity: busy ? 0.6 : 1 }}
        >
          <Text className="text-sm font-semibold" style={{ color: colors.textSecondary }}>Delete</Text>
        </Pressable>
      </View>
    </Card>
  );
}

// Admin/superadmin review moderation - mirrors web's ReviewsPage.jsx (list
// with a visibility filter, hide with an optional reason / unhide /
// permanent delete). Hiding also excludes the rating from the tailor's or
// Bridge employee's aggregate score server-side, not just the display text.
export const AdminReviewsPanel = () => {
  const { colors } = useTheme();
  const [page, setPage] = useState(1);
  const [hiddenFilter, setHiddenFilter] = useState<'' | 'true' | 'false'>('');
  const [hideTarget, setHideTarget] = useState<AdminReview | null>(null);
  const [hideReason, setHideReason] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<AdminReview | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const params = useMemo(
    () => ({
      page,
      limit: LIMIT,
      hidden: hiddenFilter === '' ? undefined : hiddenFilter === 'true',
    }),
    [page, hiddenFilter],
  );
  const { data, isLoading, isError, error, refetch, isRefetching } = useAdminReviews(params);
  const hideMutation = useHideReviewMutation();
  const unhideMutation = useUnhideReviewMutation();
  const deleteMutation = useDeleteReviewMutation();

  const items = data?.reviews ?? [];
  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / LIMIT));
  // Deleting/hiding the last item on a page must not strand the user on an empty page.
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const handleUnhide = (item: AdminReview) => {
    setBusyId(item.id);
    unhideMutation.mutate(item.id, { onSettled: () => setBusyId(null) });
  };

  const handleConfirmHide = () => {
    if (!hideTarget) return;
    setBusyId(hideTarget.id);
    hideMutation.mutate(
      { reviewId: hideTarget.id, reason: hideReason.trim() || undefined },
      {
        onSettled: () => setBusyId(null),
        onSuccess: () => {
          setHideTarget(null);
          setHideReason('');
        },
      },
    );
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    setBusyId(deleteTarget.id);
    deleteMutation.mutate(deleteTarget.id, {
      onSettled: () => setBusyId(null),
      onSuccess: () => setDeleteTarget(null),
    });
  };

  return (
    <View className="flex-1">
      <View className="px-5 pt-3 flex-row flex-wrap" style={{ gap: 8 }}>
        {VISIBILITY_FILTERS.map((f) => (
          <Pressable
            key={f.value}
            onPress={() => {
              setHiddenFilter(f.value);
              setPage(1);
            }}
            className="px-3.5 py-2 rounded-full border"
            style={{
              backgroundColor: hiddenFilter === f.value ? colors.primary : colors.surface,
              borderColor: hiddenFilter === f.value ? colors.primary : colors.border,
            }}
          >
            <Text
              className="text-sm font-medium"
              style={{ color: hiddenFilter === f.value ? '#fff' : colors.text }}
            >
              {f.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <View className="px-5 flex-1 mt-3">
        {isLoading ? (
          <SkeletonList count={5} />
        ) : isError ? (
          <EmptyState
            title="Failed to load reviews"
            description={formatApiErrorDetail(error)}
            actionLabel="Retry"
            onAction={() => refetch()}
          />
        ) : (
          <FlatList
            data={items}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item }) => (
              <ReviewRow
                item={item}
                onHide={() => {
                  setHideTarget(item);
                  setHideReason('');
                }}
                onUnhide={() => handleUnhide(item)}
                onDelete={() => setDeleteTarget(item)}
                busy={busyId === item.id}
              />
            )}
            refreshControl={
              <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />
            }
            ListEmptyComponent={
              <EmptyState icon="star-outline" title="No reviews" description="Nothing matches this filter." />
            }
            ListFooterComponent={<Pagination page={page} totalPages={totalPages} onPageChange={setPage} />}
          />
        )}
      </View>

      <Modal
        visible={!!hideTarget}
        title="Hide Review"
        onClose={() => {
          setHideTarget(null);
          setHideReason('');
        }}
      >
        <Text className="text-sm leading-5 mb-4" style={{ color: colors.textSecondary }}>
          This hides the review from the website and app immediately, and excludes its rating from the
          tailor/service&apos;s average score. Reversible - you can unhide it later.
        </Text>
        <Input
          label="Reason (optional, for your own records)"
          placeholder="e.g. abusive language, unrelated content"
          value={hideReason}
          onChangeText={setHideReason}
          multiline
          numberOfLines={3}
        />
        <View className="flex-row mt-2" style={{ gap: 12 }}>
          <View className="flex-1">
            <Button
              title="Cancel"
              variant="outline"
              onPress={() => {
                setHideTarget(null);
                setHideReason('');
              }}
              fullWidth
            />
          </View>
          <View className="flex-1">
            <Button title="Hide review" onPress={handleConfirmHide} loading={hideMutation.isPending} fullWidth />
          </View>
        </View>
      </Modal>

      <Modal visible={!!deleteTarget} title="Delete Review Permanently" onClose={() => setDeleteTarget(null)}>
        <Text className="text-sm leading-5 mb-4" style={{ color: colors.textSecondary }}>
          This cannot be undone. This review by {deleteTarget?.customer_name ?? 'this customer'} will be
          permanently removed.
        </Text>
        <View className="flex-row mt-2" style={{ gap: 12 }}>
          <View className="flex-1">
            <Button title="Cancel" variant="outline" onPress={() => setDeleteTarget(null)} fullWidth />
          </View>
          <View className="flex-1">
            <Button title="Delete" onPress={handleConfirmDelete} loading={deleteMutation.isPending} fullWidth />
          </View>
        </View>
      </Modal>
    </View>
  );
};
