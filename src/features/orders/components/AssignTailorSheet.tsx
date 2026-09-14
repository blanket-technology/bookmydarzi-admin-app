import { useMemo } from 'react';
import { Text } from 'react-native';
import { BottomSheet, EmptyState, Pressable } from '@/components/ui';
import { useAppLanguage } from '@/hooks/useAppLanguage';
import { useTheme } from '@/hooks/useTheme';

/** Structurally compatible with both AdminTailorListItem and
 * EmployeeTailorListItem (types/tailors.ts) - the parent screen already
 * merges whichever one applies to the current role into one array before
 * passing it down, so this only needs the fields it actually renders. */
interface AssignableTailor {
  tailor_id: string;
  full_name?: string;
  specialization?: string | null;
  is_available?: boolean;
}

export const AssignTailorSheet = ({
  visible,
  onClose,
  tailors,
  onAssign,
}: {
  visible: boolean;
  onClose: () => void;
  tailors: AssignableTailor[];
  onAssign: (tailorId: string) => void;
}) => {
  const { colors } = useTheme();
  const { t } = useAppLanguage();

  // Only offer tailors currently marked available - the backend list
  // endpoints (GET /admin/tailors, GET /employee/tailors) don't yet accept
  // an availability filter, but they already return `is_available` per
  // tailor (that's the exact field this sheet was previously only using
  // for display text, "Available"/"Busy", never to actually filter the
  // list) - so this is client-side filtering, not a new backend call.
  const availableTailors = useMemo(
    () => tailors.filter((t) => t.is_available !== false),
    [tailors],
  );

  return (
    <BottomSheet visible={visible} onClose={onClose} title={t('assignTailor.title')}>
      {availableTailors.length === 0 ? (
        <EmptyState
          icon="cut-outline"
          title={t('assignTailor.noAvailable')}
          description={t('assignTailor.noAvailableBody')}
        />
      ) : (
        availableTailors.map((tailor) => (
          <Pressable key={tailor.tailor_id} onPress={() => onAssign(tailor.tailor_id)} className="py-3 border-b" style={{ borderColor: colors.border }}>
            <Text className="font-semibold" style={{ color: colors.text }}>
              {tailor.full_name}
            </Text>
            <Text className="text-sm" style={{ color: colors.textSecondary }}>
              {tailor.specialization} · {t('assignTailor.available')}
            </Text>
          </Pressable>
        ))
      )}
    </BottomSheet>
  );
};
