import { zodResolver } from '@hookform/resolvers/zod';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Link } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
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
    <View className="mb-4">
      <Text className="text-xs font-semibold mb-2 tracking-wide" style={{ color: '#8a7561' }}>
        {label.toUpperCase()}
      </Text>
      <Animated.View
        style={[
          {
            borderWidth: 1.5,
            borderRadius: 18,
            backgroundColor: 'rgba(255,255,255,0.7)',
          },
          borderStyle,
        ]}
        className="flex-row items-center px-4"
      >
        <Ionicons name={icon} size={19} color="#9c8874" />
        <TextInput
          placeholderTextColor="#b3a493"
          className="flex-1 py-3.5 px-3 text-base"
          // minWidth 0 lets the flex-1 input shrink so the trailing eye icon stays inside the field on web.
          style={{ color: '#2C1A0E', minWidth: 0 }}
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
        <Text className="text-xs mt-1.5 ml-1" style={{ color: '#dc2626' }}>
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
    <LinearGradient colors={['#FDFBF7', '#FAF3E4', '#F5E6C0']} className="flex-1">
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

      <KeyboardAvoidingView
        // Android already resizes the window for the keyboard via app.json's
        // softwareKeyboardLayoutMode: "resize" - "height" here double-applied
        // on top of that and hid/squished content behind the keyboard.
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            paddingTop: insets.top + 32,
            paddingBottom: insets.bottom + 24,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="px-6 flex-1 justify-center items-center">
            <View className="w-full" style={{ maxWidth: 440 }}>
              <Animated.View entering={FadeInDown.duration(500)} className="items-center mb-9">
                <View
                  className="w-[72px] h-[72px] rounded-[24px] items-center justify-center mb-5"
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.75)',
                    borderWidth: 1,
                    borderColor: 'rgba(184,146,62,0.28)',
                  }}
                >
                  <Ionicons name="cut" size={32} color="#B8923E" />
                </View>
                <Text className="text-[28px] font-bold tracking-tight" style={{ color: '#2C1A0E' }}>
                  BookMyDarzi
                </Text>
                <View className="flex-row items-center mt-2 px-3 py-1 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.6)' }}>
                  <View className="w-1.5 h-1.5 rounded-full mr-2" style={{ backgroundColor: '#B8923E' }} />
                  <Text className="text-xs font-semibold tracking-wide" style={{ color: '#7D622A' }}>
                    OPERATIONS PORTAL
                  </Text>
                </View>
              </Animated.View>

              <Animated.View
                entering={FadeInUp.delay(150).duration(500)}
                style={{
                  backgroundColor: 'rgba(255,255,255,0.65)',
                  borderRadius: 28,
                  borderWidth: 1,
                  borderColor: 'rgba(184,146,62,0.2)',
                  padding: 24,
                }}
              >
                <Text className="text-xl font-bold mb-1" style={{ color: '#2C1A0E' }}>
                  Welcome back
                </Text>
                <Text className="text-sm mb-7" style={{ color: '#8a7561' }}>
                  Sign in with your staff account credentials
                </Text>

                <Controller
                  control={control}
                  name="email"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <GlassField
                      icon="mail-outline"
                      label="Email"
                      placeholder="you@bookmydarzi.com"
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

                <View className="flex-row items-center justify-between mb-7 mt-1">
                  <Pressable
                    onPress={toggleRememberMe}
                    className="flex-row items-center"
                    hitSlop={6}
                  >
                    <View
                      className="w-[18px] h-[18px] rounded-[6px] mr-2 items-center justify-center"
                      style={{
                        borderWidth: 1.5,
                        borderColor: rememberMe ? '#B8923E' : '#d4c3ae',
                        backgroundColor: rememberMe ? '#B8923E' : 'transparent',
                      }}
                    >
                      {rememberMe ? <Ionicons name="checkmark" size={12} color="#2C1A0E" /> : null}
                    </View>
                    <Text className="text-sm" style={{ color: '#8a7561' }}>
                      Remember me
                    </Text>
                  </Pressable>

                  <Link href="/(auth)/forgot-password" asChild>
                    <Pressable hitSlop={6}>
                      <Text className="text-sm font-semibold" style={{ color: '#B8923E' }}>
                        Forgot password?
                      </Text>
                    </Pressable>
                  </Link>
                </View>

                <Animated.View style={buttonAnimStyle}>
                  <Pressable
                    onPressIn={() => (buttonScale.value = withSpring(0.97, { damping: 15 }))}
                    onPressOut={() => (buttonScale.value = withSpring(1, { damping: 12 }))}
                    onPress={handleSubmit(onSubmit)}
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
                        <Text className="text-[#052a2e] font-bold text-base">Signing in…</Text>
                      ) : (
                        <>
                          <Text className="text-[#052a2e] font-bold text-base mr-1.5">Sign In</Text>
                          <Ionicons name="arrow-forward" size={18} color="#052a2e" />
                        </>
                      )}
                    </LinearGradient>
                  </Pressable>
                </Animated.View>
              </Animated.View>

              <Animated.View entering={FadeInUp.delay(300).duration(500)} className="flex-row items-center justify-center mt-8">
                <Ionicons name="shield-checkmark-outline" size={14} color="#b3a493" />
                <Text className="text-xs ml-1.5" style={{ color: '#b3a493' }}>
                  Secured by BookMyDarzi authentication system.
                </Text>
              </Animated.View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}
