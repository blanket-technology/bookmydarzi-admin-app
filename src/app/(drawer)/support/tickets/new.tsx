import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Text, View } from 'react-native';
import { Button, Header, Input, Pressable, ScreenContent } from '@/components/ui';
import { useCreateTicketMutation } from '@/features/support/hooks/useSupportTickets';
import { useTheme } from '@/hooks/useTheme';
import { TICKET_CATEGORIES, type TicketCategory } from '@/types/support';

const CATEGORY_LABELS: Record<TicketCategory, string> = {
  order: 'Order',
  payment: 'Payment',
  delivery: 'Delivery',
  account: 'Account',
  general: 'General',
};

export default function NewSupportTicketScreen() {
  const { colors } = useTheme();
  const createMutation = useCreateTicketMutation();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState<TicketCategory>('general');
  const [orderId, setOrderId] = useState('');

  const handleSubmit = () => {
    if (subject.trim().length < 3 || !message.trim()) return;
    createMutation.mutate(
      {
        subject: subject.trim(),
        message: message.trim(),
        category,
        order_id: orderId.trim() || undefined,
      },
      { onSuccess: (ticket) => router.push(`/(drawer)/support/tickets/${ticket.id}`) },
    );
  };

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <Header title="Raise a Ticket" showMenu={false} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScreenContent keyboardShouldPersistTaps="handled">
          <Input
            label="Subject"
            value={subject}
            onChangeText={setSubject}
            placeholder="Brief summary of the issue"
          />
          <Text className="text-sm font-medium mb-2" style={{ color: colors.textSecondary }}>
            CATEGORY
          </Text>
          <View className="flex-row flex-wrap mb-4" style={{ gap: 8 }}>
            {TICKET_CATEGORIES.map((value) => (
              <Pressable
                key={value}
                onPress={() => setCategory(value)}
                className="px-3.5 py-2 rounded-full border"
                style={{
                  backgroundColor: category === value ? colors.primary : colors.surface,
                  borderColor: category === value ? colors.primary : colors.border,
                }}
              >
                <Text
                  className="text-sm font-medium"
                  style={{ color: category === value ? '#fff' : colors.text }}
                >
                  {CATEGORY_LABELS[value]}
                </Text>
              </Pressable>
            ))}
          </View>
          {category === 'order' ? (
            <Input
              label="Order ID (optional)"
              value={orderId}
              onChangeText={setOrderId}
              keyboardType="number-pad"
              placeholder="e.g. 122"
            />
          ) : null}
          <Input
            label="Message"
            value={message}
            onChangeText={setMessage}
            placeholder="Describe the issue in detail"
            multiline
            containerClassName="mb-6"
          />
          <Button
            title="Submit Ticket"
            onPress={handleSubmit}
            loading={createMutation.isPending}
            disabled={subject.trim().length < 3 || !message.trim()}
            fullWidth
          />
        </ScreenContent>
      </KeyboardAvoidingView>
    </View>
  );
}
