import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { Text, View } from 'react-native';
import { Pressable } from '@/components/ui';
import { useTheme } from '@/hooks/useTheme';

interface FieldTaskCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  /** Accent for the icon tile and call-to-action (defaults to the brand colour). */
  accent?: string;
  title: string;
  /** Order code / secondary identifier. */
  eyebrow?: string;
  /** Free-form detail rows (address, items...). */
  children?: ReactNode;
  /** Right-aligned chip, e.g. the cash to collect. */
  badge?: { label: string; tone: 'warning' | 'success' | 'neutral' };
  ctaLabel: string;
  onPress: () => void;
  /** Subdued card for items that are waiting on somebody else. */
  muted?: boolean;
}

/**
 * One actionable row for the field roles' "up next" lists (bridge pickups and
 * deliveries, tailor stitching queue). The whole card opens the order; the
 * trailing button names the action so the next step is never ambiguous.
 */
export const FieldTaskCard = ({
  icon,
  accent,
  title,
  eyebrow,
  children,
  badge,
  ctaLabel,
  onPress,
  muted,
}: FieldTaskCardProps) => {
  const { colors } = useTheme();
  const tint = accent ?? colors.primary;
  const badgeColor =
    badge?.tone === 'warning' ? colors.error : badge?.tone === 'success' ? colors.success : colors.textSecondary;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title}${eyebrow ? `, ${eyebrow}` : ''}. ${ctaLabel}`}
      className="rounded-3xl border p-4 mb-3"
      style={{ backgroundColor: colors.card, borderColor: colors.border, opacity: muted ? 0.85 : 1 }}
    >
      <View className="flex-row items-start">
        <View
          className="w-11 h-11 rounded-2xl items-center justify-center mr-3"
          style={{ backgroundColor: `${tint}22` }}
        >
          <Ionicons name={icon} size={22} color={tint} />
        </View>
        <View className="flex-1">
          <View className="flex-row items-start justify-between">
            <View className="flex-1 pr-2">
              <Text className="font-bold text-base" style={{ color: colors.text }} numberOfLines={1}>
                {title}
              </Text>
              {eyebrow ? (
                <Text className="text-xs mt-0.5" style={{ color: colors.textMuted }} numberOfLines={1}>
                  {eyebrow}
                </Text>
              ) : null}
            </View>
            {muted && !badge ? <Ionicons name="chevron-forward" size={18} color={colors.textMuted} /> : null}
            {badge ? (
              <View className="px-2.5 py-1 rounded-full" style={{ backgroundColor: `${badgeColor}1A` }}>
                <Text className="text-xs font-bold" style={{ color: badgeColor }}>
                  {badge.label}
                </Text>
              </View>
            ) : null}
          </View>
          {children ? <View className="mt-2">{children}</View> : null}
        </View>
      </View>
      {muted ? null : (
        <View
          className="flex-row items-center justify-center mt-3 rounded-2xl py-2.5"
          style={{ backgroundColor: colors.primary }}
        >
          <Text className="text-sm font-bold" style={{ color: colors.onPrimary }}>
            {ctaLabel}
          </Text>
          <Ionicons name="arrow-forward" size={16} color={colors.onPrimary} style={{ marginLeft: 6 }} />
        </View>
      )}
    </Pressable>
  );
};
