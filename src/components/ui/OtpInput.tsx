import { useRef } from 'react';
import { TextInput, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
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
  const inputRefs = useRef<Array<TextInput | null>>([]);
  const digits = Array.from({ length }, (_, i) => value[i] ?? '');

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
            <Animated.View
              key={index}
              entering={FadeIn.delay(index * 40).duration(250)}
              className="flex-1"
            >
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
                selectTextOnFocus
                className="rounded-2xl text-2xl font-bold"
                style={{
                  aspectRatio: 1,
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
            </Animated.View>
          );
        })}
      </View>
      {error ? (
        <Animated.Text
          entering={FadeIn}
          className="text-xs mt-2"
          style={{ color: colors.error }}
        >
          {error}
        </Animated.Text>
      ) : null}
    </View>
  );
};
