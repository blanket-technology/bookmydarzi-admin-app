import { zodResolver } from '@hookform/resolvers/zod';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';
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
import {
  getMutationError,
  useForgotPasswordRequestMutation,
  useForgotPasswordResetMutation,
  useForgotPasswordVerifyMutation,
} from '@/features/auth/hooks/useAuthMutations';
import {
  forgotPasswordSchema,
  type ForgotPasswordFormData,
} from '@/features/auth/schemas/authSchemas';

type Step = 'request' | 'verify' | 'reset';

export default function ForgotPasswordScreen() {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<Step>('request');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const requestMutation = useForgotPasswordRequestMutation();
  const verifyMutation = useForgotPasswordVerifyMutation();
  const resetMutation = useForgotPasswordResetMutation();

  const { control, handleSubmit, formState: { errors } } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const handleRequest = (data: ForgotPasswordFormData) => {
    setEmail(data.email);
    requestMutation.mutate(
      { email: data.email },
      {
        onSuccess: () => setStep('verify'),
        onError: (error) => Alert.alert('Error', getMutationError(error)),
      },
    );
  };

  const handleVerify = () => {
    verifyMutation.mutate(
      { email, otp },
      {
        onSuccess: (data) => {
          setResetToken(data.reset_token);
          setStep('reset');
        },
        onError: (error) => Alert.alert('Error', getMutationError(error)),
      },
    );
  };

  const handleReset = () => {
    resetMutation.mutate(
      { reset_token: resetToken, new_password: newPassword },
      {
        onSuccess: () => Alert.alert('Success', 'Password reset successfully'),
        onError: (error) => Alert.alert('Error', getMutationError(error)),
      },
    );
  };

  return (
    <LinearGradient colors={['#0c6c75', '#1aa3b0', '#2dd4bf']} className="flex-1">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
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

          <View className="px-6 items-center">
            <View className="w-full" style={{ maxWidth: 480 }}>
            <View className="bg-white rounded-[32px] p-6">
              <Text className="text-2xl font-bold text-slate-900 mb-1">
                Forgot Password
              </Text>
              <Text className="text-slate-500 mb-6">
                {step === 'request' && 'Enter your email to receive a reset OTP'}
                {step === 'verify' && 'Enter the OTP sent to your email'}
                {step === 'reset' && 'Create your new password'}
              </Text>

              {step === 'request' ? (
                <>
                  <Controller
                    control={control}
                    name="email"
                    render={({ field: { onChange, onBlur, value } }) => (
                      <Input
                        label="Email"
                        placeholder="admin@bookmydarzi.com"
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                        error={errors.email?.message}
                        keyboardType="email-address"
                        autoCapitalize="none"
                      />
                    )}
                  />
                  <Button
                    title="Send OTP"
                    onPress={handleSubmit(handleRequest)}
                    loading={requestMutation.isPending}
                    fullWidth
                  />
                </>
              ) : null}

              {step === 'verify' ? (
                <>
                  <Input
                    label="OTP"
                    placeholder="6-digit code"
                    value={otp}
                    onChangeText={setOtp}
                    keyboardType="number-pad"
                    maxLength={6}
                  />
                  <Button
                    title="Verify OTP"
                    onPress={handleVerify}
                    loading={verifyMutation.isPending}
                    fullWidth
                  />
                </>
              ) : null}

              {step === 'reset' ? (
                <>
                  <Input
                    label="New Password"
                    placeholder="Enter new password"
                    value={newPassword}
                    onChangeText={setNewPassword}
                    secureTextEntry
                  />
                  <Button
                    title="Reset Password"
                    onPress={handleReset}
                    loading={resetMutation.isPending}
                    fullWidth
                  />
                </>
              ) : null}
            </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}
