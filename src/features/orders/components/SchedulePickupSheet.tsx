import { useMemo, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { BottomSheet, Button, DateField, Pressable } from '@/components/ui';
import { useSchedulePickupMutation } from '@/features/orders/hooks/useOrders';
import { useAppLanguage } from '@/hooks/useAppLanguage';
import { useTheme } from '@/hooks/useTheme';

// Mirrors bookmydarzi-web-final/lib/pickupPrefs.ts's buildPickupTimeSlots -
// 9 AM to 9 PM inclusive, 30-minute slots - so a scheduled pickup entered
// here lines up with the same slot windows customers actually pick from at
// checkout, not an arbitrary different range invented for this screen.
const START_HOUR = 9;
const END_HOUR = 21;

function buildTimeSlots(): string[] {
  const slots: string[] = [];
  for (let hour = START_HOUR; hour <= END_HOUR; hour++) {
    for (const minute of [0, 30]) {
      if (hour === END_HOUR && minute > 0) break;
      const period = hour < 12 ? 'AM' : 'PM';
      const displayHour = hour % 12 === 0 ? 12 : hour % 12;
      slots.push(`${displayHour}:${minute === 0 ? '00' : '30'} ${period}`);
    }
  }
  return slots;
}
const TIME_SLOTS = buildTimeSlots();

/**
 * Previously "Schedule Pickup" fired instantly with an empty payload the
 * moment it was tapped (useOrderActions.ts's schedule_pickup action, called
 * straight from [id].tsx's handleActionPress) - the backend defaults an
 * empty body to pickup_type: "instant" (employee.py), so every tap silently
 * became an instant pickup with no way to actually schedule one for later,
 * despite the action being flagged requiresInput: true. This sheet gives it
 * the real instant/scheduled choice web already has (orderActions.js's
 * schedule_pickup_instant / schedule_pickup_scheduled).
 */
export const SchedulePickupSheet = ({
  visible,
  onClose,
  orderId,
}: {
  visible: boolean;
  onClose: () => void;
  orderId: string;
}) => {
  const { colors } = useTheme();
  const { t } = useAppLanguage();
  const [mode, setMode] = useState<'instant' | 'scheduled'>('instant');
  const [date, setDate] = useState<string | null>(null);
  const [slot, setSlot] = useState<string | null>(null);
  const mutation = useSchedulePickupMutation();

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const canSubmit = mode === 'instant' || (!!date && !!slot);

  const handleSubmit = () => {
    if (!canSubmit) return;
    const payload =
      mode === 'instant'
        ? { pickup_type: 'instant' as const }
        : {
            pickup_type: 'scheduled' as const,
            scheduled_pickup_at: `${date}T00:00:00`,
            pickup_time_slot: slot!,
          };
    mutation.mutate(
      { orderId, payload },
      {
        onSuccess: () => {
          onClose();
          setMode('instant');
          setDate(null);
          setSlot(null);
        },
      },
    );
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} title={t('schedulePickup.title')}>
      <View className="flex-row mb-4" style={{ gap: 8 }}>
        {(['instant', 'scheduled'] as const).map((m) => {
          const active = mode === m;
          return (
            <Pressable
              key={m}
              onPress={() => setMode(m)}
              haptic="selection"
              className="flex-1 items-center py-3 rounded-xl border"
              style={{
                borderColor: active ? colors.primary : colors.border,
                backgroundColor: active ? colors.primaryLight : colors.card,
              }}
            >
              <Text
                className="text-sm font-semibold capitalize"
                style={{ color: active ? colors.primary : colors.textSecondary }}
              >
                {m === 'instant' ? t('schedulePickup.instant') : t('schedulePickup.scheduled')}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {mode === 'scheduled' ? (
        <>
          <DateField label={t('schedulePickup.pickupDate')} value={date} onChange={setDate} minimumDate={today} />
          <Text className="text-sm font-medium mb-2" style={{ color: colors.textSecondary }}>
            {t('schedulePickup.timeSlot')}
          </Text>
          <ScrollView style={{ maxHeight: 220 }} className="mb-4">
            <View className="flex-row flex-wrap" style={{ gap: 8 }}>
              {TIME_SLOTS.map((s) => {
                const active = slot === s;
                return (
                  <Pressable
                    key={s}
                    onPress={() => setSlot(s)}
                    haptic="selection"
                    className="px-3 py-2 rounded-lg border"
                    style={{
                      borderColor: active ? colors.primary : colors.border,
                      backgroundColor: active ? colors.primaryLight : colors.card,
                    }}
                  >
                    <Text className="text-xs font-semibold" style={{ color: active ? colors.primary : colors.text }}>
                      {s}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
        </>
      ) : null}

      <Button
        title={t('schedulePickup.title')}
        onPress={handleSubmit}
        loading={mutation.isPending}
        disabled={!canSubmit}
        fullWidth
      />
    </BottomSheet>
  );
};
