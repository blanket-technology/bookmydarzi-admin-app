import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import { Badge, BottomSheet, Button, Input, Pressable, SkeletonList } from '@/components/ui';
import {
  useMeasurementProfiles,
  useUpdateMeasurementProfileMutation,
} from '@/features/measurements/hooks/useMeasurementProfiles';
import {
  useCollectMeasurementMutation,
  useUpdateOrderMeasurementMutation,
} from '@/features/orders/hooks/useOrders';
import { resolveMeasurementFields, type MeasurementGender } from '@/features/orders/utils/measurementFieldSets';
import { useAppLanguage } from '@/hooks/useAppLanguage';
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
  /** Which line item this measurement is for - REQUIRED when the order has
   * more than one item (each garment/person needs its own measurement).
   * Omit for single-item orders. The caller (orders/[id].tsx) is responsible
   * for opening this sheet once per item on a multi-item order. */
  orderItemId?: number;
  /** e.g. "Men's Shirt for Rahul" - shown as a subtitle so it's clear which
   * item this sheet is measuring when an order has several. */
  itemLabel?: string;
}

const GENDER_OPTIONS: { value: MeasurementGender; labelKey: string }[] = [
  { value: 'male', labelKey: 'measurementManage.male' },
  { value: 'female', labelKey: 'measurementManage.female' },
  { value: 'unisex', labelKey: 'measurementManage.unisex' },
];

const EMPTY_VALUES: Record<string, string> = {
  chest: '', waist: '', hips: '', shoulder: '', neck: '',
  sleeve_length: '', inseam: '', height: '',
};

// Number(v) silently returns NaN for garbage input (e.g. "12.5.3"), which
// then serializes to null in the request body - the value looks "saved"
// but is actually silently dropped. Reject anything that doesn't parse to
// a valid positive measurement instead of passing NaN through.
const numOrUndefined = (v: string): number | undefined => {
  if (!v.trim()) return undefined;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : undefined;
};

const isValidMeasurement = (v: string): boolean => {
  if (!v.trim()) return true;
  const n = Number(v);
  return Number.isFinite(n) && n > 0;
};

// Bridge/employee (or Admin) measurement fill, opened from the order detail
// screen's "Measurements" action (see useOrderActions.ts's manage_measurement/
// update_measurement) - this is where measurement is now ALWAYS collected,
// since customers no longer provide their own (product change: pickup-time
// measurement collection by Bridge/Admin only).
//
// Three modes: pick an existing saved profile for this customer (view what's
// already on file, or attach it as-is), edit an existing profile's values,
// or fill a brand-new profile. The "new"/"edit" form is gender-aware AND
// service/garment-aware - selecting a gender first narrows the field list to
// what that garment actually needs (see utils/measurementFieldSets.ts),
// instead of always showing every field.
// POST /employee/orders/{id}/measurement (or the admin PATCH equivalent)
// persists a new/attached measurement to USER_MEASUREMENTS for reuse on
// future orders; PATCH /measurements/{id} (edit mode) updates an existing
// profile's own record directly.
export const MeasurementManageSheet = ({
  visible,
  onClose,
  orderId,
  customerId,
  serviceLabel,
  useAdminEndpoint = false,
  orderItemId,
  itemLabel,
}: MeasurementManageSheetProps) => {
  const { colors } = useTheme();
  const { t } = useAppLanguage();
  const [mode, setMode] = useState<'list' | 'new' | 'edit'>('list');
  const [editingProfile, setEditingProfile] = useState<MeasurementProfile | null>(null);
  const [gender, setGender] = useState<MeasurementGender | null>(null);
  const [profileName, setProfileName] = useState('');
  const [values, setValues] = useState<Record<string, string>>(EMPTY_VALUES);
  const [fitPreference, setFitPreference] = useState('');
  const [notes, setNotes] = useState('');
  const { data, isLoading } = useMeasurementProfiles(customerId, visible);
  const employeeMutation = useCollectMeasurementMutation();
  const adminMutation = useUpdateOrderMeasurementMutation();
  const collectMutation = useAdminEndpoint ? adminMutation : employeeMutation;
  const updateProfileMutation = useUpdateMeasurementProfileMutation(customerId);

  const profiles = data?.measurements ?? [];
  const activeFields = useMemo(
    () => (gender ? resolveMeasurementFields(serviceLabel, gender) : []),
    [gender, serviceLabel],
  );

  const hasUnsavedInput =
    (mode === 'new' || mode === 'edit') &&
    (profileName.trim() !== '' ||
      gender !== null ||
      Object.values(values).some((v) => v.trim() !== '') ||
      fitPreference.trim() !== '' ||
      notes.trim() !== '');

  const hasInvalidValue = Object.values(values).some((v) => !isValidMeasurement(v));

  const reset = () => {
    setMode('list');
    setEditingProfile(null);
    setGender(null);
    setProfileName('');
    setValues(EMPTY_VALUES);
    setFitPreference('');
    setNotes('');
  };

  // Loads a saved profile's values into the same form "new" mode uses, so
  // editing reuses all of it (field-set-by-gender, validation, layout)
  // instead of a second bespoke form. Previously there was no path from
  // "select a saved profile" to "change its values" at all - tapping a
  // profile only ever attached it as-is to this order (handleAttachExisting
  // below), with correcting a wrong measurement meaning create a brand new
  // profile instead of fixing the existing one.
  const openEdit = (profile: MeasurementProfile) => {
    setEditingProfile(profile);
    setProfileName(profile.profile_name ?? '');
    setGender(
      profile.gender === 'male' || profile.gender === 'female' || profile.gender === 'unisex'
        ? profile.gender
        : null,
    );
    setValues({
      chest: profile.chest != null ? String(profile.chest) : '',
      waist: profile.waist != null ? String(profile.waist) : '',
      hips: profile.hips != null ? String(profile.hips) : '',
      shoulder: profile.shoulder != null ? String(profile.shoulder) : '',
      neck: profile.neck != null ? String(profile.neck) : '',
      sleeve_length: profile.sleeve_length != null ? String(profile.sleeve_length) : '',
      inseam: profile.inseam != null ? String(profile.inseam) : '',
      height: profile.height != null ? String(profile.height) : '',
    });
    setFitPreference(profile.fit_preference ?? '');
    setNotes(profile.notes ?? '');
    setMode('edit');
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const requestClose = () => {
    if (hasUnsavedInput) {
      Alert.alert(
        t('measurementManage.discardTitle'),
        t('measurementManage.discardBody'),
        [
          { text: t('measurementManage.keepEditing'), style: 'cancel' },
          { text: t('measurementManage.discard'), style: 'destructive', onPress: handleClose },
        ],
      );
      return;
    }
    handleClose();
  };

  const handleAttachExisting = (profile: MeasurementProfile) => {
    collectMutation.mutate(
      { orderId, payload: { order_item_id: orderItemId, measurement_id: profile.id } },
      { onSuccess: handleClose },
    );
  };

  const handleCreateNew = () => {
    if (!profileName.trim() || !gender || hasInvalidValue) return;
    collectMutation.mutate(
      {
        orderId,
        payload: {
          order_item_id: orderItemId,
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

  // Saves changes to the profile itself (PATCH /measurements/{id}), not to
  // this order - matches how the profile is a customer-level, reusable
  // record (USER_MEASUREMENTS), same as handleAttachExisting reuses one
  // as-is. If this order hasn't already got a measurement attached, also
  // attach this (now-updated) profile to it, same as tapping it in list mode
  // would - editing a profile from inside an order shouldn't silently leave
  // the order without a measurement if it didn't have one yet.
  const handleSaveEdit = () => {
    if (!editingProfile || !profileName.trim() || !gender || hasInvalidValue) return;
    updateProfileMutation.mutate(
      {
        id: editingProfile.id,
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
      {
        onSuccess: () => {
          collectMutation.mutate(
            { orderId, payload: { order_item_id: orderItemId, measurement_id: editingProfile.id } },
            { onSuccess: handleClose, onError: handleClose },
          );
        },
      },
    );
  };

  return (
    <BottomSheet visible={visible} onClose={requestClose} title={t('measurement.title')}>
      {itemLabel ? (
        <Text className="text-xs font-semibold mb-3 -mt-1" style={{ color: colors.textSecondary }}>
          {t('measurementManage.forItem', { item: itemLabel })}
        </Text>
      ) : null}
      {mode === 'list' ? (
        <>
          {isLoading ? (
            <SkeletonList count={3} />
          ) : profiles.length === 0 ? (
            <Text className="text-sm py-4 text-center" style={{ color: colors.textMuted }}>
              {t('measurementManage.noSavedProfiles')}
            </Text>
          ) : (
            <ScrollView style={{ maxHeight: 360 }} showsVerticalScrollIndicator={false}>
              {profiles.map((profile) => (
                <View
                  key={profile.id}
                  className="rounded-2xl p-3 mb-2 border"
                  style={{ borderColor: colors.border, backgroundColor: colors.surface }}
                >
                  <Pressable onPress={() => handleAttachExisting(profile)} disabled={collectMutation.isPending}>
                    <View className="flex-row items-center justify-between mb-1">
                      <Text className="font-semibold flex-1 mr-2" style={{ color: colors.text }}>
                        {profile.profile_name}
                      </Text>
                      {profile.is_default ? (
                        <Badge label={t('measurementManage.default')} backgroundColor={colors.primaryLight} color={colors.primary} />
                      ) : null}
                    </View>
                    <Text className="text-xs" style={{ color: colors.textSecondary }}>
                      {(
                        [
                          [t('measurement.chest'), profile.chest],
                          [t('measurement.waist'), profile.waist],
                          [t('measurement.hips'), profile.hips],
                          [t('measurement.shoulder'), profile.shoulder],
                          [t('measurement.neck'), profile.neck],
                          [t('measurementManage.sleeve'), profile.sleeve_length],
                          [t('measurement.inseam'), profile.inseam],
                          [t('measurement.height'), profile.height],
                        ] as const
                      )
                        .filter(([, v]) => v != null)
                        .map(([label, v]) => `${label} ${v}"`)
                        .join(' · ') || t('measurementManage.noMeasurementsOnFile')}
                      {profile.fit_preference ? ` · ${t('measurementManage.fitLabel', { fit: profile.fit_preference })}` : ''}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => openEdit(profile)}
                    className="flex-row items-center self-start mt-2"
                    hitSlop={8}
                  >
                    <Ionicons name="create-outline" size={14} color={colors.primary} />
                    <Text className="ml-1 text-xs font-semibold" style={{ color: colors.primary }}>
                      {t('measurementManage.editValues')}
                    </Text>
                  </Pressable>
                </View>
              ))}
            </ScrollView>
          )}
          <Button
            title={t('measurementManage.addNew')}
            variant="outline"
            onPress={() => setMode('new')}
            className="mt-3"
            fullWidth
          />
        </>
      ) : (
        <ScrollView style={{ maxHeight: 460 }} showsVerticalScrollIndicator={false}>
          <Pressable onPress={() => { setMode('list'); setEditingProfile(null); }} className="flex-row items-center mb-1">
            <Ionicons name="arrow-back" size={16} color={colors.primary} />
            <Text className="ml-1 text-sm font-semibold" style={{ color: colors.primary }}>
              {t('measurementManage.backToSaved')}
            </Text>
          </Pressable>
          <Text className="text-xs font-semibold mb-3" style={{ color: colors.textMuted }}>
            {mode === 'edit' ? t('measurementManage.editingProfile', { name: editingProfile?.profile_name ?? '' }) : t('measurementManage.newProfile')}
          </Text>

          <Input
            label={t('measurementManage.profileName')}
            value={profileName}
            onChangeText={setProfileName}
            placeholder={t('measurementManage.profileNamePlaceholder')}
          />

          <Text className="text-xs font-semibold mb-2" style={{ color: colors.textSecondary }}>
            {t('measurementManage.genderRequired')}
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
                  {t(opt.labelKey)}
                </Text>
              </Pressable>
            ))}
          </View>

          {!gender ? (
            <Text className="text-xs mb-2" style={{ color: colors.textMuted }}>
              {t('measurementManage.selectGenderHint')}
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
                          error={isValidMeasurement(values[field.key]) ? undefined : t('measurementManage.invalid')}
                        />
                      </View>
                      {next ? (
                        <View className="flex-1">
                          <Input
                            label={next.label}
                            value={values[next.key]}
                            onChangeText={(text) => setValues((v) => ({ ...v, [next.key]: text }))}
                            keyboardType="decimal-pad"
                            error={isValidMeasurement(values[next.key]) ? undefined : t('measurementManage.invalid')}
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
                label={t('measurement.fitPreference')}
                value={fitPreference}
                onChangeText={setFitPreference}
                placeholder={t('measurementManage.fitPreferencePlaceholder')}
              />
              <Input
                label={t('measurement.notes')}
                value={notes}
                onChangeText={setNotes}
                placeholder={t('measurementManage.optional')}
              />

              <Button
                title={mode === 'edit' ? t('profile.saveChanges') : t('measurementManage.saveMeasurement')}
                onPress={mode === 'edit' ? handleSaveEdit : handleCreateNew}
                loading={mode === 'edit' ? updateProfileMutation.isPending || collectMutation.isPending : collectMutation.isPending}
                disabled={!profileName.trim() || hasInvalidValue}
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
