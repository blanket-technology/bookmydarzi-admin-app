import { zodResolver } from '@hookform/resolvers/zod';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Link } from 'expo-router';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeInDown, FadeInUp, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
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
      ? '#f87171'
      : `rgba(255,255,255,${0.18 + focus.value * 0.42})`,
  }));

  return (
    <View className="mb-4">
      <Text className="text-xs font-semibold mb-2 tracking-wide" style={{ color: 'rgba(255,255,255,0.65)' }}>
        {label.toUpperCase()}
      </Text>
      <Animated.View
        style={[
          {
            borderWidth: 1.5,
            borderRadius: 18,
            backgroundColor: 'rgba(255,255,255,0.08)',
          },
          borderStyle,
        ]}
        className="flex-row items-center px-4"
      >
        <Ionicons name={icon} size={19} color="rgba(255,255,255,0.55)" />
        <TextInput
          placeholderTextColor="rgba(255,255,255,0.35)"
          className="flex-1 py-3.5 px-3 text-base"
          style={{ color: '#ffffff' }}
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
        <Text className="text-xs mt-1.5 ml-1" style={{ color: '#fca5a5' }}>
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
        setRememberMe(true);
      }
    });
  }, [setValue]);

  const onSubmit = async (data: LoginFormData) => {
    if (rememberMe) {
      await secureStorage.setItem(STORAGE_KEYS.REMEMBER_EMAIL, data.email);
    } else {
      await secureStorage.removeItem(STORAGE_KEYS.REMEMBER_EMAIL);
    }

    loginMutation.mutate(
      { email: data.email, password: data.password },
      {
        onError: (error) => toast.error(getMutationError(error)),
      },
    );
  };

  return (
    <LinearGradient colors={['#052a2e', '#0c6c75', '#1aa3b0']} className="flex-1">
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
          backgroundColor: 'rgba(201,168,76,0.16)',
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
          backgroundColor: 'rgba(45,212,191,0.14)',
        }}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
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
                    backgroundColor: 'rgba(255,255,255,0.1)',
                    borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.18)',
                  }}
                >
                  <Ionicons name="cut" size={32} color="#C9A84C" />
                </View>
                <Text className="text-white text-[28px] font-bold tracking-tight">
                  BookMyDarzi
                </Text>
                <View className="flex-row items-center mt-2 px-3 py-1 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}>
                  <View className="w-1.5 h-1.5 rounded-full mr-2" style={{ backgroundColor: '#C9A84C' }} />
                  <Text className="text-xs font-semibold tracking-wide" style={{ color: 'rgba(255,255,255,0.75)' }}>
                    OPERATIONS PORTAL
                  </Text>
                </View>
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
                <Text className="text-white text-xl font-bold mb-1">
                  Welcome back
                </Text>
                <Text className="text-sm mb-7" style={{ color: 'rgba(255,255,255,0.55)' }}>
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
                            color="rgba(255,255,255,0.55)"
                          />
                        </Pressable>
                      }
                    />
                  )}
                />

                <View className="flex-row items-center justify-between mb-7 mt-1">
                  <Pressable
                    onPress={() => setRememberMe((prev) => !prev)}
                    className="flex-row items-center"
                    hitSlop={6}
                  >
                    <View
                      className="w-[18px] h-[18px] rounded-[6px] mr-2 items-center justify-center"
                      style={{
                        borderWidth: 1.5,
                        borderColor: rememberMe ? '#C9A84C' : 'rgba(255,255,255,0.35)',
                        backgroundColor: rememberMe ? '#C9A84C' : 'transparent',
                      }}
                    >
                      {rememberMe ? <Ionicons name="checkmark" size={12} color="#052a2e" /> : null}
                    </View>
                    <Text className="text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>
                      Remember me
                    </Text>
                  </Pressable>

                  <Link href="/(auth)/forgot-password" asChild>
                    <Pressable hitSlop={6}>
                      <Text className="text-sm font-semibold" style={{ color: '#C9A84C' }}>
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
                <Ionicons name="shield-checkmark-outline" size={14} color="rgba(255,255,255,0.4)" />
                <Text className="text-xs ml-1.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  Protected by two-factor authentication
                </Text>
              </Animated.View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}
