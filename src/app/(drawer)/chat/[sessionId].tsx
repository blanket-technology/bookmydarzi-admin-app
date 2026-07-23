import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  View,
} from 'react-native';
import {
  Badge,
  Button,
  ConfirmModal,
  EmptyState,
  Header,
  Input,
  Loader,
} from '@/components/ui';
import {
  useAssignSessionMutation,
  useChatMessages,
  useEscalateSessionMutation,
  useResolveSessionMutation,
} from '@/features/chat/hooks/useChat';
import { useChatSocket } from '@/features/chat/hooks/useChatSocket';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import type { ChatMessage } from '@/types/chat';
import { formatDateTime } from '@/utils/errors';

export default function ChatThreadScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const { colors } = useTheme();
  const { user } = useAuth();
  const listRef = useRef<FlatList<ChatMessage>>(null);

  const [draft, setDraft] = useState('');
  const [localMessages, setLocalMessages] = useState<ChatMessage[]>([]);
  const [confirmResolve, setConfirmResolve] = useState(false);
  const [confirmEscalate, setConfirmEscalate] = useState(false);

  const { data, isLoading, isError } = useChatMessages(sessionId);
  const assignMutation = useAssignSessionMutation();
  const resolveMutation = useResolveSessionMutation();
  const escalateMutation = useEscalateSessionMutation();

  useEffect(() => {
    if (data?.messages) setLocalMessages(data.messages);
  }, [data]);

  const handleIncomingMessage = useCallback((message: ChatMessage) => {
    setLocalMessages((prev) => {
      if (prev.some((m) => m.id === message.id)) return prev;
      return [...prev, message];
    });
  }, []);

  const { isConnected, peerTyping, sendMessage, sendTyping } = useChatSocket(
    sessionId,
    handleIncomingMessage,
  );

  const handleSend = () => {
    const body = draft.trim();
    if (!body) return;
    sendMessage(body);
    setDraft('');
    sendTyping(false);
  };

  const handleAssignToMe = () => {
    if (!user?.id) return;
    assignMutation.mutate({ sessionUuid: sessionId, agentId: Number(user.id) });
  };

  const renderItem = ({ item }: { item: ChatMessage }) => {
    const isAgent = item.sender_type === 'agent' || item.sender_type === 'ai';
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
          <Text style={{ color: isAgent ? '#ffffff' : colors.text }}>{item.body}</Text>
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

  const headerSubtitle = useMemo(
    () => (isConnected ? 'Connected' : 'Reconnecting…'),
    [isConnected],
  );

  if (!sessionId) return null;

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <Header
        title="Conversation"
        subtitle={headerSubtitle}
        showMenu={false}
        rightAction={
          <Pressable onPress={() => router.back()}>
            <Ionicons name="close" size={24} color={colors.text} />
          </Pressable>
        }
      />

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
          <Text className="text-sm font-medium" style={{ color: '#ffffff' }}>
            Resolve
          </Text>
        </Pressable>
      </View>

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

          <View className="flex-row items-center px-5 py-3 gap-2 border-t" style={{ borderColor: colors.border }}>
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
              <Ionicons name="send" size={18} color="#ffffff" />
            </Pressable>
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
    </View>
  );
}
