import { zodResolver } from '@hookform/resolvers/zod';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Input } from '@/components/ui';
import { authService } from '@/services/authService';
import {
  getMutationError,
  useVerifyOtpMutation,
} from '@/features/auth/hooks/useAuthMutations';
import { otpSchema, type OtpFormData } from '@/features/auth/schemas/authSchemas';

export default function OtpVerificationScreen() {
  const insets = useSafeAreaInsets();
  const { email } = useLocalSearchParams<{ email: string }>();
  const verifyMutation = useVerifyOtpMutation();

  const { control, handleSubmit, formState: { errors } } = useForm<OtpFormData>({
    resolver: zodResolver(otpSchema),
    defaultValues: { email: email ?? '', otp: '' },
  });

  const onSubmit = (data: OtpFormData) => {
    verifyMutation.mutate(data, {
      onError: (error) => Alert.alert('Verification Failed', getMutationError(error)),
    });
  };

  const handleResend = async () => {
    if (!email) return;
    try {
      await authService.resendEmailOtp({ email });
      Alert.alert('Success', 'OTP resent to your email');
    } catch (error) {
      Alert.alert('Error', getMutationError(error));
    }
  };

  return (
    <LinearGradient colors={['#2e1065', '#4c1d95', '#6d28d9']} className="flex-1">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            paddingTop: insets.top + 16,
            paddingBottom: insets.bottom + 24,
            justifyContent: 'center',
          }}
        >
          <Pressable onPress={() => router.back()} className="px-6 mb-4">
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </Pressable>

          <View className="px-6">
            <View className="bg-white rounded-[32px] p-6">
              <Text className="text-2xl font-bold text-slate-900 mb-1">
                Verify Email
              </Text>
              <Text className="text-slate-500 mb-6">
                Enter the 6-digit OTP sent to {email}
              </Text>

              <Controller
                control={control}
                name="otp"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    label="OTP Code"
                    placeholder="000000"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={errors.otp?.message}
                    keyboardType="number-pad"
                    maxLength={6}
                  />
                )}
              />

              <Button
                title="Verify & Continue"
                onPress={handleSubmit(onSubmit)}
                loading={verifyMutation.isPending}
                fullWidth
              />

              <Pressable onPress={handleResend} className="mt-4 items-center">
                <Text className="text-primary-600 font-semibold">Resend OTP</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}
