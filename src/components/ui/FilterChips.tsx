import { ScrollView, Text, View } from 'react-native';
import { Pressable } from '@/components/ui/Pressable';
import { useTheme } from '@/hooks/useTheme';

export interface FilterChip<T extends string> {
  key: T;
  label: string;
  /** Optional count shown in a small pill next to the label. */
  count?: number;
}

interface FilterChipsProps<T extends string> {
  chips: FilterChip<T>[];
  value: T;
  onChange: (key: T) => void;
  className?: string;
}

/**
 * Single-select chip row (queue tabs). Scrolls horizontally on narrow screens
 * and never wraps, so it keeps a stable height above a list.
 */
export function FilterChips<T extends string>({ chips, value, onChange, className }: FilterChipsProps<T>) {
  const { colors } = useTheme();
  return (
    <View className={className}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8, paddingRight: 8 }}
        keyboardShouldPersistTaps="handled"
      >
        {chips.map((chip) => {
          const active = chip.key === value;
          return (
            <Pressable
              key={chip.key}
              onPress={() => onChange(chip.key)}
              pressScale={0.96}
              haptic="selection"
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              accessibilityLabel={chip.count != null ? `${chip.label}, ${chip.count}` : chip.label}
              className="flex-row items-center px-4 py-2 rounded-full border"
              style={{
                backgroundColor: active ? colors.primary : colors.surface,
                borderColor: active ? colors.primary : colors.border,
              }}
            >
              <Text
                className="text-sm font-semibold"
                style={{ color: active ? colors.onPrimary : colors.text }}
              >
                {chip.label}
              </Text>
              {chip.count != null ? (
                <View
                  className="ml-2 min-w-[20px] h-5 px-1.5 rounded-full items-center justify-center"
                  style={{ backgroundColor: active ? 'rgba(255,255,255,0.25)' : colors.primaryLight }}
                >
                  <Text
                    className="text-[11px] font-bold"
                    style={{ color: active ? colors.onPrimary : colors.primary }}
                  >
                    {chip.count}
                  </Text>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
