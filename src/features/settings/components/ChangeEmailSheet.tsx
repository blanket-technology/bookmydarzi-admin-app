import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Keyboard, Text, View } from 'react-native';
import { BottomSheet, Button, Input, OtpInput, PasswordInput, Pressable } from '@/components/ui';
import {
  useRequestEmailChangeMutation,
  useVerifyEmailChangeMutation,
} from '@/features/settings/hooks/useProfile';
import { useTheme } from '@/hooks/useTheme';
import { toast } from '@/store/toastStore';
import { getMutationError } from '@/utils/errors';

interface ChangeEmailSheetProps {
  visible: boolean;
  onClose: () => void;
  hasExistingEmail: boolean;
}

type Step = 'form' | 'otp';

// Backend is a 2-step flow (request OTP to the new email, then verify) -
// simple enough to keep both steps in one sheet without a wizard shell.
export const ChangeEmailSheet = ({ visible, onClose, hasExistingEmail }: ChangeEmailSheetProps) => {
  const { colors } = useTheme();
  const [step, setStep] = useState<Step>('form');
  const [newEmail, setNewEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');

  const requestMutation = useRequestEmailChangeMutation();
  const verifyMutation = useVerifyEmailChangeMutation();

  const reset = () => {
    setStep('form');
    setNewEmail('');
    setPassword('');
    setOtp('');
    setError('');
  };

  const handleClose = () => {
    onClose();
    reset();
  };

  const handleRequestOtp = () => {
    setError('');
    if (!/^\S+@\S+\.\S+$/.test(newEmail.trim())) {
      setError('Enter a valid email address');
      return;
    }
    if (hasExistingEmail && !password) {
      setError('Enter your current password');
      return;
    }
    requestMutation.mutate(
      { new_email: newEmail.trim(), password: hasExistingEmail ? password : undefined },
      {
        onSuccess: (data) => {
          toast.success(data.message);
          Keyboard.dismiss();
          setOtp('');
          setStep('otp');
        },
        onError: (err) => setError(getMutationError(err)),
      },
    );
  };

  const handleVerify = () => {
    setError('');
    if (otp.length !== 6) {
      setError('Enter the 6-digit code');
      return;
    }
    verifyMutation.mutate(
      { new_email: newEmail.trim(), otp },
      {
        onSuccess: () => {
          toast.success('Email updated successfully');
          handleClose();
        },
        onError: (err) => setError(getMutationError(err)),
      },
    );
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={handleClose}
      title={step === 'form' ? 'Change Email' : 'Verify Email'}
      contentKey={step}
    >
      {step === 'form' ? (
        <View className="pt-1">
          <View className="items-center mb-5">
            <View
              className="w-14 h-14 rounded-full items-center justify-center mb-3"
              style={{ backgroundColor: colors.primaryLight }}
            >
              <Ionicons name="mail-outline" size={26} color={colors.primary} />
            </View>
            <Text className="text-sm text-center" style={{ color: colors.textSecondary }}>
              We'll send a 6-digit code to your new email to confirm it's yours.
            </Text>
          </View>

          <Input
            label="New email address"
            placeholder="you@example.com"
            value={newEmail}
            onChangeText={(text) => {
              setNewEmail(text);
              if (error) setError('');
            }}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
          />
          {hasExistingEmail ? (
            <PasswordInput
              label="Current password"
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                if (error) setError('');
              }}
            />
          ) : null}
          {error ? (
            <View className="flex-row items-center mb-3 -mt-1">
              <Ionicons name="alert-circle" size={14} color={colors.error} />
              <Text className="text-xs ml-1.5" style={{ color: colors.error }}>
                {error}
              </Text>
            </View>
          ) : null}
          <Button
            title="Send Verification Code"
            onPress={handleRequestOtp}
            loading={requestMutation.isPending}
            fullWidth
          />
        </View>
      ) : (
        <View className="pt-1">
          <Pressable
            onPress={() => {
              Keyboard.dismiss();
              setError('');
              setOtp('');
              setStep('form');
            }}
            className="flex-row items-center mb-4 self-start"
            hitSlop={8}
          >
            <Ionicons name="chevron-back" size={18} color={colors.textSecondary} />
            <Text className="text-sm ml-0.5" style={{ color: colors.textSecondary }}>
              Back
            </Text>
          </Pressable>

          <View className="items-center mb-5">
            <View
              className="w-14 h-14 rounded-full items-center justify-center mb-3"
              style={{ backgroundColor: colors.primaryLight }}
            >
              <Ionicons name="shield-checkmark-outline" size={26} color={colors.primary} />
            </View>
            <Text className="text-sm text-center" style={{ color: colors.textSecondary }}>
              Enter the 6-digit code sent to
            </Text>
            <Text className="text-sm font-semibold text-center mt-0.5" style={{ color: colors.text }}>
              {newEmail}
            </Text>
          </View>

          <OtpInput
            value={otp}
            onChange={(value) => {
              setOtp(value);
              if (error) setError('');
            }}
          />
          {error ? (
            <View className="flex-row items-center mb-3 mt-2">
              <Ionicons name="alert-circle" size={14} color={colors.error} />
              <Text className="text-xs ml-1.5" style={{ color: colors.error }}>
                {error}
              </Text>
            </View>
          ) : (
            <View className="mb-3" />
          )}
          <Button title="Verify & Update" onPress={handleVerify} loading={verifyMutation.isPending} fullWidth />
          <Button
            title="Resend code"
            variant="ghost"
            onPress={handleRequestOtp}
            loading={requestMutation.isPending}
            fullWidth
            className="mt-1"
          />
        </View>
      )}
    </BottomSheet>
  );
};
