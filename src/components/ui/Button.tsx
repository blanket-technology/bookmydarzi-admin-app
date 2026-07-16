import { ActivityIndicator, Pressable, Text, type PressableProps } from 'react-native';
import { useTheme } from '@/hooks/useTheme';

interface ButtonProps extends PressableProps {
  title: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  fullWidth?: boolean;
}

export const Button = ({
  title,
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  disabled,
  className,
  ...props
}: ButtonProps & { className?: string }) => {
  const { colors } = useTheme();

  const sizeClasses = {
    sm: 'px-4 py-2.5',
    md: 'px-6 py-3.5',
    lg: 'px-8 py-4',
  }[size];

  const variantStyles = {
    primary: { bg: colors.primary, text: '#ffffff', border: colors.primary },
    secondary: { bg: colors.primaryLight, text: colors.primary, border: colors.primaryLight },
    outline: { bg: 'transparent', text: colors.primary, border: colors.primary },
    ghost: { bg: 'transparent', text: colors.text, border: 'transparent' },
    danger: { bg: colors.error, text: '#ffffff', border: colors.error },
  }[variant];

  return (
    <Pressable
      disabled={disabled || loading}
      className={`rounded-2xl items-center justify-center flex-row ${sizeClasses} ${fullWidth ? 'w-full' : ''} ${className ?? ''}`}
      style={{
        backgroundColor: variantStyles.bg,
        borderWidth: variant === 'outline' ? 1.5 : 0,
        borderColor: variantStyles.border,
        opacity: disabled || loading ? 0.6 : 1,
      }}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={variantStyles.text} />
      ) : (
        <Text
          className="font-semibold text-base"
          style={{ color: variantStyles.text }}
        >
          {title}
        </Text>
      )}
    </Pressable>
  );
};
