import { zodResolver } from '@hookform/resolvers/zod';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Link } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { Pressable } from '@/components/ui/Pressable';
import { toast } from '@/store/toastStore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { STORAGE_KEYS } from '@/constants/storage';
import {
  getMutationError,
  useLoginMutation,
} from '@/features/auth/hooks/useAuthMutations';
import {
  loginSchema,
  type LoginFormData,
} from '@/features/auth/schemas/authSchemas';
import { secureStorage } from '@/utils/secureStorage';

/** Frosted-glass field: icon + label-on-focus treatment, built inline since
 * the shared Input/PasswordInput primitives don't support a leading icon. */
function GlassField({
  icon,
  label,
  error,
  rightElement,
  ...inputProps
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  error?: string;
  rightElement?: React.ReactNode;
} & React.ComponentProps<typeof TextInput>) {
  const focus = useSharedValue(0);
  const borderStyle = useAnimatedStyle(() => ({
    borderColor: error
      ? '#dc2626'
      : `rgba(184,146,62,${0.25 + focus.value * 0.55})`,
  }));

  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={{ fontSize: 12, fontWeight: '600', marginBottom: 8, letterSpacing: 0.4, color: '#8a7561' }}>
        {label.toUpperCase()}
      </Text>
      <Animated.View
        style={[
          {
            borderWidth: 1.5,
            borderRadius: 18,
            backgroundColor: 'rgba(255,255,255,0.7)',
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 16,
          },
          borderStyle,
        ]}
      >
        <Ionicons name={icon} size={19} color="#9c8874" />
        <TextInput
          placeholderTextColor="#b3a493"
          // minWidth 0 lets the flex-1 input shrink so the trailing eye icon stays inside the field on web.
          style={{ flex: 1, paddingVertical: 14, paddingHorizontal: 12, fontSize: 16, color: '#2C1A0E', minWidth: 0 }}
          {...inputProps}
          onFocus={(e) => {
            focus.value = withTiming(1, { duration: 180 });
            inputProps.onFocus?.(e);
          }}
          onBlur={(e) => {
            focus.value = withTiming(0, { duration: 180 });
            inputProps.onBlur?.(e);
          }}
        />
        {rightElement}
      </Animated.View>
      {error ? (
        <Text style={{ fontSize: 12, marginTop: 6, marginLeft: 4, color: '#dc2626' }}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const loginMutation = useLoginMutation();
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const buttonScale = useSharedValue(1);
  const buttonAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  useEffect(() => {
    if (__DEV__) {
      console.log('[LoginScreen] mounted');
    }
  }, []);

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '', rememberMe: false },
  });

  useEffect(() => {
    secureStorage.getItem(STORAGE_KEYS.REMEMBER_EMAIL).then((email) => {
      if (email) {
        setValue('email', email);
        setValue('rememberMe', true);
        setRememberMe(true);
      }
    });
  }, [setValue]);

  const toggleRememberMe = () => {
    setRememberMe((prev) => {
      const next = !prev;
      // Keep the RHF field in sync with the local checkbox state - they were
      // previously disconnected (defaultValues.rememberMe never updated), so
      // the form's value never reflected the checkbox.
      setValue('rememberMe', next);
      return next;
    });
  };

  const submittingRef = useRef(false);

  const onSubmit = async (data: LoginFormData) => {
    // Two quick taps used to send two login requests (two OTP emails, burning the
    // 5/min limit): the button only disabled once the mutation had started.
    if (submittingRef.current || loginMutation.isPending) return;
    submittingRef.current = true;
    try {
      // Persist the choice so app boot knows whether to keep the session.
      // Checked: remember email + keep session across restarts.
      // Unchecked: single session - cleared on next launch (authContext).
      await secureStorage.setItem(STORAGE_KEYS.REMEMBER_ME, rememberMe ? 'true' : 'false');
      if (rememberMe) {
        await secureStorage.setItem(STORAGE_KEYS.REMEMBER_EMAIL, data.email);
      } else {
        await secureStorage.removeItem(STORAGE_KEYS.REMEMBER_EMAIL);
      }
    } catch {
      // A storage hiccup must never block signing in.
    }

    loginMutation.mutate(
      { email: data.email, password: data.password },
      {
        onError: (error) => toast.error(getMutationError(error)),
        onSettled: () => {
          submittingRef.current = false;
        },
      },
    );
  };

  return (
    // KeyboardAvoidingView is the OUTERMOST element (not nested inside
    // LinearGradient) - a flex parent that isn't a plain View (e.g.
    // LinearGradient's own layout host) can throw off KAV's measurement of
    // how much to shift content on iOS, which is exactly what was reported:
    // "padding" behavior silently not pushing content above the keyboard.
    // This is the standard, most battle-tested nesting order.
    <KeyboardAvoidingView
      // Android already resizes the window for the keyboard via app.json's
      // softwareKeyboardLayoutMode: "resize" - "height" here double-applied
      // on top of that and hid/squished content behind the keyboard.
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1 }}
    >
      <LinearGradient colors={['#FDFBF7', '#FAF3E4', '#F5E6C0']} style={{ flex: 1 }}>
        {/* Ambient glow shapes — depth without a blur dependency */}
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: -120,
            right: -80,
            width: 320,
            height: 320,
            borderRadius: 320,
            backgroundColor: 'rgba(184,146,62,0.14)',
          }}
        />
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            bottom: -140,
            left: -100,
            width: 360,
            height: 360,
            borderRadius: 360,
            backgroundColor: 'rgba(184,146,62,0.10)',
          }}
        />

        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            paddingTop: insets.top + 32,
            paddingBottom: insets.bottom + 24,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={{ paddingHorizontal: 24, flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <View style={{ width: '100%', maxWidth: 440 }}>
              <View style={{ alignItems: 'center', marginBottom: 36 }}>
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
                  <Ionicons name="cut" size={32} color="#B8923E" />
                </View>
                <Text style={{ fontSize: 28, fontWeight: '700', letterSpacing: -0.5, color: '#2C1A0E' }}>
                  BookMyDarzi
                </Text>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    marginTop: 8,
                    paddingHorizontal: 12,
                    paddingVertical: 4,
                    borderRadius: 999,
                    backgroundColor: 'rgba(255,255,255,0.6)',
                  }}
                >
                  <View style={{ width: 6, height: 6, borderRadius: 3, marginRight: 8, backgroundColor: '#B8923E' }} />
                  <Text style={{ fontSize: 12, fontWeight: '600', letterSpacing: 0.4, color: '#7D622A' }}>
                    OPERATIONS PORTAL
                  </Text>
                </View>
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
                <Text style={{ fontSize: 20, fontWeight: '700', marginBottom: 4, color: '#2C1A0E' }}>
                  Welcome back
                </Text>
                <Text style={{ fontSize: 14, marginBottom: 28, color: '#8a7561' }}>
                  Sign in with your staff account credentials
                </Text>

                <Controller
                  control={control}
                  name="email"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <GlassField
                      icon="mail-outline"
                      label="Email"
                      placeholder="Enter your email"
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      error={errors.email?.message}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoComplete="email"
                    />
                  )}
                />

                <Controller
                  control={control}
                  name="password"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <GlassField
                      icon="lock-closed-outline"
                      label="Password"
                      placeholder="••••••••"
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      error={errors.password?.message}
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                      rightElement={
                        <Pressable onPress={() => setShowPassword((v) => !v)} hitSlop={10}>
                          <Ionicons
                            name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                            size={19}
                            color="#9c8874"
                          />
                        </Pressable>
                      }
                    />
                  )}
                />

                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, marginTop: 4 }}>
                  <Pressable
                    onPress={toggleRememberMe}
                    style={{ flexDirection: 'row', alignItems: 'center' }}
                    hitSlop={6}
                  >
                    <View
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: 6,
                        marginRight: 8,
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderWidth: 1.5,
                        borderColor: rememberMe ? '#B8923E' : '#d4c3ae',
                        backgroundColor: rememberMe ? '#B8923E' : 'transparent',
                      }}
                    >
                      {rememberMe ? <Ionicons name="checkmark" size={12} color="#2C1A0E" /> : null}
                    </View>
                    <Text style={{ fontSize: 14, color: '#8a7561' }}>
                      Remember me
                    </Text>
                  </Pressable>

                  <Link href="/(auth)/forgot-password" asChild>
                    <Pressable hitSlop={6}>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: '#B8923E' }}>
                        Forgot password?
                      </Text>
                    </Pressable>
                  </Link>
                </View>

                <Animated.View style={buttonAnimStyle}>
                  <Pressable
                    onPressIn={() => (buttonScale.value = withSpring(0.97, { damping: 15 }))}
                    onPressOut={() => (buttonScale.value = withSpring(1, { damping: 12 }))}
                    onPress={() => void handleSubmit(onSubmit)()}
                    disabled={loginMutation.isPending}
                    style={{ opacity: loginMutation.isPending ? 0.75 : 1 }}
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
                      {loginMutation.isPending ? (
                        <Text style={{ color: '#052a2e', fontWeight: '700', fontSize: 16 }}>Signing in…</Text>
                      ) : (
                        <>
                          <Text style={{ color: '#052a2e', fontWeight: '700', fontSize: 16, marginRight: 6 }}>Sign In</Text>
                          <Ionicons name="arrow-forward" size={18} color="#052a2e" />
                        </>
                      )}
                    </LinearGradient>
                  </Pressable>
                </Animated.View>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 32 }}>
                <Ionicons name="shield-checkmark-outline" size={14} color="#b3a493" />
                <Text style={{ fontSize: 12, marginLeft: 6, color: '#b3a493' }}>
                  Secured by BookMyDarzi authentication system.
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}
