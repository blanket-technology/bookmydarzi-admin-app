import { Text, TextInput, View, type TextInputProps } from 'react-native';
import { useTheme } from '@/hooks/useTheme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  containerClassName?: string;
}

export const Input = ({
  label,
  error,
  containerClassName,
  style,
  ...props
}: InputProps) => {
  const { colors } = useTheme();

  return (
    <View className={`mb-4 ${containerClassName ?? ''}`}>
      {label ? (
        <Text
          className="text-sm font-medium mb-2"
          style={{ color: colors.textSecondary }}
        >
          {label}
        </Text>
      ) : null}
      <TextInput
        placeholderTextColor={colors.textMuted}
        className="rounded-2xl px-4 py-3.5 text-base border"
        style={[
          {
            backgroundColor: colors.surface,
            borderColor: error ? colors.error : colors.border,
            color: colors.text,
          },
          // A caller-supplied style (e.g. a chat composer capping
          // multiline growth with maxHeight) used to silently replace
          // these base styles entirely - a plain object spread after
          // `style` overrides it outright instead of merging, unlike
          // RN's array form here.
          style,
        ]}
        {...props}
      />
      {error ? (
        <Text className="text-xs mt-1.5" style={{ color: colors.error }}>
          {error}
        </Text>
      ) : null}
    </View>
  );
};
