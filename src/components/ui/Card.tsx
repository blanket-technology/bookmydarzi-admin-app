import { type ReactNode } from 'react';
import { View, type ViewProps } from 'react-native';
import { useTheme } from '@/hooks/useTheme';

interface CardProps extends ViewProps {
  children: ReactNode;
  className?: string;
}

export const Card = ({ children, className, style, ...props }: CardProps) => {
  const { colors } = useTheme();

  return (
    <View
      className={`rounded-3xl p-4 ${className ?? ''}`}
      style={[
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderWidth: 1,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.06,
          shadowRadius: 8,
          elevation: 2,
        },
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
};
