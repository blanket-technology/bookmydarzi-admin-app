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
  View,
} from 'react-native';
import { toast } from '@/store/toastStore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Input, PasswordInput, RoleSelector } from '@/components/ui';
import type { LoginRole } from '@/constants/roles';
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

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const loginMutation = useLoginMutation();
  const [rememberMe, setRememberMe] = useState(false);

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
    defaultValues: { email: '', password: '', role: 'admin' as LoginRole, rememberMe: false },
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
      { email: data.email, password: data.password, role: data.role },
      {
        onError: (error) => toast.error(getMutationError(error)),
      },
    );
  };

  return (
    <LinearGradient
      colors={['#2e1065', '#4c1d95', '#6d28d9']}
      className="flex-1"
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            paddingTop: insets.top + 24,
            paddingBottom: insets.bottom + 24,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="px-6 flex-1 justify-center">
            <View className="items-center mb-10">
              <View className="w-20 h-20 rounded-3xl bg-white/15 items-center justify-center mb-4 border border-white/20">
                <Ionicons name="cut-outline" size={40} color="#fbbf24" />
              </View>
              <Text className="text-white text-3xl font-bold">BookMyDarzi</Text>
              <Text className="text-violet-200 text-base mt-2">Admin Portal</Text>
            </View>

            <View className="bg-white rounded-[32px] p-6 shadow-2xl">
              <Text className="text-2xl font-bold text-slate-900 mb-1">
                Welcome Back
              </Text>
              <Text className="text-slate-500 mb-6">
                Sign in to manage your tailoring business
              </Text>

              <Controller
                control={control}
                name="email"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    label="Email / Username"
                    placeholder="admin@bookmydarzi.com"
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
                  <PasswordInput
                    label="Password"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={errors.password?.message}
                  />
                )}
              />

              <Controller
                control={control}
                name="role"
                render={({ field: { onChange, value } }) => (
                  <RoleSelector
                    value={value}
                    onChange={onChange}
                    error={errors.role?.message}
                  />
                )}
              />

              <View className="flex-row items-center justify-between mb-6 -mt-2">
                <Pressable
                  onPress={() => setRememberMe((prev) => !prev)}
                  className="flex-row items-center"
                >
                  <View
                    className={`w-5 h-5 rounded-md border-2 mr-2 items-center justify-center ${
                      rememberMe ? 'bg-primary-600 border-primary-600' : 'border-slate-300'
                    }`}
                  >
                    {rememberMe ? (
                      <Ionicons name="checkmark" size={14} color="#fff" />
                    ) : null}
                  </View>
                  <Text className="text-slate-600 text-sm">Remember Me</Text>
                </Pressable>

                <Link href="/(auth)/forgot-password" asChild>
                  <Pressable>
                    <Text className="text-primary-600 text-sm font-semibold">
                      Forgot Password?
                    </Text>
                  </Pressable>
                </Link>
              </View>

              <Button
                title="Sign In"
                onPress={handleSubmit(onSubmit)}
                loading={loginMutation.isPending}
                fullWidth
              />

              <View className="flex-row justify-center mt-6">
                <Text className="text-slate-500">Don&apos;t have an account? </Text>
                <Link href="/(auth)/signup" asChild>
                  <Pressable>
                    <Text className="text-primary-600 font-semibold">Sign Up</Text>
                  </Pressable>
                </Link>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}
