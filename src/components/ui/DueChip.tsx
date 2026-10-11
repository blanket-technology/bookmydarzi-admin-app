import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import { useAppLanguage } from '@/hooks/useAppLanguage';
import { useTheme } from '@/hooks/useTheme';
import { getDueInfo, type DueTone } from '@/utils/dueDate';

const dateLabel = (d: Date): string =>
  new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short' }).format(d);

/** "Overdue by 2 days" / "Due today" / "Due tomorrow" / "Due in 4 days" (+ the date). */
export const useDueLabel = () => {
  const { t } = useAppLanguage();
  return (value: string | null | undefined): { text: string; tone: DueTone; date: string } | null => {
    const info = getDueInfo(value);
    if (!info) return null;
    const { daysLeft } = info;
    const text =
      daysLeft < 0
        ? t('due.overdue', { count: -daysLeft })
        : daysLeft === 0
          ? t('due.today')
          : daysLeft === 1
            ? t('due.tomorrow')
            : t('due.inDays', { count: daysLeft });
    return { text, tone: info.tone, date: dateLabel(info.date) };
  };
};

/**
 * Colour-coded delivery deadline. Red when overdue or due today, amber when due
 * within two days, neutral otherwise - so the urgent orders stand out at a glance.
 */
export const DueChip = ({ value, compact }: { value: string | null | undefined; compact?: boolean }) => {
  const { colors } = useTheme();
  const describe = useDueLabel();
  const due = describe(value);
  if (!due) return null;
  const color =
    due.tone === 'overdue' || due.tone === 'today'
      ? colors.error
      : due.tone === 'soon'
        ? colors.warning
        : colors.textSecondary;
  return (
    <View
      className="flex-row items-center self-start px-2.5 py-1 rounded-full"
      style={{ backgroundColor: `${color}1A` }}
      accessibilityLabel={`${due.text}, ${due.date}`}
    >
      <Ionicons name="calendar-outline" size={12} color={color} />
      <Text className="text-xs font-semibold ml-1.5" style={{ color }} numberOfLines={1}>
        {compact ? due.text : `${due.text} · ${due.date}`}
      </Text>
    </View>
  );
};
