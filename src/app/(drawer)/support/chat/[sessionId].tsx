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
import type { ChatSessionStatus, LocalChatMessage } from '@/types/chat';
import { formatDateTime } from '@/utils/errors';

export default function ChatThreadScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const { colors } = useTheme();
  const { contentMaxWidth, isLargeScreen } = useResponsive();
  const chatImageSize = isLargeScreen ? 220 : 160;
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList<LocalChatMessage>>(null);

  const [draft, setDraft] = useState('');
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

  const {
    isConnected,
    peerTyping,
    messages: localMessages,
    setInitialMessages,
    sendMessage,
    retryMessage,
    sendTyping,
    sendReadReceipt,
  } = useChatSocket(sessionId, handleSessionEvent);

  // Seeds the hook's message list from REST history once per load - the
  // hook then owns appends/status updates from here on (WS frames, optimistic
  // sends, ack timeouts, reconnect resends).
  useEffect(() => {
    if (data?.messages) setInitialMessages(data.messages);
  }, [data, setInitialMessages]);

  const currentStatus = liveStatus ?? sessionDetail?.status;
  const isResolved = currentStatus === 'resolved' || currentStatus === 'closed';

  // Mark read up to the latest message whenever the visible list grows -
  // read_receipt_updated then lets the customer app show a read tick.
  // Depends on isConnected: history usually loads before the socket opens, and a
  // receipt sent into a closed socket is dropped (the inbox then kept showing
  // an unread count for a thread the agent was reading).
  useEffect(() => {
    if (!isConnected || localMessages.length === 0) return;
    const lastSeq = Math.max(...localMessages.map((m) => m.seq ?? 0));
    if (lastSeq > 0) sendReadReceipt(lastSeq);
  }, [isConnected, localMessages, sendReadReceipt]);

  // Leaving the thread: refresh the inbox so its unread badges are correct.
  useEffect(
    () => () => {
      queryClient.invalidateQueries({ queryKey: ['chat-sessions'] });
    },
    [queryClient],
  );

  const handleSend = () => {
    const body = draft.trim();
    if (!body) return;
    // sendMessage now always queues the message optimistically (marked
    // "pending" even if the socket is closed) instead of silently dropping
    // it - if the socket is down, the ack timeout marks it "failed" with a
    // Retry affordance, and a later reconnect auto-resends anything still
    // pending/failed. No more "not connected" toast needed here.
    sendMessage(body);
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
          sendMessage('', res.url);
        },
      },
    );
  };

  const handleAssignToMe = () => {
    if (!user?.id) return;
    assignMutation.mutate({ sessionUuid: sessionId, agentId: Number(user.id) });
  };

  const renderItem = ({ item }: { item: LocalChatMessage }) => {
    const isAgent = item.sender_type === 'agent' || item.sender_type === 'ai';
    const imageUrl = item.message_type === 'image' ? (item.metadata?.attachment_id as string | undefined) : undefined;
    const isFailed = item.deliveryStatus === 'failed';
    const isPending = item.deliveryStatus === 'pending';
    return (
      <View className={`mb-3 flex-row ${isAgent ? 'justify-end' : 'justify-start'}`}>
        <View
          className="rounded-2xl px-4 py-2.5 max-w-[80%]"
          style={{
            backgroundColor: isAgent ? colors.primary : colors.surface,
            borderWidth: isAgent ? 0 : 1,
            borderColor: colors.border,
            opacity: isPending ? 0.6 : 1,
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
              style={{ width: chatImageSize, height: chatImageSize, borderRadius: 10, marginBottom: item.body ? 6 : 0 }}
              contentFit="cover"
            />
          ) : null}
          {item.body ? (
            <Text style={{ color: isAgent ? '#ffffff' : colors.text }}>{item.body}</Text>
          ) : null}
          {/* Read-only visibility into the quick-reply chips the AI offered
              the customer on this message - staff don't tap these (the
              customer already did, or will), this is just context. */}
          {item.sender_type === 'ai' && Array.isArray(item.metadata?.quick_replies) ? (
            <View className="flex-row flex-wrap gap-1.5 mt-1.5">
              {(item.metadata?.quick_replies as { label: string }[] | undefined ?? []).map((chip, i) => (
                <View key={i} className="rounded-full border px-2.5 py-1" style={{ borderColor: 'rgba(255,255,255,0.4)' }}>
                  <Text className="text-[10px] font-semibold" style={{ color: '#e9d5ff' }}>
                    {chip.label}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}
          <View className="flex-row items-center mt-1 gap-2">
            <Text style={{ color: isAgent ? '#e9d5ff' : colors.textMuted }} className="text-[10px]">
              {isPending ? 'Sending…' : formatDateTime(item.created_at ?? undefined)}
            </Text>
            {isFailed && item.client_id && (
              <Pressable onPress={() => retryMessage(item.client_id!)}>
                <Text className="text-[10px] font-semibold" style={{ color: '#fca5a5' }}>
                  Failed · Retry
                </Text>
              </Pressable>
            )}
          </View>
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
            <Pressable onPress={() => setHistoryOpen(true)} hitSlop={8}>
              <Ionicons name="time-outline" size={22} color={colors.text} />
            </Pressable>
            <Pressable onPress={() => router.back()} hitSlop={8}>
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
          style={{ flex: 1 }}
          // app.json's softwareKeyboardLayoutMode is now "resize" (it used to
          // be "pan", a no-op for this purpose, which is why "height" was
          // added here previously as a fallback). With "resize" active the
          // OS already shrinks the window for the keyboard - "height" now
          // double-applies on top of that, squishing/hiding the message
          // input instead of showing it, so Android must use `undefined`.
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
        <View className="flex-1 w-full self-center" style={{ maxWidth: contentMaxWidth }}>
          <FlatList
            ref={listRef}
            data={localMessages}
            keyExtractor={(item) => String(item.client_id ?? item.id)}
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
                  containerClassName="mb-0"
                  style={{ maxHeight: 100 }}
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
