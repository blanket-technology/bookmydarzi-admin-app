import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Badge, BottomSheet, Button, ConfirmModal, EmptyState, Header, Input, Loader, Pressable } from '@/components/ui';
import {
  useAssignmentHistory,
  useAssignSessionMutation,
  useChatMessages,
  useChatSession,
  useEscalateSessionMutation,
  useQuickReplies,
  useResolveSessionMutation,
  useUploadChatAttachmentMutation,
} from '@/features/chat/hooks/useChat';
import { useChatSocket, type ChatSocketSessionEvent } from '@/features/chat/hooks/useChatSocket';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { useResponsive } from '@/hooks/useResponsive';
import { useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/constants/queryKeys';
import { toast } from '@/store/toastStore';
import type { ChatMessage, ChatSessionStatus } from '@/types/chat';
import { formatDateTime } from '@/utils/errors';

export default function ChatThreadScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const { colors } = useTheme();
  const { contentMaxWidth } = useResponsive();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList<ChatMessage>>(null);

  const [draft, setDraft] = useState('');
  const [localMessages, setLocalMessages] = useState<ChatMessage[]>([]);
  const [confirmResolve, setConfirmResolve] = useState(false);
  const [confirmEscalate, setConfirmEscalate] = useState(false);
  const [liveStatus, setLiveStatus] = useState<ChatSessionStatus | null>(null);
  const [quickRepliesOpen, setQuickRepliesOpen] = useState(false);
  const { data: quickRepliesData } = useQuickReplies(quickRepliesOpen);
  const [historyOpen, setHistoryOpen] = useState(false);
  const { data: historyData, isLoading: historyLoading } = useAssignmentHistory(
    sessionId,
    historyOpen,
  );

  const queryClient = useQueryClient();
  const { data, isLoading, isError } = useChatMessages(sessionId);
  const { data: sessionDetail } = useChatSession(sessionId);
  const assignMutation = useAssignSessionMutation();
  const resolveMutation = useResolveSessionMutation();
  const escalateMutation = useEscalateSessionMutation();
  const uploadAttachmentMutation = useUploadChatAttachmentMutation();

  useEffect(() => {
    if (data?.messages) setLocalMessages(data.messages);
  }, [data]);

  const handleIncomingMessage = useCallback((message: ChatMessage) => {
    setLocalMessages((prev) => {
      if (prev.some((m) => m.id === message.id)) return prev;
      return [...prev, message];
    });
  }, []);

  // Without this, an assignment/resolution/status change made by another
  // agent (or the AI escalating) only reaches this open thread on the
  // inbox's next 20s poll - a second agent could be typing into an
  // already-resolved conversation in the meantime.
  const handleSessionEvent = useCallback(
    (event: ChatSocketSessionEvent) => {
      if (event.status) setLiveStatus(event.status as ChatSessionStatus);
      if (event.type === 'resolved') setLiveStatus('resolved');
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CHAT_SESSION(sessionId) });
      queryClient.invalidateQueries({ queryKey: ['chat-sessions'] });
    },
    [queryClient, sessionId],
  );

  const { isConnected, peerTyping, sendMessage, sendTyping, sendReadReceipt } = useChatSocket(
    sessionId,
    handleIncomingMessage,
    undefined,
    handleSessionEvent,
  );

  const currentStatus = liveStatus ?? sessionDetail?.status;
  const isResolved = currentStatus === 'resolved' || currentStatus === 'closed';

  // Mark read up to the latest message whenever the visible list grows -
  // read_receipt_updated then lets the customer app show a read tick.
  useEffect(() => {
    if (localMessages.length === 0) return;
    const lastSeq = Math.max(...localMessages.map((m) => m.seq ?? 0));
    if (lastSeq > 0) sendReadReceipt(lastSeq);
  }, [localMessages, sendReadReceipt]);

  const handleSend = () => {
    const body = draft.trim();
    if (!body) return;
    // sendMessage returns null when the socket isn't actually open (e.g.
    // reconnecting) — previously the draft was cleared unconditionally here,
    // so the agent saw an empty composer as if the message sent while it was
    // silently dropped. Keep the draft and tell them, instead.
    const clientId = sendMessage(body);
    if (!clientId) {
      toast.error('Not connected — message not sent. Try again in a moment.');
      return;
    }
    setDraft('');
    sendTyping(false);
  };

  const handleAttachImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      toast.error('Photo library permission is required');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    uploadAttachmentMutation.mutate(
      { uri: asset.uri, fileName: asset.fileName ?? undefined, mimeType: asset.mimeType ?? 'image/jpeg' },
      {
        onSuccess: (res) => {
          // No caption required for an image send - matches the backend's
          // own "body OR attachment_id" rule (chat_ws.py's _handle_send_message).
          const clientId = sendMessage('', res.url);
          if (!clientId) {
            toast.error('Not connected — image not sent. Try again in a moment.');
          }
        },
      },
    );
  };

  const handleAssignToMe = () => {
    if (!user?.id) return;
    assignMutation.mutate({ sessionUuid: sessionId, agentId: Number(user.id) });
  };

  const renderItem = ({ item }: { item: ChatMessage }) => {
    const isAgent = item.sender_type === 'agent' || item.sender_type === 'ai';
    const imageUrl = item.message_type === 'image' ? (item.metadata?.attachment_id as string | undefined) : undefined;
    return (
      <View className={`mb-3 flex-row ${isAgent ? 'justify-end' : 'justify-start'}`}>
        <View
          className="rounded-2xl px-4 py-2.5 max-w-[80%]"
          style={{
            backgroundColor: isAgent ? colors.primary : colors.surface,
            borderWidth: isAgent ? 0 : 1,
            borderColor: colors.border,
          }}
        >
          {item.sender_type === 'ai' && (
            <Text className="text-xs font-semibold mb-1" style={{ color: '#e9d5ff' }}>
              AI Assistant
            </Text>
          )}
          {imageUrl ? (
            <Image
              source={{ uri: imageUrl }}
              style={{ width: 160, height: 160, borderRadius: 10, marginBottom: item.body ? 6 : 0 }}
              contentFit="cover"
            />
          ) : null}
          {item.body ? (
            <Text style={{ color: isAgent ? '#ffffff' : colors.text }}>{item.body}</Text>
          ) : null}
          <Text
            className="text-[10px] mt-1"
            style={{ color: isAgent ? '#e9d5ff' : colors.textMuted }}
          >
            {formatDateTime(item.created_at ?? undefined)}
          </Text>
        </View>
      </View>
    );
  };

  const headerSubtitle = useMemo(() => {
    const parts: string[] = [];
    if (sessionDetail?.customer_name) parts.push(sessionDetail.customer_name);
    if (sessionDetail?.order_code) parts.push(sessionDetail.order_code);
    parts.push(isConnected ? 'Connected' : 'Reconnecting…');
    return parts.join(' · ');
  }, [sessionDetail, isConnected]);

  if (!sessionId) return null;

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <Header
        title="Conversation"
        subtitle={headerSubtitle}
        showMenu={false}
        rightAction={
          <View className="flex-row items-center gap-3">
            <Pressable onPress={() => setHistoryOpen(true)}>
              <Ionicons name="time-outline" size={22} color={colors.text} />
            </Pressable>
            <Pressable onPress={() => router.back()}>
              <Ionicons name="close" size={24} color={colors.text} />
            </Pressable>
          </View>
        }
      />

      {!isResolved && localMessages.length > 0 && (
        <View className="flex-row px-5 pb-3 gap-2">
          <Pressable
            onPress={handleAssignToMe}
            disabled={assignMutation.isPending}
            className="flex-1 py-2.5 rounded-xl items-center border"
            style={{ borderColor: colors.border, backgroundColor: colors.surface }}
          >
            <Text className="text-sm font-medium" style={{ color: colors.text }}>
              Assign to Me
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setConfirmEscalate(true)}
            disabled={escalateMutation.isPending}
            className="flex-1 py-2.5 rounded-xl items-center border"
            style={{ borderColor: colors.border, backgroundColor: colors.surface }}
          >
            <Text className="text-sm font-medium" style={{ color: colors.text }}>
              Escalate
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setConfirmResolve(true)}
            disabled={resolveMutation.isPending}
            className="flex-1 py-2.5 rounded-xl items-center"
            style={{ backgroundColor: colors.primary }}
          >
            <Text className="text-sm font-medium" style={{ color: colors.onPrimary }}>
              Resolve
            </Text>
          </Pressable>
        </View>
      )}

      {isLoading ? (
        <Loader fullScreen message="Loading conversation..." />
      ) : isError ? (
        <EmptyState
          icon="alert-circle-outline"
          title="Could not load this conversation"
        />
      ) : (
        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={90}
        >
        <View className="flex-1 w-full self-center" style={{ maxWidth: contentMaxWidth }}>
          <FlatList
            ref={listRef}
            data={localMessages}
            keyExtractor={(item) => String(item.id ?? item.client_id)}
            renderItem={renderItem}
            className="px-5"
            contentContainerStyle={{ paddingVertical: 12 }}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
            ListEmptyComponent={
              <EmptyState
                icon="chatbubble-ellipses-outline"
                title="No messages yet"
                description="Send a message to start the conversation"
              />
            }
          />

          {peerTyping && (
            <Text className="text-xs px-5 pb-1" style={{ color: colors.textMuted }}>
              Typing…
            </Text>
          )}

          {isResolved ? (
            <View
              className="px-5 py-4 border-t items-center"
              style={{ borderColor: colors.border, paddingBottom: 16 + insets.bottom }}
            >
              <Text className="text-sm font-medium" style={{ color: colors.textMuted }}>
                This conversation has been resolved.
              </Text>
            </View>
          ) : (
            <View
              className="flex-row items-center px-5 py-3 gap-2 border-t"
              style={{ borderColor: colors.border, paddingBottom: 12 + insets.bottom }}
            >
              <Pressable
                onPress={() => setQuickRepliesOpen(true)}
                className="w-11 h-11 rounded-full items-center justify-center border"
                style={{ borderColor: colors.border, backgroundColor: colors.surface }}
              >
                <Ionicons name="flash-outline" size={18} color={colors.text} />
              </Pressable>
              <Pressable
                onPress={handleAttachImage}
                disabled={uploadAttachmentMutation.isPending}
                accessibilityRole="button"
                accessibilityLabel="Attach image"
                className="w-11 h-11 rounded-full items-center justify-center border"
                style={{
                  borderColor: colors.border,
                  backgroundColor: colors.surface,
                  opacity: uploadAttachmentMutation.isPending ? 0.6 : 1,
                }}
              >
                {uploadAttachmentMutation.isPending ? (
                  <ActivityIndicator size="small" color={colors.text} />
                ) : (
                  <Ionicons name="image-outline" size={18} color={colors.text} />
                )}
              </Pressable>
              <View className="flex-1">
                <Input
                  value={draft}
                  onChangeText={(text) => {
                    setDraft(text);
                    sendTyping(text.length > 0);
                  }}
                  placeholder="Type a message..."
                  multiline
                />
              </View>
              <Pressable
                onPress={handleSend}
                disabled={!draft.trim()}
                className="w-11 h-11 rounded-full items-center justify-center"
                style={{ backgroundColor: colors.primary, opacity: draft.trim() ? 1 : 0.5 }}
              >
                <Ionicons name="send" size={18} color={colors.onPrimary} />
              </Pressable>
            </View>
          )}
        </View>
        </KeyboardAvoidingView>
      )}

      <ConfirmModal
        visible={confirmResolve}
        title="Resolve Conversation"
        message="Mark this conversation as resolved? The customer will be prompted to rate the support."
        confirmLabel="Resolve"
        loading={resolveMutation.isPending}
        onConfirm={() => {
          resolveMutation.mutate(sessionId, { onSuccess: () => setConfirmResolve(false) });
        }}
        onCancel={() => setConfirmResolve(false)}
      />

      <ConfirmModal
        visible={confirmEscalate}
        title="Escalate Conversation"
        message="Escalate this conversation for priority human handling?"
        confirmLabel="Escalate"
        loading={escalateMutation.isPending}
        onConfirm={() => {
          escalateMutation.mutate(sessionId, { onSuccess: () => setConfirmEscalate(false) });
        }}
        onCancel={() => setConfirmEscalate(false)}
      />

      <BottomSheet
        visible={quickRepliesOpen}
        onClose={() => setQuickRepliesOpen(false)}
        title="Quick Replies"
      >
        {(quickRepliesData?.quick_replies?.length ?? 0) === 0 ? (
          <Text className="text-sm text-center py-6" style={{ color: colors.textMuted }}>
            No quick replies yet.
          </Text>
        ) : (
          <View style={{ maxHeight: 420 }}>
            <FlatList
              data={quickRepliesData?.quick_replies ?? []}
              keyExtractor={(item) => String(item.id)}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => {
                    setDraft(item.body);
                    setQuickRepliesOpen(false);
                  }}
                  className="py-3 border-b"
                  style={{ borderColor: colors.border }}
                >
                  <Text className="text-sm font-semibold" style={{ color: colors.text }}>
                    {item.title}
                  </Text>
                  <Text className="text-xs mt-1" numberOfLines={2} style={{ color: colors.textMuted }}>
                    {item.body}
                  </Text>
                </Pressable>
              )}
            />
          </View>
        )}
      </BottomSheet>

      <BottomSheet
        visible={historyOpen}
        onClose={() => setHistoryOpen(false)}
        title="Assignment History"
      >
        {historyLoading ? (
          <Loader message="Loading history..." />
        ) : (historyData?.history?.length ?? 0) === 0 ? (
          <Text className="text-sm text-center py-6" style={{ color: colors.textMuted }}>
            No assignments yet.
          </Text>
        ) : (
          <View style={{ maxHeight: 420 }}>
            <FlatList
              data={historyData?.history ?? []}
              keyExtractor={(item) => String(item.id)}
              renderItem={({ item }) => (
                <View className="py-3 border-b" style={{ borderColor: colors.border }}>
                  <Text className="text-sm font-semibold" style={{ color: colors.text }}>
                    {item.agent_name ?? (item.agent_id ? `Agent #${item.agent_id}` : 'Unassigned')}
                  </Text>
                  <Text className="text-xs mt-1" style={{ color: colors.textMuted }}>
                    {ASSIGNMENT_REASON_LABELS[item.reason] ?? item.reason}
                    {item.assigned_by_name ? ` · by ${item.assigned_by_name}` : ''}
                  </Text>
                  <Text className="text-xs mt-0.5" style={{ color: colors.textMuted }}>
                    {formatDateTime(item.assigned_at ?? undefined)}
                  </Text>
                </View>
              )}
            />
          </View>
        )}
      </BottomSheet>
    </View>
  );
}

const ASSIGNMENT_REASON_LABELS: Record<string, string> = {
  auto: 'Auto-assigned',
  admin_manual: 'Manually assigned',
  queue_sweep: 'Assigned from queue',
};
