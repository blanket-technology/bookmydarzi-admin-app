import { useRef } from 'react';
import { Text, TextInput, View, useWindowDimensions, type TextInputInstance } from 'react-native';
import { useTheme } from '@/hooks/useTheme';

interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  error?: string;
  autoFocus?: boolean;
}

/**
 * Six-box OTP entry: each digit is its own input so focus auto-advances as
 * the user types, backspace steps back into the previous box, and pasting a
 * full code into any box fills every box at once — the standard pattern
 * used by every major app's verification screen, instead of one plain
 * numeric text field.
 */
export const OtpInput = ({ value, onChange, length = 6, error, autoFocus = true }: OtpInputProps) => {
  const { colors } = useTheme();
  const { width: screenWidth } = useWindowDimensions();
  const inputRefs = useRef<Array<TextInputInstance | null>>([]);
  const digits = Array.from({ length }, (_, i) => value[i] ?? '');

  // Box size (and therefore font size) must scale with the actual screen
  // width, not a fixed text-2xl - on narrower phones, 6 boxes in a row at a
  // fixed 24px font overflowed/clipped the digit inside each box. Derive
  // both from the same available-width calculation so the digit always fits
  // with room to spare, on any screen size.
  const HORIZONTAL_PADDING = 24 * 2 + 24 * 2; // screen px-6 (24) + card padding (24), both sides
  const GAP = 8;
  const available = screenWidth - HORIZONTAL_PADDING - GAP * (length - 1);
  const boxSize = Math.max(40, Math.min(56, available / length));
  const fontSize = Math.round(boxSize * 0.42);

  const setDigit = (index: number, text: string) => {
    // Handle a full-code paste landing in any single box.
    const clean = text.replace(/\D/g, '');
    if (clean.length > 1) {
      onChange(clean.slice(0, length));
      const nextIndex = Math.min(clean.length, length - 1);
      inputRefs.current[nextIndex]?.focus();
      return;
    }

    const next = value.split('');
    next[index] = clean;
    const joined = next.join('').slice(0, length);
    onChange(joined);

    if (clean && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (index: number, key: string) => {
    if (key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
      const next = value.split('');
      next[index - 1] = '';
      onChange(next.join(''));
    }
  };

  return (
    <View className="mb-2">
      <View className="flex-row justify-between gap-2">
        {digits.map((digit, index) => {
          const filled = digit.length > 0;
          const isNextToFill = !filled && (index === 0 || digits[index - 1]);
          return (
            <View key={index}>
              <TextInput
                ref={(ref) => {
                  inputRefs.current[index] = ref;
                }}
                value={digit}
                onChangeText={(text) => setDigit(index, text)}
                onKeyPress={({ nativeEvent }) => handleKeyPress(index, nativeEvent.key)}
                keyboardType="number-pad"
                maxLength={length}
                autoFocus={autoFocus && index === 0}
                textAlign="center"
                textAlignVertical="center"
                selectTextOnFocus
                className="rounded-2xl font-bold"
                style={{
                  width: boxSize,
                  height: boxSize,
                  fontSize,
                  lineHeight: fontSize,
                  paddingVertical: 0,
                  paddingTop: 0,
                  paddingBottom: 0,
                  includeFontPadding: false,
                  backgroundColor: colors.surface,
                  borderWidth: 2,
                  borderColor: error
                    ? colors.error
                    : filled
                      ? colors.primary
                      : isNextToFill
                        ? colors.primary + '80'
                        : colors.border,
                  color: colors.text,
                }}
              />
            </View>
          );
        })}
      </View>
      {error ? (
        <Text className="text-xs mt-2" style={{ color: colors.error }}>
          {error}
        </Text>
      ) : null}
    </View>
  );
};
