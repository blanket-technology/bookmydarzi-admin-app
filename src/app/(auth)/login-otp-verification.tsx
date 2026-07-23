import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import Animated, { FadeInDown, FadeInUp, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { OtpInput } from '@/components/ui';
import {
  getMutationError,
  useLoginVerifyOtpMutation,
  useResendLoginOtpMutation,
} from '@/features/auth/hooks/useAuthMutations';

export default function LoginOtpVerificationScreen() {
  const insets = useSafeAreaInsets();
  const { email, cooldownSeconds } = useLocalSearchParams<{
    email: string;
    cooldownSeconds?: string;
  }>();
  const verifyMutation = useLoginVerifyOtpMutation();
  const resendMutation = useResendLoginOtpMutation();
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState<string | undefined>();
  const [cooldown, setCooldown] = useState(() => Number(cooldownSeconds) || 30);

  const buttonScale = useSharedValue(1);
  const buttonAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  useEffect(() => {
    setOtpError(undefined);
  }, [otp]);

  const onSubmit = () => {
    if (otp.length !== 6) {
      setOtpError('Enter the full 6-digit code');
      return;
    }
    verifyMutation.mutate(
      { email: email ?? '', otp },
      {
        onError: (error) => {
          setOtpError(getMutationError(error));
          Alert.alert('Verification Failed', getMutationError(error));
        },
      },
    );
  };

  const handleResend = () => {
    if (!email || cooldown > 0) return;
    resendMutation.mutate(
      { email },
      {
        onSuccess: (data) => {
          setOtp('');
          setCooldown(data?.cooldown_seconds ?? 30);
          Alert.alert('Code Sent', 'A new verification code has been sent to your email.');
        },
        onError: (error) => Alert.alert('Error', getMutationError(error)),
      },
    );
  };

  const minutes = Math.floor(cooldown / 60);
  const seconds = cooldown % 60;

  return (
    <LinearGradient colors={['#052a2e', '#0c6c75', '#1aa3b0']} className="flex-1">
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: -100,
          left: -90,
          width: 300,
          height: 300,
          borderRadius: 300,
          backgroundColor: 'rgba(45,212,191,0.14)',
        }}
      />
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          bottom: -130,
          right: -80,
          width: 320,
          height: 320,
          borderRadius: 320,
          backgroundColor: 'rgba(201,168,76,0.14)',
        }}
      />

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
          keyboardShouldPersistTaps="handled"
        >
          <Pressable
            onPress={() => router.back()}
            className="px-6 mb-2 flex-row items-center"
            style={{ position: 'absolute', top: insets.top + 12, left: 0 }}
            hitSlop={10}
          >
            <Ionicons name="arrow-back" size={22} color="rgba(255,255,255,0.85)" />
          </Pressable>

          <View className="px-6 items-center">
            <View className="w-full" style={{ maxWidth: 440 }}>
              <Animated.View entering={FadeInDown.duration(500)} className="items-center mb-8" style={{ marginTop: 36 }}>
                <View
                  className="w-[72px] h-[72px] rounded-[24px] items-center justify-center mb-5"
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.1)',
                    borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.18)',
                  }}
                >
                  <Ionicons name="shield-checkmark" size={32} color="#C9A84C" />
                </View>
                <Text className="text-white text-2xl font-bold tracking-tight">
                  Verify it&apos;s you
                </Text>
                <Text className="text-sm mt-2 text-center" style={{ color: 'rgba(255,255,255,0.6)' }}>
                  We sent a 6-digit code to
                </Text>
                <Text className="text-sm font-semibold" style={{ color: '#C9A84C' }}>
                  {email}
                </Text>
              </Animated.View>

              <Animated.View
                entering={FadeInUp.delay(150).duration(500)}
                style={{
                  backgroundColor: 'rgba(255,255,255,0.09)',
                  borderRadius: 28,
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.14)',
                  padding: 24,
                }}
              >
                <Text className="text-xs font-semibold mb-3 tracking-wide text-center" style={{ color: 'rgba(255,255,255,0.55)' }}>
                  ENTER VERIFICATION CODE
                </Text>

                <OtpInput value={otp} onChange={setOtp} error={otpError} />

                <Animated.View style={[buttonAnimStyle, { marginTop: 20 }]}>
                  <Pressable
                    onPressIn={() => (buttonScale.value = withSpring(0.97, { damping: 15 }))}
                    onPressOut={() => (buttonScale.value = withSpring(1, { damping: 12 }))}
                    onPress={onSubmit}
                    disabled={verifyMutation.isPending}
                    style={{ opacity: verifyMutation.isPending ? 0.75 : 1 }}
                  >
                    <LinearGradient
                      colors={['#C9A84C', '#dbc06e']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={{
                        borderRadius: 18,
                        paddingVertical: 15,
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexDirection: 'row',
                      }}
                    >
                      {verifyMutation.isPending ? (
                        <Text className="text-[#052a2e] font-bold text-base">Verifying…</Text>
                      ) : (
                        <>
                          <Text className="text-[#052a2e] font-bold text-base mr-1.5">Verify &amp; Sign In</Text>
                          <Ionicons name="checkmark-circle" size={18} color="#052a2e" />
                        </>
                      )}
                    </LinearGradient>
                  </Pressable>
                </Animated.View>

                <View className="flex-row items-center justify-center mt-5">
                  <Text className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    Didn&apos;t get the code?{' '}
                  </Text>
                  <Pressable onPress={handleResend} disabled={cooldown > 0 || resendMutation.isPending} hitSlop={6}>
                    <Text
                      className="text-sm font-semibold"
                      style={{ color: cooldown > 0 ? 'rgba(255,255,255,0.35)' : '#C9A84C' }}
                    >
                      {cooldown > 0
                        ? `Resend in ${minutes > 0 ? `${minutes}:${seconds.toString().padStart(2, '0')}` : `${seconds}s`}`
                        : 'Resend code'}
                    </Text>
                  </Pressable>
                </View>
              </Animated.View>

              <Animated.View entering={FadeInUp.delay(300).duration(500)} className="flex-row items-center justify-center mt-8">
                <Ionicons name="lock-closed-outline" size={13} color="rgba(255,255,255,0.4)" />
                <Text className="text-xs ml-1.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  This code expires shortly for your security
                </Text>
              </Animated.View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}
