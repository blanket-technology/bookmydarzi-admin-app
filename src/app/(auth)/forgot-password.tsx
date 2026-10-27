import { zodResolver } from '@hookform/resolvers/zod';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Input, Pressable } from '@/components/ui';
import {
  getMutationError,
  useForgotPasswordRequestMutation,
  useForgotPasswordResetMutation,
  useForgotPasswordVerifyMutation,
} from '@/features/auth/hooks/useAuthMutations';
import { newPasswordRule } from '@/features/auth/schemas/authSchemas';
import { toast } from '@/store/toastStore';
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
  const [confirmPassword, setConfirmPassword] = useState('');

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
        onError: (error) => toast.error(getMutationError(error)),
      },
    );
  };

  const handleVerify = () => {
    if (otp.trim().length !== 6 || verifyMutation.isPending) return;
    verifyMutation.mutate(
      { email, otp: otp.trim() },
      {
        onSuccess: (data) => {
          setResetToken(data.reset_token);
          setStep('reset');
        },
        onError: (error) => toast.error(getMutationError(error)),
      },
    );
  };

  const passwordCheck = newPasswordRule.safeParse(newPassword);
  const passwordError =
    newPassword.length > 0 && !passwordCheck.success ? passwordCheck.error.issues[0]?.message : undefined;
  const confirmError =
    confirmPassword.length > 0 && confirmPassword !== newPassword ? 'Passwords do not match' : undefined;

  const handleReset = () => {
    if (resetMutation.isPending || !passwordCheck.success || confirmPassword !== newPassword) return;
    // Success feedback and navigation to Login come from the mutation itself.
    resetMutation.mutate(
      { reset_token: resetToken, new_password: newPassword },
      { onError: (error) => toast.error(getMutationError(error)) },
    );
  };

  // Lets the user recover from an expired/over-attempted code without leaving the screen.
  const handleResend = () => {
    if (requestMutation.isPending) return;
    setOtp('');
    requestMutation.mutate(
      { email },
      {
        onSuccess: () => toast.success('A new code has been sent'),
        onError: (error) => toast.error(getMutationError(error)),
      },
    );
  };

  return (
    <LinearGradient colors={['#FDFBF7', '#FAF3E4', '#F5E6C0']} style={{ flex: 1 }}>
      <KeyboardAvoidingView
        // Android already resizes the window for the keyboard via app.json's
        // softwareKeyboardLayoutMode: "resize" - "height" here double-applied
        // on top of that and hid/squished content behind the keyboard.
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            paddingTop: insets.top + 16,
            paddingBottom: insets.bottom + 24,
            justifyContent: 'center',
          }}
        >
          <Pressable onPress={() => router.back()} hitSlop={8} style={{ paddingHorizontal: 24, marginBottom: 16 }}>
            <Ionicons name="arrow-back" size={24} color="#7D622A" />
          </Pressable>

          <View style={{ paddingHorizontal: 24, alignItems: 'center' }}>
            <View style={{ width: '100%', maxWidth: 480 }}>
            <View style={{ backgroundColor: '#fff', borderRadius: 32, padding: 24 }}>
              <Text style={{ fontSize: 24, fontWeight: '700', color: '#0f172a', marginBottom: 4 }}>
                Forgot Password
              </Text>
              <Text style={{ color: '#64748b', marginBottom: 24 }}>
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
                    onPress={() => void handleSubmit(handleRequest)()}
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
                    disabled={otp.trim().length !== 6}
                    fullWidth
                  />
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 }}>
                    <Pressable onPress={handleResend} accessibilityRole="button" hitSlop={10}>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: '#7D622A' }}>
                        Resend code
                      </Text>
                    </Pressable>
                    <Pressable onPress={() => setStep('request')} accessibilityRole="button" hitSlop={10}>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: '#7D622A' }}>
                        Change email
                      </Text>
                    </Pressable>
                  </View>
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
                    error={passwordError}
                  />
                  <Input
                    label="Confirm Password"
                    placeholder="Re-enter new password"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry
                    error={confirmError}
                  />
                  <Button
                    title="Reset Password"
                    onPress={handleReset}
                    loading={resetMutation.isPending}
                    disabled={!passwordCheck.success || confirmPassword !== newPassword}
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
