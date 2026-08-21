import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Text, View } from 'react-native';
import { Pressable } from '@/components/ui/Pressable';
import { useTheme } from '@/hooks/useTheme';

interface DateFieldProps {
  label?: string;
  value: string | null;
  onChange: (isoDate: string) => void;
  placeholder?: string;
  minimumDate?: Date;
  maximumDate?: Date;
  error?: string;
}

const toIsoDate = (d: Date) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatDisplay = (isoDate: string) => {
  const d = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
};

// Wraps the native OS date picker (iOS wheel/inline, Android modal dialog,
// web <input type="date">) behind the app's Input-style trigger, so leave
// requests get real calendar selection instead of free-text "YYYY-MM-DD"
// typing that's easy to mistype or submit malformed.
export const DateField = ({
  label,
  value,
  onChange,
  placeholder = 'Select date',
  minimumDate,
  maximumDate,
  error,
}: DateFieldProps) => {
  const { colors } = useTheme();
  const [showPicker, setShowPicker] = useState(false);

  const handleChange = (event: DateTimePickerEvent, selected?: Date) => {
    // Android's picker is a one-shot dialog - it fires 'dismissed' with no
    // date on cancel, and closes itself after a pick. iOS's inline/spinner
    // stays mounted until the caller hides it (no auto-dismiss event).
    if (Platform.OS === 'android') {
      setShowPicker(false);
    }
    if (event.type === 'dismissed' || !selected) return;
    onChange(toIsoDate(selected));
    if (Platform.OS === 'web') setShowPicker(false);
  };

  return (
    <View className="mb-4">
      {label ? (
        <Text className="text-sm font-medium mb-2" style={{ color: colors.textSecondary }}>
          {label}
        </Text>
      ) : null}
      <Pressable
        onPress={() => setShowPicker(true)}
        className="rounded-2xl px-4 py-3.5 border flex-row items-center justify-between"
        style={{
          backgroundColor: colors.surface,
          borderColor: error ? colors.error : colors.border,
        }}
      >
        <Text
          className="text-base"
          style={{ color: value ? colors.text : colors.textMuted }}
        >
          {value ? formatDisplay(value) : placeholder}
        </Text>
        <Ionicons name="calendar-outline" size={18} color={colors.textSecondary} />
      </Pressable>
      {error ? (
        <Text className="text-xs mt-1.5" style={{ color: colors.error }}>
          {error}
        </Text>
      ) : null}

      {showPicker ? (
        <DateTimePicker
          value={value ? new Date(`${value}T00:00:00`) : new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          onChange={handleChange}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
          {...(Platform.OS === 'ios' ? { themeVariant: 'light' as const } : {})}
        />
      ) : null}

      {/* iOS's inline picker has no built-in "Done" - close it explicitly. */}
      {showPicker && Platform.OS === 'ios' ? (
        <Pressable onPress={() => setShowPicker(false)} className="items-end mt-1">
          <Text className="text-sm font-semibold" style={{ color: colors.primary }}>
            Done
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
};
