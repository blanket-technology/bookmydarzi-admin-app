import { Text, View } from 'react-native';
import { Pressable } from '@/components/ui/Pressable';
import type { LoginRole } from '@/constants/roles';
import { LOGIN_ROLES } from '@/constants/roles';

interface RoleSelectorProps {
  value: LoginRole;
  onChange: (role: LoginRole) => void;
  error?: string;
  label?: string;
}

export const RoleSelector = ({
  value,
  onChange,
  error,
  label = 'Login As',
}: RoleSelectorProps) => (
  <View className="mb-4">
    <Text className="text-sm font-medium text-slate-500 mb-2">{label}</Text>
    <View className="flex-row gap-2">
      {LOGIN_ROLES.map((role) => {
        const selected = value === role.value;
        return (
          <Pressable
            key={role.value}
            onPress={() => onChange(role.value)}
            haptic="selection"
            className={`flex-1 py-3 rounded-2xl border items-center ${
              selected
                ? 'bg-primary-50 border-primary-600'
                : 'border-slate-200 bg-white'
            }`}
          >
            <Text
              className={`text-sm font-semibold ${
                selected ? 'text-primary-700' : 'text-slate-600'
              }`}
            >
              {role.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
    {error ? <Text className="text-xs text-red-500 mt-1.5">{error}</Text> : null}
  </View>
);
