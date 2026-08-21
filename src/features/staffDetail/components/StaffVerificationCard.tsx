import { Button, Card } from '@/components/ui';
import { Text, View } from 'react-native';
import { useTheme } from '@/hooks/useTheme';

interface StaffVerificationCardProps {
  isApproved: boolean;
  kycCount: number;
  loading: boolean;
  onToggle: () => void;
  /** "tailor" / "account" / etc — fills "This {subject}'s documents...". */
  subjectLabel: string;
}

// By default every tailor/employee starts UNVERIFIED (Pending) - the button
// only ever enables once all 3 KYC docs are on file, and only flips to
// "Unverify" after a real approval, never before. Shared because the rule
// and copy are identical for both roles; only the backend endpoint differs
// (each screen wires its own onToggle).
export const StaffVerificationCard = ({ isApproved, kycCount, loading, onToggle, subjectLabel }: StaffVerificationCardProps) => {
  const { colors } = useTheme();

  return (
    <Card>
      <View className="flex-row items-center justify-between">
        <View className="flex-1 pr-3">
          <Text className="font-bold" style={{ color: colors.text }}>
            Verification
          </Text>
          <Text className="text-xs mt-0.5" style={{ color: colors.textSecondary }}>
            {isApproved
              ? `This ${subjectLabel}'s documents have been reviewed and verified.`
              : kycCount === 3
                ? 'All 3 documents uploaded — ready for review.'
                : `${kycCount}/3 documents uploaded. Verification requires all 3.`}
          </Text>
        </View>
        <Button
          title={isApproved ? 'Unverify' : 'Verify'}
          size="sm"
          variant={isApproved ? 'outline' : 'primary'}
          disabled={!isApproved && kycCount < 3}
          loading={loading}
          onPress={onToggle}
        />
      </View>
    </Card>
  );
};
