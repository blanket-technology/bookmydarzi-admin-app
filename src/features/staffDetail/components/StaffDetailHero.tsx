import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import { Avatar, Badge, Button, Card, Pressable } from '@/components/ui';
import { useTheme } from '@/hooks/useTheme';
import type { StaffDetailIdentity } from '@/features/staffDetail/types';

interface StaffDetailHeroProps {
  identity: StaffDetailIdentity;
  editMode: boolean;
  onPickPhoto: () => void;
  photoUploading: boolean;
  /** Buttons shown only when NOT editing (Edit/Delete/Activate/etc) — each
   * screen supplies its own set since the exact actions differ by role. */
  actions: { title: string; variant: 'outline' | 'primary' | 'danger'; onPress: () => void; loading?: boolean }[];
}

// Shared across Tailor Detail and Employee Detail — avatar with tap-to-
// change photo, name, Active + optional Verified badges, an optional third
// "facts" line, and role-supplied action buttons. Photo upload is its own
// immediate mutation (not part of the account edit form's save payload), so
// the camera badge is always tappable, not gated behind editMode - it was
// previously edit-mode-only with no visible affordance until you'd already
// tapped Edit, which made it effectively undiscoverable.
export const StaffDetailHero = ({ identity, editMode, onPickPhoto, photoUploading, actions }: StaffDetailHeroProps) => {
  const { colors } = useTheme();

  return (
    <Card className="mx-5 mt-3 items-center" style={{ borderRadius: 24 }}>
      <Pressable onPress={onPickPhoto} disabled={photoUploading}>
        <Avatar name={identity.fullName ?? undefined} imageUrl={identity.profileImageUrl ?? undefined} size={72} />
        <View
          className="absolute bottom-0 right-0 rounded-full items-center justify-center"
          style={{ width: 24, height: 24, backgroundColor: colors.primary }}
        >
          <Ionicons name="camera" size={13} color="#fff" />
        </View>
      </Pressable>
      <Text className="text-lg font-bold mt-3" style={{ color: colors.text }}>
        {identity.fullName ?? '-'}
      </Text>
      <Text className="text-xs mt-0.5" style={{ color: colors.textSecondary }}>
        {identity.subtitleLine}
      </Text>
      <View className="flex-row gap-2 mt-2.5">
        <Badge
          label={identity.isActive ? 'Active' : 'Inactive'}
          backgroundColor={identity.isActive ? '#dcfce7' : '#fee2e2'}
          color={identity.isActive ? '#16a34a' : '#dc2626'}
        />
        {identity.verification ? (
          <Badge
            label={identity.verification.isApproved ? 'Verified' : 'Pending'}
            backgroundColor={identity.verification.isApproved ? '#dbeafe' : '#fef3c7'}
            color={identity.verification.isApproved ? '#1d4ed8' : '#d97706'}
          />
        ) : null}
      </View>
      {identity.factsLine ? (
        <Text className="text-xs mt-2" style={{ color: colors.textMuted }}>
          {identity.factsLine}
        </Text>
      ) : null}

      {!editMode && actions.length > 0 ? (
        <View className="flex-row gap-2 mt-4 flex-wrap justify-center">
          {actions.map((action) => (
            <Button
              key={action.title}
              title={action.title}
              size="sm"
              variant={action.variant}
              loading={action.loading}
              onPress={action.onPress}
            />
          ))}
        </View>
      ) : null}
    </Card>
  );
};
