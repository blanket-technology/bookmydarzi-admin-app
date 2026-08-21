import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Keyboard, Text, View } from 'react-native';
import { BottomSheet, Button, Input, OtpInput, PasswordInput, Pressable } from '@/components/ui';
import {
  useRequestCurrentMobileOtpMutation,
  useRequestMobileChangeMutation,
  useVerifyCurrentMobileOtpMutation,
  useVerifyMobileChangeMutation,
} from '@/features/settings/hooks/useProfile';
import { useTheme } from '@/hooks/useTheme';
import { toast } from '@/store/toastStore';
import { getMutationError } from '@/utils/errors';

interface ChangeMobileSheetProps {
  visible: boolean;
  onClose: () => void;
}

type Step = 'form' | 'verify-current' | 'verify-new';

// Backend requires 4 calls (verify password -> OTP to current mobile ->
// verify it -> OTP to new mobile -> verify it), but that's an internal
// security chain, not something the user needs to see spelled out step by
// step. Collapsed here to 2 user-facing screens: enter details, then enter
// whichever OTP is currently pending - each OTP request auto-chains into
// the next backend call on success.
export const ChangeMobileSheet = ({ visible, onClose }: ChangeMobileSheetProps) => {
  const { colors } = useTheme();
  const [step, setStep] = useState<Step>('form');
  const [newMobile, setNewMobile] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');

  const requestCurrentOtp = useRequestCurrentMobileOtpMutation();
  const verifyCurrentOtp = useVerifyCurrentMobileOtpMutation();
  const requestNewOtp = useRequestMobileChangeMutation();
  const verifyNewOtp = useVerifyMobileChangeMutation();

  const isPending =
    requestCurrentOtp.isPending || verifyCurrentOtp.isPending || requestNewOtp.isPending || verifyNewOtp.isPending;

  const reset = () => {
    setStep('form');
    setNewMobile('');
    setPassword('');
    setOtp('');
    setError('');
  };

  const handleClose = () => {
    onClose();
    reset();
  };

  const handleStart = () => {
    setError('');
    const mobile = newMobile.trim();
    if (!/^[6-9]\d{9}$/.test(mobile)) {
      setError('Enter a valid 10-digit mobile number');
      return;
    }
    if (!password) {
      setError('Enter your current password');
      return;
    }
    requestCurrentOtp.mutate(
      { newMobile: mobile, password },
      {
        onSuccess: (data) => {
          toast.success(data.message);
          Keyboard.dismiss();
          setOtp('');
          setStep('verify-current');
        },
        onError: (err) => setError(getMutationError(err)),
      },
    );
  };

  const handleVerifyCurrent = () => {
    setError('');
    if (otp.length !== 6) {
      setError('Enter the 6-digit code');
      return;
    }
    verifyCurrentOtp.mutate(otp, {
      onSuccess: () => {
        // Current-mobile ownership confirmed - immediately chain into
        // requesting the OTP for the new number so the user only sees one
        // more screen, not a third intermediate step.
        requestNewOtp.mutate(
          { new_mobile: newMobile.trim(), password },
          {
            onSuccess: (data) => {
              toast.success(data.message);
              Keyboard.dismiss();
              setOtp('');
              setStep('verify-new');
            },
            onError: (err) => setError(getMutationError(err)),
          },
        );
      },
      onError: (err) => setError(getMutationError(err)),
    });
  };

  const handleVerifyNew = () => {
    setError('');
    if (otp.length !== 6) {
      setError('Enter the 6-digit code');
      return;
    }
    verifyNewOtp.mutate(
      { new_mobile: newMobile.trim(), otp },
      {
        onSuccess: () => {
          toast.success('Mobile number updated successfully');
          handleClose();
        },
        onError: (err) => setError(getMutationError(err)),
      },
    );
  };

  const titles: Record<Step, string> = {
    form: 'Change Mobile Number',
    'verify-current': 'Verify Current Number',
    'verify-new': 'Verify New Number',
  };

  const clearError = () => {
    if (error) setError('');
  };

  return (
    <BottomSheet visible={visible} onClose={handleClose} title={titles[step]} contentKey={step}>
      {step === 'form' ? (
        <View className="pt-1">
          <View className="items-center mb-5">
            <View
              className="w-14 h-14 rounded-full items-center justify-center mb-3"
              style={{ backgroundColor: colors.primaryLight }}
            >
              <Ionicons name="call-outline" size={26} color={colors.primary} />
            </View>
            <Text className="text-sm text-center" style={{ color: colors.textSecondary }}>
              We'll verify your current number, then confirm the new one with an SMS code.
            </Text>
          </View>

          <Input
            label="New mobile number"
            placeholder="10-digit mobile number"
            value={newMobile}
            onChangeText={(text) => {
              setNewMobile(text.replace(/\D/g, ''));
              clearError();
            }}
            keyboardType="number-pad"
            maxLength={10}
          />
          <PasswordInput
            label="Current password"
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              clearError();
            }}
          />
          {error ? (
            <View className="flex-row items-center mb-3 -mt-1">
              <Ionicons name="alert-circle" size={14} color={colors.error} />
              <Text className="text-xs ml-1.5" style={{ color: colors.error }}>
                {error}
              </Text>
            </View>
          ) : null}
          <Button title="Continue" onPress={handleStart} loading={isPending} fullWidth />
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
            disabled={step === 'verify-new'}
            className="flex-row items-center mb-4 self-start"
            style={{ opacity: step === 'verify-new' ? 0 : 1 }}
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
              {step === 'verify-current'
                ? "Enter the 6-digit code sent to your current number to confirm it's you."
                : 'Enter the 6-digit code sent to'}
            </Text>
            {step === 'verify-new' ? (
              <Text className="text-sm font-semibold text-center mt-0.5" style={{ color: colors.text }}>
                {newMobile}
              </Text>
            ) : null}
          </View>

          <OtpInput
            value={otp}
            onChange={(value) => {
              setOtp(value);
              clearError();
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
          <Button
            title={step === 'verify-current' ? 'Verify' : 'Verify & Update'}
            onPress={step === 'verify-current' ? handleVerifyCurrent : handleVerifyNew}
            loading={isPending}
            fullWidth
          />
        </View>
      )}
    </BottomSheet>
  );
};
