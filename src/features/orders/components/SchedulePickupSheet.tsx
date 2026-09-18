import { useMemo, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { BottomSheet, Button, DateField, EmptyState, Pressable } from '@/components/ui';
import {
  useAssignPickupEmployeeMutation,
  useBridgeEmployees,
  useSchedulePickupMutation,
} from '@/features/orders/hooks/useOrders';
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
 *
 * Also now requires picking a Bridge employee first when the order isn't
 * already claimed (assignedEmployeeId null) - mirrors the web admin
 * panel's OrderFullDetailsPage.jsx exactly: assert_pickup_employee_assigned
 * (order_authorization.py, bmd) hard-requires AssignedEmployeeId before
 * schedule-pickup will succeed, admins included, no bypass. If an
 * employee already accepted the broadcast, this step is skipped entirely -
 * only shown when nobody is assigned yet.
 */
export const SchedulePickupSheet = ({
  visible,
  onClose,
  orderId,
  assignedEmployeeId,
}: {
  visible: boolean;
  onClose: () => void;
  orderId: string;
  /** Order.assigned_employee_id - null/undefined means nobody has claimed
   * the pickup yet, so this sheet must collect one before scheduling. */
  assignedEmployeeId?: string | null;
}) => {
  const { colors } = useTheme();
  const { t } = useAppLanguage();
  const [mode, setMode] = useState<'instant' | 'scheduled'>('instant');
  const [date, setDate] = useState<string | null>(null);
  const [slot, setSlot] = useState<string | null>(null);
  const [pickupEmployeeId, setPickupEmployeeId] = useState<string | null>(null);
  const mutation = useSchedulePickupMutation();
  const assignPickupEmployeeMutation = useAssignPickupEmployeeMutation();
  const needsPickupEmployee = !assignedEmployeeId;
  const { data: bridgeEmployeesData, isLoading: bridgeEmployeesLoading } = useBridgeEmployees(
    visible && needsPickupEmployee,
  );
  const bridgeEmployees = bridgeEmployeesData ?? [];

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const canSubmit =
    (mode === 'instant' || (!!date && !!slot)) && (!needsPickupEmployee || !!pickupEmployeeId);

  const resetAndClose = () => {
    onClose();
    setMode('instant');
    setDate(null);
    setSlot(null);
    setPickupEmployeeId(null);
  };

  const submitSchedule = () => {
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
      { onSuccess: resetAndClose },
    );
  };

  const handleSubmit = () => {
    if (!canSubmit) return;
    if (needsPickupEmployee && pickupEmployeeId) {
      // Assign first, then schedule - two sequential calls, not one atomic
      // backend endpoint, same reasoning as web's runOrderAction: if assign
      // succeeds but schedule then fails, the order is left in a valid
      // state (employee assigned, pickup not yet scheduled), not a broken
      // one - retrying just re-submits this same sheet.
      assignPickupEmployeeMutation.mutate(
        { orderId, payload: { employee_id: pickupEmployeeId } },
        { onSuccess: submitSchedule },
      );
      return;
    }
    submitSchedule();
  };

  const submitting = mutation.isPending || assignPickupEmployeeMutation.isPending;

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={t('schedulePickup.title')}
      footer={
        <Button
          title={t('schedulePickup.title')}
          onPress={handleSubmit}
          loading={submitting}
          disabled={!canSubmit || submitting}
          fullWidth
        />
      }
    >
      {needsPickupEmployee ? (
        <View className="mb-4">
          <Text className="text-sm font-medium mb-2" style={{ color: colors.textSecondary }}>
            {t('assignBridgeEmployee.pickupTitle')}
          </Text>
          {bridgeEmployeesLoading ? (
            <Text className="text-xs" style={{ color: colors.textMuted }}>
              {t('common.loading')}
            </Text>
          ) : bridgeEmployees.length === 0 ? (
            <EmptyState
              icon="bicycle-outline"
              title={t('assignBridgeEmployee.noEmployees')}
              description={t('assignBridgeEmployee.noEmployeesBody')}
            />
          ) : (
            <ScrollView style={{ maxHeight: 180 }}>
              <View className="flex-row flex-wrap" style={{ gap: 8 }}>
                {bridgeEmployees.map((e) => {
                  const active = pickupEmployeeId === e.employee_id;
                  const offline = !e.is_online;
                  return (
                    <Pressable
                      key={e.employee_id}
                      onPress={() => {
                        if (offline) return;
                        setPickupEmployeeId(e.employee_id);
                      }}
                      disabled={offline}
                      haptic="selection"
                      className="px-3 py-2 rounded-lg border"
                      style={{
                        borderColor: active ? colors.primary : colors.border,
                        backgroundColor: active ? colors.primaryLight : colors.card,
                        opacity: offline ? 0.45 : 1,
                      }}
                    >
                      <Text
                        className="text-xs font-semibold"
                        style={{ color: active ? colors.primary : colors.text }}
                      >
                        {e.full_name || `#${e.employee_id}`}
                        {offline ? ` (${t('assignBridgeEmployee.offline')})` : ''}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>
          )}
        </View>
      ) : null}

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
    </BottomSheet>
  );
};
