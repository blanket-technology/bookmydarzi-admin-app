import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { Button, Card, EmptyState, Header, Input, Loader, ScreenContent } from '@/components/ui';
import { useBillingSettings, useUpdateBillingSettingsMutation } from '@/features/billing/hooks/useBilling';
import { useClearHomepageCacheMutation } from '@/features/homepage/hooks/useHomepage';
import { useTheme } from '@/hooks/useTheme';
import { formatApiErrorDetail, formatMoney } from '@/utils/errors';
import { toast } from '@/store/toastStore';

export default function BillingScreen() {
  const { colors } = useTheme();
  const { data, isLoading, isError, error, refetch } = useBillingSettings();
  const updateMutation = useUpdateBillingSettingsMutation();
  const clearCacheMutation = useClearHomepageCacheMutation();

  const [platformFee, setPlatformFee] = useState('');
  const [gstPercent, setGstPercent] = useState('');

  useEffect(() => {
    if (data) {
      setPlatformFee(String(data.platform_fee));
      setGstPercent(String(data.gst_percent));
    }
  }, [data]);

  // Strict parsing: Number('') is 0, so a cleared field used to pass validation
  // and silently set the platform fee or GST to zero for every new order.
  const parseField = (raw: string): number | null => {
    const cleaned = raw.trim().replace(',', '.');
    if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
    return Number(cleaned);
  };
  const feeValue = parseField(platformFee);
  const gstValue = parseField(gstPercent);
  const feeError = platformFee.trim() === '' || feeValue === null ? 'Enter an amount like 99 or 99.50' : undefined;
  const gstError =
    gstPercent.trim() === '' || gstValue === null || gstValue > 100 ? 'Enter a rate between 0 and 100' : undefined;

  const isDirty =
    data != null && feeValue !== null && gstValue !== null && (feeValue !== data.platform_fee || gstValue !== data.gst_percent);

  const handleSave = () => {
    if (updateMutation.isPending || feeValue === null || gstValue === null || feeError || gstError) {
      toast.error('Enter a valid platform fee and GST rate before saving.');
      return;
    }
    // Platform-wide money setting: confirm exactly what will change.
    Alert.alert(
      'Update billing?',
      `Platform fee ${formatMoney(feeValue)} and GST ${gstValue}% will apply to every new order from now on.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Update', onPress: () => updateMutation.mutate({ platform_fee: feeValue, gst_percent: gstValue }) },
      ],
    );
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
                error={platformFee !== String(data?.platform_fee ?? '') ? feeError : undefined}
                keyboardType="decimal-pad"
              />
              <Input
                label="GST rate (%)"
                value={gstPercent}
                onChangeText={setGstPercent}
                error={gstPercent !== String(data?.gst_percent ?? '') ? gstError : undefined}
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

            <Card className="mb-4 flex-row items-center justify-between">
              <View className="flex-1 mr-3">
                <Text className="text-sm font-semibold" style={{ color: colors.text }}>
                  Clear Homepage Cache
                </Text>
                <Text className="text-xs mt-0.5" style={{ color: colors.textSecondary }}>
                  Force-refresh the homepage data served to the customer app
                </Text>
              </View>
              <Button
                title="Clear"
                variant="outline"
                loading={clearCacheMutation.isPending}
                onPress={() => clearCacheMutation.mutate()}
              />
            </Card>
          </>
        )}
      </ScreenContent>
    </View>
  );
}
