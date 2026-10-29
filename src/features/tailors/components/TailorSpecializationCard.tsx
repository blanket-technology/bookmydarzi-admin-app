import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { Button } from '@/components/ui';
import { SpecializationChecklist } from '@/features/applications/components/SpecializationChecklist';
import {
  useTailorSpecializations,
  useUpdateTailorSpecializationsMutation,
} from '@/features/tailors/hooks/useTailors';
import { useTheme } from '@/hooks/useTheme';

interface TailorSpecializationCardProps {
  tailorId: string;
}

/** View/edit an already-approved tailor's structured specialization
 * checklist - this was previously only settable once, at application time
 * (AddTailorApplicationForm), with no way for an admin to correct a
 * miscategorized tailor afterward short of a full re-application. Reuses
 * the exact same checklist UI the application flow uses, backed by the
 * same GET/PUT /admin/tailors/{id}/specializations endpoints that
 * find_eligible_tailors actually routes broadcasts against - this is the
 * real, live source of truth for routing, not the legacy free-text
 * Specialization field shown elsewhere on this screen (display-only). */
export function TailorSpecializationCard({ tailorId }: TailorSpecializationCardProps) {
  const { colors } = useTheme();
  const { data, isLoading, isError, refetch } = useTailorSpecializations(tailorId);
  const updateMutation = useUpdateTailorSpecializationsMutation(tailorId);

  const [editing, setEditing] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // Seed the editable draft from the server once it loads - not on every
  // refetch while editing, or a background refetch would clobber an
  // in-progress edit.
  useEffect(() => {
    if (data && !editing) setSelectedIds(data.service_sub_category_ids);
  }, [data, editing]);

  const startEdit = () => {
    setSelectedIds(data?.service_sub_category_ids ?? []);
    setEditing(true);
  };

  const cancelEdit = () => {
    setSelectedIds(data?.service_sub_category_ids ?? []);
    setEditing(false);
  };

  const handleSave = () => {
    if (selectedIds.length === 0) return;
    updateMutation.mutate(selectedIds, {
      onSuccess: () => setEditing(false),
    });
  };

  if (isLoading) {
    return (
      <View className="py-6 items-center">
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (isError) {
    return (
      <View className="py-4">
        <Text className="font-bold mb-2" style={{ color: colors.text }}>
          Specialization
        </Text>
        <Text className="text-sm mb-2" style={{ color: colors.error ?? '#dc2626' }}>
          Couldn't load specialization.
        </Text>
        <Button title="Retry" variant="outline" onPress={() => refetch()} />
      </View>
    );
  }

  const count = data?.service_sub_category_ids.length ?? 0;

  if (!editing) {
    return (
      <View>
        <View className="flex-row items-center justify-between mb-1">
          <Text className="font-bold" style={{ color: colors.text }}>
            Specialization
          </Text>
          <Button title="Edit" variant="outline" onPress={startEdit} />
        </View>
        <Text className="text-sm" style={{ color: colors.textMuted }}>
          {count > 0
            ? `${count} garment type${count === 1 ? '' : 's'} selected. This is what broadcast routing matches orders against.`
            : 'Not set up yet - this tailor is currently eligible for every order (no specialization filter applied).'}
        </Text>
      </View>
    );
  }

  return (
    <View>
      <SpecializationChecklist
        selectedIds={selectedIds}
        onChange={setSelectedIds}
        error={selectedIds.length === 0 ? 'Select at least one garment type.' : undefined}
      />
      <View className="flex-row gap-3 mt-3">
        <View className="flex-1">
          <Button title="Cancel" variant="outline" onPress={cancelEdit} fullWidth />
        </View>
        <View className="flex-1">
          <Button
            title="Save Changes"
            loading={updateMutation.isPending}
            disabled={selectedIds.length === 0}
            onPress={handleSave}
            fullWidth
          />
        </View>
      </View>
    </View>
  );
}
