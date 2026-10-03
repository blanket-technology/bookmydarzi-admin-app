import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Linking, Text, View } from 'react-native';
import { Header, Pressable } from '@/components/ui';
import { SUPPORT_PHONE_DISPLAY, SUPPORT_PHONE_NUMBER } from '@/constants/support';
import { useCreateTicketMutation } from '@/features/support/hooks/useSupportTickets';
import { useTheme } from '@/hooks/useTheme';
import { toast } from '@/store/toastStore';

// Replaces the full ticket list/search/filter/category/subject/message form
// for Tailor and Bridge - one button, no typing. Tapping it immediately
// raises a real support ticket behind the scenes (the backend still
// requires subject/message - SupportTicketCreateSchema - so this fills
// those with a fixed, generic "please call me back" text the tailor never
// sees or types themselves) and tells them support will call. Many tailors
// are not comfortable typing out an issue in an app form; a phone call is
// how they're used to getting help.
const AUTO_SUBJECT = 'Callback requested';
const AUTO_MESSAGE = 'I need help - please call me back.';

export function RequestCallbackScreen() {
  const { colors } = useTheme();
  const createMutation = useCreateTicketMutation();
  const [requested, setRequested] = useState(false);

  const handleRequest = () => {
    createMutation.mutate(
      { subject: AUTO_SUBJECT, message: AUTO_MESSAGE, category: 'general' },
      {
        onSuccess: () => {
          setRequested(true);
          toast.success('Request sent. Support will call you soon.');
        },
      },
    );
  };

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <Header title="Support" showMenu={false} />
      <View className="flex-1 items-center justify-center px-8">
        <View
          className="w-24 h-24 rounded-full items-center justify-center mb-6"
          style={{ backgroundColor: requested ? '#dcfce7' : colors.primaryLight }}
        >
          <Ionicons
            name={requested ? 'checkmark-circle' : 'call-outline'}
            size={44}
            color={requested ? '#16a34a' : colors.primary}
          />
        </View>

        {requested ? (
          <>
            <Text className="text-xl font-bold text-center" style={{ color: colors.text }}>
              Request sent
            </Text>
            <Text className="text-sm text-center mt-2" style={{ color: colors.textSecondary }}>
              Our support team will call you shortly.
            </Text>
            <Pressable
              onPress={() => router.back()}
              className="mt-8 px-8 py-4 rounded-2xl border"
              style={{ borderColor: colors.border }}
            >
              <Text className="text-base font-semibold" style={{ color: colors.text }}>
                Done
              </Text>
            </Pressable>
          </>
        ) : (
          <>
            <Text className="text-xl font-bold text-center" style={{ color: colors.text }}>
              Need help?
            </Text>
            <Text className="text-sm text-center mt-2" style={{ color: colors.textSecondary }}>
              Tap the button below. Our support team will call you back.
            </Text>
            <Pressable
              onPress={handleRequest}
              disabled={createMutation.isPending}
              className="mt-8 w-full py-5 rounded-2xl items-center"
              style={{ backgroundColor: colors.primary, opacity: createMutation.isPending ? 0.7 : 1 }}
            >
              <Text className="text-lg font-bold" style={{ color: colors.onPrimary }}>
                {createMutation.isPending ? 'Sending…' : 'Request a Call'}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => Linking.openURL(`tel:${SUPPORT_PHONE_NUMBER}`).catch(() => {})}
              className="mt-4 flex-row items-center px-5 py-3"
            >
              <Ionicons name="call" size={16} color={colors.primary} />
              <Text className="text-sm font-semibold ml-2" style={{ color: colors.primary }}>
                Or call us directly: {SUPPORT_PHONE_DISPLAY}
              </Text>
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
}
