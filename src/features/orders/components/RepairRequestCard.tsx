import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Image, Text, View } from 'react-native';
import { Card, Modal, Pressable } from '@/components/ui';
import { useTheme } from '@/hooks/useTheme';
import type { AdminOrderItem } from '@/types/orders';

/** Shown for any order that has ever entered the post-delivery inspection
 * window's repair sub-flow - the customer's reported issue, for both the
 * tailor (what to fix) and admin/staff (oversight). Read-only here; the
 * tailor's "Mark Repair Complete" action lives in the order-detail screen's
 * action bar (useOrderActions.ts), not this card. */
export const RepairRequestCard = ({ order }: { order: AdminOrderItem }) => {
  const { colors } = useTheme();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const repair = order.latest_repair_request;

  if (!repair) return null;

  const resolved = !!repair.resolved_at;

  return (
    <Card className="mb-4">
      <View className="flex-row items-center justify-between mb-2">
        <View className="flex-row items-center">
          <Ionicons name="build-outline" size={16} color={resolved ? colors.textMuted : '#dc2626'} />
          <Text className="font-bold ml-2" style={{ color: colors.text }}>
            {resolved ? 'Repair Completed' : 'Issue Reported'}
          </Text>
        </View>
        {!resolved ? (
          <View className="px-2 py-0.5 rounded-full" style={{ backgroundColor: '#FEF2F2' }}>
            <Text className="text-[10px] font-bold" style={{ color: '#dc2626' }}>
              NEEDS REPAIR
            </Text>
          </View>
        ) : null}
      </View>

      <Text className="text-sm mb-2" style={{ color: colors.text }}>
        {repair.issue_description}
      </Text>

      {repair.issue_photo_urls && repair.issue_photo_urls.length > 0 ? (
        <View className="flex-row flex-wrap gap-2 mb-2">
          {repair.issue_photo_urls.map((url, idx) => (
            <Pressable key={`${url}-${idx}`} onPress={() => setPreviewUrl(url)}>
              <Image source={{ uri: url }} style={{ width: 56, height: 56, borderRadius: 8 }} resizeMode="cover" />
            </Pressable>
          ))}
        </View>
      ) : null}

      <Text className="text-xs" style={{ color: colors.textMuted }}>
        Reported {new Date(repair.reported_at).toLocaleString()}
        {resolved && repair.resolved_at ? ` · Resolved ${new Date(repair.resolved_at).toLocaleString()}` : ''}
      </Text>

      <Modal visible={!!previewUrl} onClose={() => setPreviewUrl(null)} title="Issue Photo">
        {previewUrl ? (
          <Image
            source={{ uri: previewUrl }}
            style={{ width: '100%', aspectRatio: 1, borderRadius: 16 }}
            resizeMode="contain"
          />
        ) : null}
      </Modal>
    </Card>
  );
};
