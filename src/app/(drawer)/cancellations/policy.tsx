import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Switch, Text, View } from 'react-native';
import { BottomSheet, Button, Card, EmptyState, Header, Input, Loader, Pressable, ScreenContent } from '@/components/ui';
import {
  useCancellationPolicy,
  useUpdateCancellationPolicyMutation,
} from '@/features/cancellations/hooks/useCancellations';
import { useTheme } from '@/hooks/useTheme';
import type { CancellationPolicyItem } from '@/types/cancellations';
import { formatApiErrorDetail } from '@/utils/errors';

export default function CancellationPolicyScreen() {
  const { colors } = useTheme();
  const { data, isLoading, isError, error, refetch } = useCancellationPolicy();
  const updateMutation = useUpdateCancellationPolicyMutation();

  const [editing, setEditing] = useState<CancellationPolicyItem | null>(null);
  const [penaltyPct, setPenaltyPct] = useState('');
  const [allowed, setAllowed] = useState(true);
  const [description, setDescription] = useState('');

  const policies = [...(data ?? [])].sort((a, b) => a.SortOrder - b.SortOrder);

  // Mirrors backend's CancellationPolicyUpdate.PenaltyPct (app/schemas/
  // cancellation.py: ge=0, le=100) - previously unvalidated client-side, so
  // e.g. 150 or a negative value would 422 with no inline indication why.
  const isPenaltyPctInvalid =
    allowed &&
    penaltyPct.trim() !== '' &&
    (Number.isNaN(Number(penaltyPct)) || Number(penaltyPct) < 0 || Number(penaltyPct) > 100);

  const openEdit = (policy: CancellationPolicyItem) => {
    setEditing(policy);
    setPenaltyPct(policy.PenaltyPct != null ? String(policy.PenaltyPct) : '');
    setAllowed(policy.CancellationAllowed);
    setDescription(policy.PolicyDescription ?? '');
  };

  const handleSave = () => {
    if (!editing || isPenaltyPctInvalid) return;
    updateMutation.mutate(
      {
        stage: editing.OrderStage,
        payload: {
          PenaltyPct: penaltyPct ? Number(penaltyPct) : undefined,
          CancellationAllowed: allowed,
          PolicyDescription: description || undefined,
        },
      },
      { onSuccess: () => setEditing(null) },
    );
  };

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <Header
        title="Cancellation Policy"
        subtitle="Per-stage refund rules"
        showMenu={false}
        rightAction={
          <Pressable onPress={() => router.back()}>
            <Ionicons name="close" size={24} color={colors.text} />
          </Pressable>
        }
      />
      <ScreenContent>
        {isLoading ? (
          <Loader message="Loading policy..." />
        ) : isError ? (
          <EmptyState
            title="Failed to load policy"
            description={formatApiErrorDetail(error)}
            actionLabel="Retry"
            onAction={() => refetch()}
          />
        ) : (
          policies.map((policy) => (
            <Card key={policy.OrderStage} className="mb-3">
              <View className="flex-row items-center justify-between">
                <View className="flex-1">
                  <Text className="font-bold" style={{ color: colors.text }}>
                    {policy.DisplayStage}
                  </Text>
                  <Text className="text-sm mt-0.5" style={{ color: colors.textSecondary }}>
                    {policy.CancellationAllowed
                      ? `Penalty: ${policy.PenaltyPct ?? 0}%`
                      : 'Cancellation not allowed'}
                  </Text>
                  {policy.PolicyDescription ? (
                    <Text className="text-xs mt-1" style={{ color: colors.textMuted }}>
                      {policy.PolicyDescription}
                    </Text>
                  ) : null}
                </View>
                <Pressable onPress={() => openEdit(policy)}>
                  <Ionicons name="create-outline" size={20} color={colors.primary} />
                </Pressable>
              </View>
            </Card>
          ))
        )}
        <View className="mb-8" />
      </ScreenContent>

      <BottomSheet
        visible={!!editing}
        onClose={() => setEditing(null)}
        title={editing?.DisplayStage ?? 'Edit Stage'}
      >
        <View className="flex-row items-center justify-between mb-4">
          <Text style={{ color: colors.text }}>Cancellation Allowed</Text>
          <Switch value={allowed} onValueChange={setAllowed} trackColor={{ true: colors.primary }} />
        </View>
        <Input
          label="Penalty Percentage"
          value={penaltyPct}
          onChangeText={setPenaltyPct}
          keyboardType="decimal-pad"
          editable={allowed}
          error={isPenaltyPctInvalid ? 'Enter a value between 0 and 100' : undefined}
        />
        <Input
          label="Description"
          value={description}
          onChangeText={setDescription}
          multiline
        />
        <Button
          title="Save"
          onPress={handleSave}
          loading={updateMutation.isPending}
          disabled={isPenaltyPctInvalid}
          fullWidth
        />
      </BottomSheet>
    </View>
  );
}
