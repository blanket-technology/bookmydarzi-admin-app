import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Badge, BottomSheet, Button, EmptyState, Header, Input, Loader, Pressable } from '@/components/ui';
import {
  useReplyTicketMutation,
  useSupportTicket,
  useUpdateTicketStatusMutation,
} from '@/features/support/hooks/useSupportTickets';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { useResponsive } from '@/hooks/useResponsive';
import { TICKET_STATUSES, type TicketStatus } from '@/types/support';
import { formatApiErrorDetail, formatDateTime } from '@/utils/errors';

const STATUS_BADGE: Record<string, { bg: string; color: string }> = {
  open: { bg: '#fef3c7', color: '#d97706' },
  in_progress: { bg: '#FBF3DF', color: '#7D622A' },
  resolved: { bg: '#dcfce7', color: '#16a34a' },
  closed: { bg: '#f3f4f6', color: '#6b7280' },
};

const STATUS_LABELS: Record<string, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  closed: 'Closed',
};

export default function SupportTicketDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const { contentMaxWidth } = useResponsive();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const normalizedRole = String(user?.role ?? '').toLowerCase();
  const isStaff = ['admin', 'superadmin', 'employee'].includes(normalizedRole);

  const { data: ticket, isLoading, isError, error, refetch } = useSupportTicket(id);
  const replyMutation = useReplyTicketMutation();
  const updateStatusMutation = useUpdateTicketStatusMutation();
  const [message, setMessage] = useState('');
  const [statusSheetVisible, setStatusSheetVisible] = useState(false);

  if (isLoading) return <Loader fullScreen />;
  if (isError || !ticket) {
    return (
      <View className="flex-1" style={{ backgroundColor: colors.background }}>
        <Header title="Support Ticket" showMenu={false} />
        <EmptyState
          title="Failed to load ticket"
          description={formatApiErrorDetail(error)}
          actionLabel="Retry"
          onAction={() => refetch()}
        />
      </View>
    );
  }

  const badge = STATUS_BADGE[ticket.status] ?? { bg: colors.surface, color: colors.textSecondary };
  const isClosed = ticket.status === 'closed';

  const handleReply = () => {
    if (!message.trim() || isClosed) return;
    replyMutation.mutate(
      { ticketId: id, payload: { message: message.trim() } },
      { onSuccess: () => setMessage('') },
    );
  };

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <Header
        title={ticket.ticket_code ?? `Ticket #${ticket.id}`}
        subtitle={ticket.subject}
        showMenu={false}
        rightAction={
          isStaff ? (
            <Pressable onPress={() => setStatusSheetVisible(true)}>
              <Ionicons name="options-outline" size={22} color={colors.text} />
            </Pressable>
          ) : (
            <Pressable onPress={() => router.back()}>
              <Ionicons name="close" size={24} color={colors.text} />
            </Pressable>
          )
        }
      />
      <KeyboardAvoidingView
        // Android already resizes the window for the keyboard via app.json's
        // softwareKeyboardLayoutMode: "resize" - "height" here double-applied
        // on top of that, which is what was hiding the reply input bar.
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
      <View className="flex-1 w-full self-center" style={{ maxWidth: contentMaxWidth }}>
        <View className="px-5 pt-3 flex-row items-center justify-between">
          <Badge label={STATUS_LABELS[ticket.status] ?? ticket.status} backgroundColor={badge.bg} color={badge.color} />
          {ticket.order_id ? (
            <Text className="text-xs" style={{ color: colors.textMuted }}>
              Order #{ticket.order_id}
            </Text>
          ) : null}
        </View>

        <ScrollView className="px-5 flex-1 mt-3" showsVerticalScrollIndicator={false}>
          {ticket.messages.map((msg) => {
            // sender_id is a number from the API, user.id a string: compare as strings.
            const isMine = String(msg.sender_id) === String(user?.id);
            // isMine alone only separates "my own replies" from everyone
            // else's - a tailor's message and another staff member's reply
            // both landed on the same left-aligned, identically-styled
            // bubble with no way to tell them apart. Give each sender role
            // its own color/label regardless of side, and keep isMine
            // purely for left/right alignment.
            const roleStyle =
              msg.sender_role === 'staff'
                ? { bg: colors.primaryLight, label: 'Support', labelColor: colors.primary }
                : msg.sender_role === 'tailor'
                  ? { bg: '#fef3c7', label: 'Tailor', labelColor: '#b45309' }
                  : { bg: colors.surface, label: 'Customer', labelColor: colors.textSecondary };

            return (
              <View
                key={msg.id}
                className="rounded-2xl p-3 mb-2"
                style={{
                  alignSelf: isMine ? 'flex-end' : 'flex-start',
                  maxWidth: '85%',
                  backgroundColor: isMine ? colors.primary : roleStyle.bg,
                }}
              >
                <Text
                  className="text-xs font-semibold mb-1"
                  style={{ color: isMine ? 'rgba(255,255,255,0.8)' : roleStyle.labelColor }}
                >
                  {isMine ? 'You' : roleStyle.label}
                </Text>
                <Text style={{ color: isMine ? '#fff' : colors.text }}>{msg.message}</Text>
                <Text
                  className="text-[10px] mt-1"
                  style={{ color: isMine ? 'rgba(255,255,255,0.6)' : colors.textMuted }}
                >
                  {formatDateTime(msg.created_at)}
                </Text>
              </View>
            );
          })}
          <View className="mb-4" />
        </ScrollView>

        {isClosed ? (
          <View className="px-5 py-4" style={{ paddingBottom: 16 + insets.bottom }}>
            <Text className="text-sm text-center" style={{ color: colors.textMuted }}>
              This ticket is closed. Raise a new ticket if you need further help.
            </Text>
          </View>
        ) : (
          <View className="px-5 py-3 flex-row items-end" style={{ gap: 8, paddingBottom: 12 + insets.bottom }}>
            <View className="flex-1">
              <Input
                value={message}
                onChangeText={setMessage}
                placeholder="Type a reply..."
                multiline
                containerClassName="mb-0"
              />
            </View>
            <Pressable
              onPress={handleReply}
              disabled={!message.trim() || replyMutation.isPending}
              className="w-11 h-11 rounded-full items-center justify-center mb-1"
              style={{ backgroundColor: colors.primary, opacity: !message.trim() ? 0.5 : 1 }}
            >
              <Ionicons name="send" size={18} color={colors.onPrimary} />
            </Pressable>
          </View>
        )}
      </View>
      </KeyboardAvoidingView>

      <BottomSheet
        visible={statusSheetVisible}
        onClose={() => setStatusSheetVisible(false)}
        title="Update Ticket Status"
      >
        {TICKET_STATUSES.map((status) => (
          <Pressable
            key={status}
            onPress={() => {
              updateStatusMutation.mutate(
                { ticketId: id, payload: { status } },
                { onSuccess: () => setStatusSheetVisible(false) },
              );
            }}
            className="flex-row items-center justify-between py-3.5 border-b"
            style={{ borderColor: colors.border }}
          >
            <Text style={{ color: colors.text }}>{STATUS_LABELS[status]}</Text>
            {ticket.status === status ? (
              <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
            ) : null}
          </Pressable>
        ))}
      </BottomSheet>
    </View>
  );
}
