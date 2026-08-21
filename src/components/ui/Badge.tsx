import { Text, View } from 'react-native';

interface BadgeProps {
  label: string;
  color?: string;
  backgroundColor?: string;
}

export const Badge = ({ label, color = '#ffffff', backgroundColor = '#B8923E' }: BadgeProps) => (
  <View
    className="px-2.5 py-1 rounded-full self-start"
    style={{ backgroundColor }}
  >
    <Text className="text-[11px] font-semibold uppercase" style={{ color }}>
      {label}
    </Text>
  </View>
);
