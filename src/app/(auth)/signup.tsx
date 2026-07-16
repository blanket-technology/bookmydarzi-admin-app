import { zodResolver } from '@hookform/resolvers/zod';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Link, router } from 'expo-router';
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
import { Button, Input, PasswordInput } from '@/components/ui';
import {
  getMutationError,
  useSignupMutation,
} from '@/features/auth/hooks/useAuthMutations';
import {
  signupSchema,
  type SignupFormData,
} from '@/features/auth/schemas/authSchemas';

const ROLES = [
  { label: 'Admin', value: 'admin' },
  { label: 'Employee', value: 'employee' },
  { label: 'Tailor', value: 'tailor' },
] as const;

export default function SignupScreen() {
  const insets = useSafeAreaInsets();
  const signupMutation = useSignupMutation();

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      fullName: '',
      email: '',
      mobile: '',
      password: '',
      confirmPassword: '',
      role: 'admin',
      termsAccepted: false as unknown as true,
    },
  });

  const selectedRole = watch('role');
  const termsAccepted = watch('termsAccepted');

  const onSubmit = (data: SignupFormData) => {
    const [firstName, ...rest] = data.fullName.trim().split(' ');
    const lastName = rest.join(' ') || firstName;

    signupMutation.mutate(
      {
        first_name: firstName,
        last_name: lastName,
        email: data.email,
        mobile: data.mobile,
        password: data.password,
      },
      {
        onSuccess: () => {
          Alert.alert('Success', 'OTP sent to your email. Please verify to continue.');
        },
        onError: (error) => Alert.alert('Signup Failed', getMutationError(error)),
      },
    );
  };

  return (
    <LinearGradient colors={['#2e1065', '#4c1d95', '#6d28d9']} className="flex-1">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{
            paddingTop: insets.top + 16,
            paddingBottom: insets.bottom + 24,
          }}
          keyboardShouldPersistTaps="handled"
        >
          <Pressable onPress={() => router.back()} className="px-6 mb-4">
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </Pressable>

          <View className="px-6">
            <View className="bg-white rounded-[32px] p-6">
              <Text className="text-2xl font-bold text-slate-900 mb-1">
                Create Account
              </Text>
              <Text className="text-slate-500 mb-6">
                Register as an admin team member
              </Text>

              <Controller
                control={control}
                name="fullName"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    label="Full Name"
                    placeholder="John Doe"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={errors.fullName?.message}
                  />
                )}
              />

              <Controller
                control={control}
                name="email"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    label="Email"
                    placeholder="you@company.com"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={errors.email?.message}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                )}
              />

              <Controller
                control={control}
                name="mobile"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    label="Mobile Number"
                    placeholder="9876543210"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={errors.mobile?.message}
                    keyboardType="phone-pad"
                    maxLength={10}
                  />
                )}
              />

              <Text className="text-sm font-medium text-slate-500 mb-2">Role</Text>
              <View className="flex-row gap-2 mb-4">
                {ROLES.map((role) => (
                  <Pressable
                    key={role.value}
                    onPress={() => setValue('role', role.value)}
                    className={`flex-1 py-3 rounded-2xl border items-center ${
                      selectedRole === role.value
                        ? 'bg-primary-50 border-primary-600'
                        : 'border-slate-200'
                    }`}
                  >
                    <Text
                      className={`text-sm font-semibold ${
                        selectedRole === role.value
                          ? 'text-primary-700'
                          : 'text-slate-600'
                      }`}
                    >
                      {role.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

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
                name="confirmPassword"
                render={({ field: { onChange, onBlur, value } }) => (
                  <PasswordInput
                    label="Confirm Password"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={errors.confirmPassword?.message}
                  />
                )}
              />

              <Pressable
                onPress={() =>
                  setValue('termsAccepted', !termsAccepted as unknown as true)
                }
                className="flex-row items-start mb-6"
              >
                <View
                  className={`w-5 h-5 rounded-md border-2 mr-3 mt-0.5 items-center justify-center ${
                    termsAccepted ? 'bg-primary-600 border-primary-600' : 'border-slate-300'
                  }`}
                >
                  {termsAccepted ? (
                    <Ionicons name="checkmark" size={14} color="#fff" />
                  ) : null}
                </View>
                <Text className="text-slate-600 text-sm flex-1 leading-5">
                  I agree to the Terms of Service and Privacy Policy
                </Text>
              </Pressable>
              {errors.termsAccepted ? (
                <Text className="text-red-500 text-xs -mt-4 mb-4">
                  {errors.termsAccepted.message}
                </Text>
              ) : null}

              <Button
                title="Create Account"
                onPress={handleSubmit(onSubmit)}
                loading={signupMutation.isPending}
                fullWidth
              />

              <View className="flex-row justify-center mt-6">
                <Text className="text-slate-500">Already have an account? </Text>
                <Link href="/(auth)/login" asChild>
                  <Pressable>
                    <Text className="text-primary-600 font-semibold">Sign In</Text>
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
