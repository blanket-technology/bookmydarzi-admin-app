import { Ionicons } from '@expo/vector-icons';
import { Modal, Text, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { useTheme } from '@/hooks/useTheme';
import { useSessionStore } from '@/store/sessionStore';

// Full-screen takeover shown once when a refresh-token cycle fails, before
// the app redirects to login (DrawerLayout's own !isAuthenticated Redirect
// fires the moment logout() runs — this modal is what the user sees in the
// instant between "session died" and "back on the login screen").
export const SessionExpired = () => {
  const { colors } = useTheme();
  const expired = useSessionStore((state) => state.expired);
  const clear = useSessionStore((state) => state.clear);

  return (
    <Modal visible={expired} transparent animationType="fade">
      <View className="flex-1 items-center justify-center px-8" style={{ backgroundColor: colors.overlay }}>
        <View
          className="w-full rounded-3xl p-6 items-center"
          style={{ backgroundColor: colors.surface, maxWidth: 380 }}
        >
          <View
            className="w-16 h-16 rounded-full items-center justify-center mb-4"
            style={{ backgroundColor: colors.primaryLight }}
          >
            <Ionicons name="time-outline" size={30} color={colors.primary} />
          </View>
          <Text className="text-lg font-bold text-center" style={{ color: colors.text }}>
            Session Expired
          </Text>
          <Text
            className="text-sm text-center mt-2 leading-5"
            style={{ color: colors.textSecondary }}
          >
            Your session has ended for your security. Please sign in again to continue.
          </Text>
          <View className="mt-6 w-full">
            <Button title="Go to Login" onPress={clear} />
          </View>
        </View>
      </View>
    </Modal>
  );
};
