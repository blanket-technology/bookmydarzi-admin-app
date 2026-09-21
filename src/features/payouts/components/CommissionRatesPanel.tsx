import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Button, Input, Loader, Pressable } from '@/components/ui';
import { useCatalogTree } from '@/features/catalog/hooks/useCatalog';
import { useTailors } from '@/features/tailors/hooks/useTailors';
import {
  useCommissionRates,
  useDeleteCommissionRateMutation,
  useUpsertCommissionRateMutation,
} from '@/features/payouts/hooks/usePayouts';
import { useTheme } from '@/hooks/useTheme';

// Admin sets a commission rate per (tailor, category) or a tailor-wide
// default (category left blank) - the backend resolves the most specific
// match at payout-creation time, falling back to a platform default when
// no rate is set, so this panel is optional to use, not a blocker.
export function CommissionRatesPanel() {
  const { colors } = useTheme();
  const { data: rates, isLoading: ratesLoading } = useCommissionRates();
  const { data: tailors } = useTailors();
  const { data: tree } = useCatalogTree();
  const upsertMutation = useUpsertCommissionRateMutation();
  const deleteMutation = useDeleteCommissionRateMutation();

  const [tailorId, setTailorId] = useState<string>('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [percent, setPercent] = useState('');
  const [formError, setFormError] = useState('');
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const categories = (tree?.categories ?? []).map((c) => ({ id: String(c.id), name: c.name }));
  const tailorList = tailors?.tailors ?? tailors?.items ?? [];

  const handleSave = () => {
    if (!tailorId || !percent) {
      setFormError('Select a tailor and enter a commission percentage.');
      return;
    }
    setFormError('');
    upsertMutation.mutate(
      {
        tailor_id: Number(tailorId),
        category_id: categoryId ? Number(categoryId) : null,
        commission_percent: percent,
      },
      {
        onSuccess: () => {
          setTailorId('');
          setCategoryId('');
          setPercent('');
        },
      },
    );
  };

  const handleDelete = (rateId: number) => {
    setDeletingId(rateId);
    deleteMutation.mutate(String(rateId), { onSettled: () => setDeletingId(null) });
  };

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <View className="rounded-3xl p-4 mb-4 border" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
        <Text className="text-sm font-bold mb-3" style={{ color: colors.text }}>
          Set Commission Rate
        </Text>

        <Text className="text-xs font-semibold mb-1.5" style={{ color: colors.textSecondary }}>
          Tailor
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3">
          <View className="flex-row" style={{ gap: 8 }}>
            {tailorList.map((t) => (
              <Pressable
                key={t.tailor_id}
                onPress={() => setTailorId(t.tailor_id)}
                className="px-3.5 py-2 rounded-xl border"
                style={{
                  backgroundColor: tailorId === t.tailor_id ? colors.primary : colors.surface,
                  borderColor: tailorId === t.tailor_id ? colors.primary : colors.border,
                }}
              >
                <Text
                  className="text-xs font-semibold"
                  style={{ color: tailorId === t.tailor_id ? '#fff' : colors.text }}
                >
                  {t.full_name ?? `Tailor #${t.tailor_id}`}
                </Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>

        <Text className="text-xs font-semibold mb-1.5" style={{ color: colors.textSecondary }}>
          Category (optional - blank applies to all)
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3">
          <View className="flex-row" style={{ gap: 8 }}>
            <Pressable
              onPress={() => setCategoryId('')}
              className="px-3.5 py-2 rounded-xl border"
              style={{
                backgroundColor: categoryId === '' ? colors.primary : colors.surface,
                borderColor: categoryId === '' ? colors.primary : colors.border,
              }}
            >
              <Text className="text-xs font-semibold" style={{ color: categoryId === '' ? '#fff' : colors.text }}>
                All categories
              </Text>
            </Pressable>
            {categories.map((c) => (
              <Pressable
                key={c.id}
                onPress={() => setCategoryId(c.id)}
                className="px-3.5 py-2 rounded-xl border"
                style={{
                  backgroundColor: categoryId === c.id ? colors.primary : colors.surface,
                  borderColor: categoryId === c.id ? colors.primary : colors.border,
                }}
              >
                <Text className="text-xs font-semibold" style={{ color: categoryId === c.id ? '#fff' : colors.text }}>
                  {c.name}
                </Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>

        <Input
          label="Commission %"
          value={percent}
          onChangeText={setPercent}
          placeholder="65.00"
          keyboardType="decimal-pad"
          error={formError || undefined}
        />
        <Button title="Save Rate" onPress={handleSave} loading={upsertMutation.isPending} />
      </View>

      {ratesLoading ? (
        <Loader />
      ) : (rates ?? []).length === 0 ? (
        <Text className="text-sm text-center py-8" style={{ color: colors.textMuted }}>
          No commission rates set - payouts use the platform default rate.
        </Text>
      ) : (
        (rates ?? []).map((r) => (
          <View
            key={r.id}
            className="flex-row items-center justify-between rounded-2xl p-3.5 mb-2.5 border"
            style={{ backgroundColor: colors.card, borderColor: colors.border }}
          >
            <View className="flex-1 mr-2">
              <Text className="text-sm font-semibold" style={{ color: colors.text }}>
                {r.tailor_name ?? `#${r.tailor_id}`}
              </Text>
              <Text className="text-xs mt-0.5" style={{ color: colors.textMuted }}>
                {r.category_name ?? 'All categories'}
              </Text>
            </View>
            <Text className="text-sm font-bold mr-3" style={{ color: colors.text }}>
              {Number(r.commission_percent).toFixed(2)}%
            </Text>
            <Pressable
              onPress={() => handleDelete(r.id)}
              disabled={deletingId === r.id}
              className="px-2.5 py-1.5 rounded-lg"
              style={{ backgroundColor: `${colors.error}15` }}
            >
              <Text className="text-xs font-semibold" style={{ color: colors.error }}>
                {deletingId === r.id ? '…' : 'Remove'}
              </Text>
            </Pressable>
          </View>
        ))
      )}
    </ScrollView>
  );
}
