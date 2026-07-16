import { Image } from 'expo-image';
import { Text, View } from 'react-native';
import { useTheme } from '@/hooks/useTheme';

interface AvatarProps {
  name?: string;
  imageUrl?: string;
  size?: number;
}

export const Avatar = ({ name, imageUrl, size = 44 }: AvatarProps) => {
  const { colors } = useTheme();
  const initials = name
    ?.split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  if (imageUrl) {
    return (
      <Image
        source={{ uri: imageUrl }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
        contentFit="cover"
      />
    );
  }

  return (
    <View
      className="items-center justify-center"
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: colors.primaryLight,
      }}
    >
      <Text className="font-bold" style={{ color: colors.primary, fontSize: size * 0.35 }}>
        {initials || '?'}
      </Text>
    </View>
  );
};
