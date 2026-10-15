import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
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
  // Deep-linked from an order screen (e.g. a tailor's "Contact Support"
  // button on orders/[id].tsx) with orderId/category pre-filled so the
  // ticket is never accidentally raised detached from the order the tailor
  // meant to ask about.
  const params = useLocalSearchParams<{ orderId?: string; category?: TicketCategory }>();
  const isPrefilled = !!params.orderId;
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState<TicketCategory>(params.category ?? 'general');
  const [orderId, setOrderId] = useState(params.orderId ?? '');

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
      <Header title={isPrefilled ? 'Contact Support' : 'Raise a Ticket'} showMenu={false} />
      {/* ScreenContent already wraps itself in a correctly-configured
          KeyboardAvoidingView (avoidKeyboard defaults true) - nesting a
          second one here double-applied Android's keyboard avoidance on top
          of app.json's softwareKeyboardLayoutMode: "resize", hiding/squishing
          the form instead of showing it above the keyboard. */}
      <ScreenContent keyboardShouldPersistTaps="handled">
          {isPrefilled ? (
            <View
              className="flex-row items-center px-3.5 py-2.5 rounded-2xl mb-4"
              style={{ backgroundColor: colors.primaryLight }}
            >
              <Text className="text-sm font-medium flex-1" style={{ color: colors.primary }}>
                About Order #{orderId}
              </Text>
            </View>
          ) : null}
          <Input
            label="Subject"
            value={subject}
            onChangeText={setSubject}
            placeholder="Brief summary of the issue"
          />
          {!isPrefilled ? (
            <>
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
            </>
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
    </View>
  );
}
