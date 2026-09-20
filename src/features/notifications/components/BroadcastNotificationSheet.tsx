import { useState } from 'react';
import { Text, View } from 'react-native';
import { BottomSheet, Button, Input, Pressable } from '@/components/ui';
import { useSendBroadcastMutation } from '@/features/notifications/hooks/useNotifications';
import { useTheme } from '@/hooks/useTheme';
import {
  BROADCAST_TARGET_ROLES,
  BROADCAST_TYPES,
  type BroadcastNotificationRequest,
} from '@/types/notifications';

interface BroadcastNotificationSheetProps {
  visible: boolean;
  onClose: () => void;
}

const EMPTY_FORM: Pick<BroadcastNotificationRequest, 'title' | 'body' | 'type' | 'target_role'> = {
  title: '',
  body: '',
  type: 'promo',
  target_role: 'user',
};

// Admin-only: send a push notification to every user of a role. Mirrors
// final's BroadcastModal.jsx exactly - same fields, same default type/role.
export function BroadcastNotificationSheet({ visible, onClose }: BroadcastNotificationSheetProps) {
  const { colors } = useTheme();
  const mutation = useSendBroadcastMutation();
  const [form, setForm] = useState(EMPTY_FORM);

  const handleSend = () => {
    if (!form.title.trim() || !form.body.trim()) return;
    mutation.mutate(
      { ...form, title: form.title.trim(), body: form.body.trim() },
      {
        onSuccess: () => {
          setForm(EMPTY_FORM);
          onClose();
        },
      },
    );
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Send Broadcast Notification">
      <Text className="text-sm font-medium mb-2" style={{ color: colors.textSecondary }}>
        Send To
      </Text>
      <View className="flex-row flex-wrap mb-4" style={{ gap: 8 }}>
        {BROADCAST_TARGET_ROLES.map((role) => {
          const selected = form.target_role === role.value;
          return (
            <Pressable
              key={role.value}
              onPress={() => setForm((f) => ({ ...f, target_role: role.value }))}
              className="px-3.5 py-2 rounded-xl border"
              style={{
                borderColor: selected ? colors.primary : colors.border,
                backgroundColor: selected ? colors.primary : colors.surface,
              }}
            >
              <Text className="text-xs font-semibold" style={{ color: selected ? colors.onPrimary : colors.textSecondary }}>
                {role.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text className="text-sm font-medium mb-2" style={{ color: colors.textSecondary }}>
        Type
      </Text>
      <View className="flex-row flex-wrap mb-4" style={{ gap: 8 }}>
        {BROADCAST_TYPES.map((type) => {
          const selected = form.type === type;
          return (
            <Pressable
              key={type}
              onPress={() => setForm((f) => ({ ...f, type }))}
              className="px-3 py-1.5 rounded-full border"
              style={{
                borderColor: selected ? colors.primary : colors.border,
                backgroundColor: selected ? colors.primary : colors.surface,
              }}
            >
              <Text className="text-xs font-semibold capitalize" style={{ color: selected ? colors.onPrimary : colors.textSecondary }}>
                {type.replace(/_/g, ' ')}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Input
        label="Title"
        value={form.title}
        onChangeText={(t) => setForm((f) => ({ ...f, title: t }))}
        placeholder="e.g. New Year Offer!"
        maxLength={160}
      />
      <Input
        label="Message"
        value={form.body}
        onChangeText={(t) => setForm((f) => ({ ...f, body: t }))}
        placeholder="Notification message…"
        multiline
        maxLength={1000}
      />

      <Button
        title="Send"
        onPress={handleSend}
        loading={mutation.isPending}
        disabled={!form.title.trim() || !form.body.trim()}
        fullWidth
      />
    </BottomSheet>
  );
}
