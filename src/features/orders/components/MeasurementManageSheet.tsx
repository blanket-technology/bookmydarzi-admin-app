import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Badge, BottomSheet, Button, Input, SkeletonList } from '@/components/ui';
import { useMeasurementProfiles } from '@/features/measurements/hooks/useMeasurementProfiles';
import {
  useCollectMeasurementMutation,
  useUpdateOrderMeasurementMutation,
} from '@/features/orders/hooks/useOrders';
import { resolveMeasurementFields, type MeasurementGender } from '@/features/orders/utils/measurementFieldSets';
import { useTheme } from '@/hooks/useTheme';
import type { MeasurementProfile } from '@/types/measurements';

interface MeasurementManageSheetProps {
  visible: boolean;
  onClose: () => void;
  orderId: string;
  customerId?: string;
  /** order.service_name or order.category_name - drives which fields are
   * shown for the "new" form (see measurementFieldSets.ts). */
  serviceLabel?: string;
  /** Admin/Superadmin save via PATCH /admin/orders/{id}/measurement; Employee
   * (Bridge) via POST /employee/orders/{id}/measurement. Same shared UI
   * either way - only the backing endpoint differs. Defaults to the employee
   * endpoint. */
  useAdminEndpoint?: boolean;
}

const GENDER_OPTIONS: { value: MeasurementGender; label: string }[] = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'unisex', label: 'Unisex' },
];

const EMPTY_VALUES: Record<string, string> = {
  chest: '', waist: '', hips: '', shoulder: '', neck: '',
  sleeve_length: '', inseam: '', height: '',
};

const numOrUndefined = (v: string): number | undefined => (v.trim() ? Number(v) : undefined);

// Bridge/employee (or Admin) measurement fill, opened from the order detail
// screen's "Measurements" action (see useOrderActions.ts's manage_measurement/
// update_measurement) - this is where measurement is now ALWAYS collected,
// since customers no longer provide their own (product change: pickup-time
// measurement collection by Bridge/Admin only).
//
// Two modes: pick an existing saved profile for this customer (view what's
// already on file), or fill a brand-new profile. The "new" form is
// gender-aware AND service/garment-aware - selecting a gender first narrows
// the field list to what that garment actually needs (see
// utils/measurementFieldSets.ts), instead of always showing every field.
// POST /employee/orders/{id}/measurement (or the admin PATCH equivalent)
// persists the result to USER_MEASUREMENTS for reuse on future orders.
export const MeasurementManageSheet = ({
  visible,
  onClose,
  orderId,
  customerId,
  serviceLabel,
  useAdminEndpoint = false,
}: MeasurementManageSheetProps) => {
  const { colors } = useTheme();
  const [mode, setMode] = useState<'list' | 'new'>('list');
  const [gender, setGender] = useState<MeasurementGender | null>(null);
  const [profileName, setProfileName] = useState('');
  const [values, setValues] = useState<Record<string, string>>(EMPTY_VALUES);
  const [fitPreference, setFitPreference] = useState('');
  const [notes, setNotes] = useState('');
  const { data, isLoading } = useMeasurementProfiles(customerId, visible);
  const employeeMutation = useCollectMeasurementMutation();
  const adminMutation = useUpdateOrderMeasurementMutation();
  const collectMutation = useAdminEndpoint ? adminMutation : employeeMutation;

  const profiles = data?.measurements ?? [];
  const activeFields = useMemo(
    () => (gender ? resolveMeasurementFields(serviceLabel, gender) : []),
    [gender, serviceLabel],
  );

  const reset = () => {
    setMode('list');
    setGender(null);
    setProfileName('');
    setValues(EMPTY_VALUES);
    setFitPreference('');
    setNotes('');
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleAttachExisting = (profile: MeasurementProfile) => {
    collectMutation.mutate(
      { orderId, payload: { measurement_id: profile.id } },
      { onSuccess: handleClose },
    );
  };

  const handleCreateNew = () => {
    if (!profileName.trim() || !gender) return;
    collectMutation.mutate(
      {
        orderId,
        payload: {
          profile_name: profileName,
          gender,
          chest: numOrUndefined(values.chest),
          waist: numOrUndefined(values.waist),
          hips: numOrUndefined(values.hips),
          shoulder: numOrUndefined(values.shoulder),
          neck: numOrUndefined(values.neck),
          sleeve_length: numOrUndefined(values.sleeve_length),
          inseam: numOrUndefined(values.inseam),
          height: numOrUndefined(values.height),
          fit_preference: fitPreference || undefined,
          notes: notes || undefined,
        },
      },
      { onSuccess: handleClose },
    );
  };

  return (
    <BottomSheet visible={visible} onClose={handleClose} title="Measurements">
      {mode === 'list' ? (
        <>
          {isLoading ? (
            <SkeletonList count={3} />
          ) : profiles.length === 0 ? (
            <Text className="text-sm py-4 text-center" style={{ color: colors.textMuted }}>
              No saved measurement profiles for this customer yet.
            </Text>
          ) : (
            <ScrollView style={{ maxHeight: 360 }} showsVerticalScrollIndicator={false}>
              {profiles.map((profile) => (
                <Pressable
                  key={profile.id}
                  onPress={() => handleAttachExisting(profile)}
                  disabled={collectMutation.isPending}
                  className="rounded-2xl p-3 mb-2 border"
                  style={{ borderColor: colors.border, backgroundColor: colors.surface }}
                >
                  <View className="flex-row items-center justify-between mb-1">
                    <Text className="font-semibold" style={{ color: colors.text }}>
                      {profile.profile_name}
                    </Text>
                    {profile.is_default ? (
                      <Badge label="Default" backgroundColor={colors.primaryLight} color={colors.primary} />
                    ) : null}
                  </View>
                  <Text className="text-xs" style={{ color: colors.textSecondary }}>
                    Chest {profile.chest ?? '—'}" · Waist {profile.waist ?? '—'}" · Shoulder{' '}
                    {profile.shoulder ?? '—'}" · Fit {profile.fit_preference ?? '—'}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          )}
          <Button
            title="Add New Measurement"
            variant="outline"
            onPress={() => setMode('new')}
            className="mt-3"
            fullWidth
          />
        </>
      ) : (
        <ScrollView style={{ maxHeight: 460 }} showsVerticalScrollIndicator={false}>
          <Pressable onPress={() => setMode('list')} className="flex-row items-center mb-3">
            <Ionicons name="arrow-back" size={16} color={colors.primary} />
            <Text className="ml-1 text-sm font-semibold" style={{ color: colors.primary }}>
              Back to saved profiles
            </Text>
          </Pressable>

          <Input
            label="Profile Name *"
            value={profileName}
            onChangeText={setProfileName}
            placeholder="e.g. Wedding Suit"
          />

          <Text className="text-xs font-semibold mb-2" style={{ color: colors.textSecondary }}>
            Gender *
          </Text>
          <View className="flex-row mb-4" style={{ gap: 8 }}>
            {GENDER_OPTIONS.map((opt) => (
              <Pressable
                key={opt.value}
                onPress={() => setGender(opt.value)}
                className="flex-1 items-center py-2.5 rounded-xl border"
                style={{
                  backgroundColor: gender === opt.value ? colors.primary : colors.surface,
                  borderColor: gender === opt.value ? colors.primary : colors.border,
                }}
              >
                <Text
                  className="text-sm font-semibold"
                  style={{ color: gender === opt.value ? '#fff' : colors.text }}
                >
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </View>

          {!gender ? (
            <Text className="text-xs mb-2" style={{ color: colors.textMuted }}>
              Select a gender to show the right measurement fields for this garment.
            </Text>
          ) : (
            <>
              {activeFields.reduce<React.ReactNode[]>((rows, field, i) => {
                if (i % 2 === 0) {
                  const next = activeFields[i + 1];
                  rows.push(
                    <View key={field.key} className="flex-row" style={{ gap: 12 }}>
                      <View className="flex-1">
                        <Input
                          label={field.label}
                          value={values[field.key]}
                          onChangeText={(text) => setValues((v) => ({ ...v, [field.key]: text }))}
                          keyboardType="decimal-pad"
                        />
                      </View>
                      {next ? (
                        <View className="flex-1">
                          <Input
                            label={next.label}
                            value={values[next.key]}
                            onChangeText={(text) => setValues((v) => ({ ...v, [next.key]: text }))}
                            keyboardType="decimal-pad"
                          />
                        </View>
                      ) : (
                        <View className="flex-1" />
                      )}
                    </View>,
                  );
                }
                return rows;
              }, [])}

              <Input
                label="Fit Preference"
                value={fitPreference}
                onChangeText={setFitPreference}
                placeholder="slim / regular / loose"
              />
              <Input
                label="Notes"
                value={notes}
                onChangeText={setNotes}
                placeholder="Optional"
              />

              <Button
                title="Save Measurement"
                onPress={handleCreateNew}
                loading={collectMutation.isPending}
                disabled={!profileName.trim()}
                className="mt-2"
                fullWidth
              />
            </>
          )}
        </ScrollView>
      )}
    </BottomSheet>
  );
};
