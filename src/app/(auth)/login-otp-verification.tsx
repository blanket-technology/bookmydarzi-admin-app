import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { OtpInput, Pressable } from '@/components/ui';
import {
  getMutationError,
  useLoginVerifyOtpMutation,
  useResendLoginOtpMutation,
} from '@/features/auth/hooks/useAuthMutations';
import { toast } from '@/store/toastStore';

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
        onError: (error) => setOtpError(getMutationError(error)),
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
          toast.success('A new verification code has been sent to your email.');
        },
        onError: (error) => toast.error(getMutationError(error)),
      },
    );
  };

  const minutes = Math.floor(cooldown / 60);
  const seconds = cooldown % 60;

  return (
    // KeyboardAvoidingView is the OUTERMOST element (not nested inside
    // LinearGradient) - same fix as login.tsx: a flex parent that isn't a
    // plain View can throw off KAV's "padding" measurement on iOS.
    <KeyboardAvoidingView
      // Android already resizes the window for the keyboard via app.json's
      // softwareKeyboardLayoutMode: "resize" - "height" here double-applied
      // on top of that and hid/squished content behind the keyboard.
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
      style={{ flex: 1 }}
    >
      <LinearGradient colors={['#FDFBF7', '#FAF3E4', '#F5E6C0']} style={{ flex: 1 }}>
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: -100,
            left: -90,
            width: 300,
            height: 300,
            borderRadius: 300,
            backgroundColor: 'rgba(184,146,62,0.10)',
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
            backgroundColor: 'rgba(184,146,62,0.14)',
          }}
        />
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            paddingTop: insets.top + 16,
            paddingBottom: insets.bottom + 24,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Pressable
            onPress={() => router.back()}
            style={{
              position: 'absolute',
              top: insets.top + 12,
              left: 0,
              paddingHorizontal: 24,
              marginBottom: 8,
              flexDirection: 'row',
              alignItems: 'center',
            }}
            hitSlop={10}
          >
            <Ionicons name="arrow-back" size={22} color="#7D622A" />
          </Pressable>

          <View style={{ paddingHorizontal: 24, flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <View style={{ width: '100%', maxWidth: 440 }}>
              <View style={{ alignItems: 'center', marginBottom: 32, marginTop: 36 }}>
                <View
                  style={{
                    width: 72,
                    height: 72,
                    borderRadius: 24,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 20,
                    backgroundColor: 'rgba(255,255,255,0.75)',
                    borderWidth: 1,
                    borderColor: 'rgba(184,146,62,0.28)',
                  }}
                >
                  <Ionicons name="shield-checkmark" size={32} color="#B8923E" />
                </View>
                <Text style={{ fontSize: 24, fontWeight: '700', letterSpacing: -0.5, color: '#2C1A0E' }}>
                  Verify it&apos;s you
                </Text>
                <Text style={{ fontSize: 14, marginTop: 8, textAlign: 'center', color: '#8a7561' }}>
                  We sent a 6-digit code to
                </Text>
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#B8923E' }}>
                  {email}
                </Text>
              </View>

              <View
                style={{
                  backgroundColor: 'rgba(255,255,255,0.65)',
                  borderRadius: 28,
                  borderWidth: 1,
                  borderColor: 'rgba(184,146,62,0.2)',
                  padding: 24,
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: '600', marginBottom: 12, letterSpacing: 0.4, textAlign: 'center', color: '#8a7561' }}>
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
                        <Text style={{ color: '#052a2e', fontWeight: '700', fontSize: 16 }}>Verifying…</Text>
                      ) : (
                        <>
                          <Text style={{ color: '#052a2e', fontWeight: '700', fontSize: 16, marginRight: 6 }}>Verify &amp; Sign In</Text>
                          <Ionicons name="checkmark-circle" size={18} color="#052a2e" />
                        </>
                      )}
                    </LinearGradient>
                  </Pressable>
                </Animated.View>

                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 20 }}>
                  <Text style={{ fontSize: 14, color: '#a3927e' }}>
                    Didn&apos;t get the code?{' '}
                  </Text>
                  <Pressable onPress={handleResend} disabled={cooldown > 0 || resendMutation.isPending} hitSlop={6}>
                    <Text
                      style={{ fontSize: 14, fontWeight: '600', color: cooldown > 0 ? '#c3b6a5' : '#B8923E' }}
                    >
                      {cooldown > 0
                        ? `Resend in ${minutes > 0 ? `${minutes}:${seconds.toString().padStart(2, '0')}` : `${seconds}s`}`
                        : 'Resend code'}
                    </Text>
                  </Pressable>
                </View>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 32 }}>
                <Ionicons name="lock-closed-outline" size={13} color="#b3a493" />
                <Text style={{ fontSize: 12, marginLeft: 6, color: '#b3a493' }}>
                  This code expires shortly for your security
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}
