import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Badge, BottomSheet, Button, ConfirmModal, EmptyState, Header, Input, Loader, Pressable } from '@/components/ui';
import { useCreateFaqMutation, useDeleteFaqMutation, useFaqs, useUpdateFaqMutation } from '@/features/faqs/hooks/useFaqs';
import { useTheme } from '@/hooks/useTheme';
import { useResponsive } from '@/hooks/useResponsive';
import type { FaqItem } from '@/types/faqs';
import { formatApiErrorDetail } from '@/utils/errors';

const CATEGORIES = ['general', 'order', 'payment', 'delivery', 'account'] as const;
const EMPTY_FORM = { question: '', answer: '', category: 'general' as string, sort_order: '0' };

export default function FaqsScreen() {
  const { colors } = useTheme();
  const { contentMaxWidth } = useResponsive();
  const { data, isLoading, isError, error, refetch } = useFaqs();
  const createMutation = useCreateFaqMutation();
  const updateMutation = useUpdateFaqMutation();
  const deleteMutation = useDeleteFaqMutation();

  const [sheetVisible, setSheetVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<FaqItem | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<FaqItem | null>(null);

  const faqs = data ?? [];

  const openNew = () => {
    setEditingItem(null);
    setForm(EMPTY_FORM);
    setSheetVisible(true);
  };

  const openEdit = (item: FaqItem) => {
    setEditingItem(item);
    setForm({
      question: item.question,
      answer: item.answer,
      category: item.category,
      sort_order: String(item.sort_order),
    });
    setSheetVisible(true);
  };

  const handleSave = () => {
    if (!form.question.trim() || !form.answer.trim()) return;
    const payload = {
      question: form.question.trim(),
      answer: form.answer.trim(),
      category: form.category,
      sort_order: Number(form.sort_order) || 0,
    };
    if (editingItem) {
      updateMutation.mutate(
        { id: editingItem.id, payload },
        { onSuccess: () => setSheetVisible(false) },
      );
    } else {
      createMutation.mutate(payload, { onSuccess: () => setSheetVisible(false) });
    }
  };

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <Header
        title="FAQs"
        subtitle={`${faqs.length} questions`}
        rightAction={
          <Pressable
            onPress={openNew}
            className="w-10 h-10 rounded-xl items-center justify-center"
            style={{ backgroundColor: colors.primary }}
          >
            <Text className="text-xl font-bold" style={{ color: colors.onPrimary }}>+</Text>
          </Pressable>
        }
      />
      <View className="px-5 flex-1 w-full self-center" style={{ maxWidth: contentMaxWidth }}>
        {isLoading ? (
          <Loader message="Loading FAQs..." />
        ) : isError ? (
          <EmptyState title="Failed to load FAQs" description={formatApiErrorDetail(error)} actionLabel="Retry" onAction={() => refetch()} />
        ) : faqs.length === 0 ? (
          <EmptyState icon="help-buoy-outline" title="No FAQs yet" />
        ) : (
          <ScrollView showsVerticalScrollIndicator={false}>
            {faqs.map((item) => (
              <Pressable
                key={item.id}
                onPress={() => openEdit(item)}
                className="rounded-2xl p-4 mb-3 border"
                style={{ backgroundColor: colors.card, borderColor: colors.border }}
              >
                <View className="flex-row items-start justify-between mb-1">
                  <Text className="font-bold text-sm flex-1 mr-2" style={{ color: colors.text }}>
                    {item.question}
                  </Text>
                  <Badge label={item.category} backgroundColor={colors.primaryLight} color={colors.primary} />
                </View>
                <Text className="text-xs mt-1" style={{ color: colors.textSecondary }} numberOfLines={2}>
                  {item.answer}
                </Text>
              </Pressable>
            ))}
            <View className="mb-6" />
          </ScrollView>
        )}
      </View>

      <BottomSheet
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
        title={editingItem ? 'Edit FAQ' : 'New FAQ'}
      >
        <Input label="Question" value={form.question} onChangeText={(t) => setForm((f) => ({ ...f, question: t }))} multiline />
        <Input label="Answer" value={form.answer} onChangeText={(t) => setForm((f) => ({ ...f, answer: t }))} multiline numberOfLines={4} />

        <Text className="text-sm font-medium mb-2" style={{ color: colors.textSecondary }}>
          Category
        </Text>
        <View className="flex-row flex-wrap mb-4" style={{ gap: 8 }}>
          {CATEGORIES.map((cat) => (
            <Pressable
              key={cat}
              onPress={() => setForm((f) => ({ ...f, category: cat }))}
              className="px-3 py-1.5 rounded-lg border"
              style={{
                borderColor: form.category === cat ? colors.primary : colors.border,
                backgroundColor: form.category === cat ? colors.primaryLight : 'transparent',
              }}
            >
              <Text
                className="text-xs font-semibold capitalize"
                style={{ color: form.category === cat ? colors.primary : colors.textSecondary }}
              >
                {cat}
              </Text>
            </Pressable>
          ))}
        </View>

        <Input
          label="Sort order"
          value={form.sort_order}
          onChangeText={(t) => setForm((f) => ({ ...f, sort_order: t }))}
          keyboardType="number-pad"
        />

        {editingItem ? (
          <Pressable onPress={() => setDeleteTarget(editingItem)} className="items-center mb-3">
            <Text className="text-sm font-semibold" style={{ color: colors.error }}>
              Delete FAQ
            </Text>
          </Pressable>
        ) : null}
        <Button
          title={editingItem ? 'Save Changes' : 'Create FAQ'}
          onPress={handleSave}
          loading={createMutation.isPending || updateMutation.isPending}
          disabled={!form.question.trim() || !form.answer.trim()}
          fullWidth
        />
      </BottomSheet>

      <ConfirmModal
        visible={!!deleteTarget}
        title="Delete FAQ"
        message="Permanently remove this FAQ? This cannot be undone."
        confirmLabel="Delete"
        loading={deleteMutation.isPending}
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
          setDeleteTarget(null);
          setSheetVisible(false);
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </View>
  );
}
