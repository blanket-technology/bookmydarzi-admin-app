import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { Pressable } from '@/components/ui/Pressable';
import { useTheme } from '@/hooks/useTheme';

interface PasswordInputProps {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  error?: string;
  onBlur?: () => void;
}

export const PasswordInput = ({
  label,
  value,
  onChangeText,
  placeholder = 'Enter password',
  error,
  onBlur,
}: PasswordInputProps) => {
  const [visible, setVisible] = useState(false);
  const { colors } = useTheme();

  return (
    <View className="mb-4">
      {label ? (
        <Text
          className="text-sm font-medium mb-2"
          style={{ color: colors.textSecondary }}
        >
          {label}
        </Text>
      ) : null}
      <View className="relative">
        <TextInput
          value={value}
          onChangeText={onChangeText}
          onBlur={onBlur}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          secureTextEntry={!visible}
          autoCapitalize="none"
          className="rounded-2xl px-4 py-3.5 pr-12 text-base border"
          style={{
            backgroundColor: colors.surface,
            borderColor: error ? colors.error : colors.border,
            color: colors.text,
          }}
        />
        <Pressable
          onPress={() => setVisible((prev) => !prev)}
          pressScale={0.85}
          haptic="none"
          className="absolute right-4 top-3.5"
          hitSlop={8}
        >
          <Ionicons
            name={visible ? 'eye-off-outline' : 'eye-outline'}
            size={22}
            color={colors.textMuted}
          />
        </Pressable>
      </View>
      {error ? (
        <Text className="text-xs mt-1.5" style={{ color: colors.error }}>
          {error}
        </Text>
      ) : null}
    </View>
  );
};
