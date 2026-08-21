import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { Button, Card, EmptyState, Header, Input, Loader, ScreenContent } from '@/components/ui';
import { useBillingSettings, useUpdateBillingSettingsMutation } from '@/features/billing/hooks/useBilling';
import { useTheme } from '@/hooks/useTheme';
import { formatApiErrorDetail } from '@/utils/errors';

export default function BillingScreen() {
  const { colors } = useTheme();
  const { data, isLoading, isError, error, refetch } = useBillingSettings();
  const updateMutation = useUpdateBillingSettingsMutation();

  const [platformFee, setPlatformFee] = useState('');
  const [gstPercent, setGstPercent] = useState('');

  useEffect(() => {
    if (data) {
      setPlatformFee(String(data.platform_fee));
      setGstPercent(String(data.gst_percent));
    }
  }, [data]);

  const isDirty =
    data != null && (Number(platformFee) !== data.platform_fee || Number(gstPercent) !== data.gst_percent);

  const handleSave = () => {
    const fee = Number(platformFee);
    const gst = Number(gstPercent);
    if (Number.isNaN(fee) || fee < 0) return;
    if (Number.isNaN(gst) || gst < 0 || gst > 100) return;
    updateMutation.mutate({ platform_fee: fee, gst_percent: gst });
  };

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <Header title="Billing" subtitle="Platform fee & GST configuration" />
      <ScreenContent>
        {isLoading ? (
          <Loader message="Loading billing settings..." />
        ) : isError ? (
          <EmptyState
            title="Failed to load billing settings"
            description={formatApiErrorDetail(error)}
            actionLabel="Retry"
            onAction={() => refetch()}
          />
        ) : (
          <>
            <Card className="mb-4 flex-row items-start">
              <Ionicons name="information-circle-outline" size={18} color={colors.textSecondary} style={{ marginTop: 1 }} />
              <Text className="text-xs ml-2 flex-1" style={{ color: colors.textSecondary }}>
                These values apply platform-wide to every new order's billing calculation. Changes take
                effect immediately.
              </Text>
            </Card>

            <Card className="mb-4">
              <Input
                label="Platform fee (₹ flat, per order)"
                value={platformFee}
                onChangeText={setPlatformFee}
                keyboardType="decimal-pad"
              />
              <Input
                label="GST rate (%)"
                value={gstPercent}
                onChangeText={setGstPercent}
                keyboardType="decimal-pad"
              />
              <Button
                title="Save Changes"
                onPress={handleSave}
                loading={updateMutation.isPending}
                disabled={!isDirty}
                fullWidth
              />
            </Card>
          </>
        )}
      </ScreenContent>
    </View>
  );
}
