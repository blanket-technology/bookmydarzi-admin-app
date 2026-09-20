import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { Button, Card, Header, Input, Pressable, ScreenContent } from '@/components/ui';
import { StaffDocumentPickerSheet } from '@/features/staffDetail/components/StaffDocumentPickerSheet';
import { useCreateApplicationMutation } from '@/features/applications/hooks/useApplications';
import { useTheme } from '@/hooks/useTheme';
import { toast } from '@/store/toastStore';
import { isValidEmail, isValidMobile } from '@/utils/validation';

type PickedFile = { uri: string; fileName?: string; mimeType?: string };
type DocKey = 'aadhaarFront' | 'aadhaarBack' | 'panCard';

const DOCS: { key: DocKey; label: string }[] = [
  { key: 'aadhaarFront', label: 'Aadhaar Front' },
  { key: 'aadhaarBack', label: 'Aadhaar Back' },
  { key: 'panCard', label: 'PAN Card' },
];

/** Admin "Add Tailor" - submits a PENDING TailorApplication into the same
 * review queue the public /tailor/apply form feeds (see
 * POST /admin/tailor-applications on the backend). No login credentials are
 * collected: approving the application from the Applications tab is what
 * actually creates the account and emails a password-setup OTP, same as any
 * self-service applicant. This replaces AddStaffForm for the tailor role -
 * that form's POST /admin/staff no longer accepts role=tailor at all. */
export function AddTailorApplicationForm() {
  const { colors } = useTheme();
  const createMutation = useCreateApplicationMutation();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [city, setCity] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [files, setFiles] = useState<Partial<Record<DocKey, PickedFile>>>({});
  const [pickerFor, setPickerFor] = useState<DocKey | null>(null);

  const setFile = (key: DocKey, file: PickedFile) => setFiles((prev) => ({ ...prev, [key]: file }));

  const pickPhoto = async (key: DocKey) => {
    setPickerFor(null);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      toast.error('Photo library permission is required to upload documents');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    setFile(key, { uri: asset.uri, fileName: asset.fileName ?? undefined, mimeType: asset.mimeType ?? 'image/jpeg' });
  };

  const pickDocument = async (key: DocKey) => {
    setPickerFor(null);
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/pdf',
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    setFile(key, { uri: asset.uri, fileName: asset.name ?? undefined, mimeType: asset.mimeType ?? 'application/pdf' });
  };

  const validate = () => {
    const next: Record<string, string> = {};
    if (fullName.trim().length < 2) next.fullName = 'Full name is required';
    if (!isValidEmail(email)) next.email = 'Valid email required';
    if (!isValidMobile(phone)) next.phone = 'Valid 10-digit mobile required';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    createMutation.mutate(
      {
        full_name: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        city: city.trim() || undefined,
        specialization: specialization.trim() || undefined,
        aadhaarFront: files.aadhaarFront,
        aadhaarBack: files.aadhaarBack,
        panCard: files.panCard,
      },
      { onSuccess: () => router.back() },
    );
  };

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <Header title="Add Tailor" subtitle="Submit an application for review" showMenu={false} />
      <ScreenContent keyboardShouldPersistTaps="handled">
        <Input label="Full Name" value={fullName} onChangeText={setFullName} error={errors.fullName} />
        <Input
          label="Email"
          value={email}
          onChangeText={setEmail}
          error={errors.email}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <Input
          label="Mobile"
          value={phone}
          onChangeText={setPhone}
          error={errors.phone}
          keyboardType="phone-pad"
          maxLength={10}
        />
        <Input label="Specialization (optional)" value={specialization} onChangeText={setSpecialization} />
        <Input label="City (optional)" value={city} onChangeText={setCity} />

        <Text className="text-sm font-semibold mt-2 mb-2" style={{ color: colors.text }}>
          KYC Documents
        </Text>
        <Text className="text-xs mb-3" style={{ color: colors.textMuted }}>
          Aadhaar (front + back) and PAN are required before this application can be approved - can also be added
          later from the application detail page.
        </Text>
        <Card className="mb-4">
          {DOCS.map((doc) => {
            const uploaded = !!files[doc.key];
            return (
              <View
                key={doc.key}
                className="flex-row items-center justify-between py-3 border-b"
                style={{ borderColor: colors.border }}
              >
                <View className="flex-row items-center flex-1">
                  <Ionicons
                    name={uploaded ? 'checkmark-circle' : 'alert-circle-outline'}
                    size={20}
                    color={uploaded ? '#16a34a' : colors.textMuted}
                  />
                  <Text className="ml-2" style={{ color: colors.text }}>
                    {doc.label}
                  </Text>
                </View>
                <Pressable
                  onPress={() => setPickerFor(doc.key)}
                  className="px-3 py-1.5 rounded-lg"
                  style={{ backgroundColor: colors.primaryLight }}
                >
                  <Text className="text-xs font-semibold" style={{ color: colors.primary }}>
                    {uploaded ? 'Replace' : 'Upload'}
                  </Text>
                </Pressable>
              </View>
            );
          })}
        </Card>

        <Button
          title="Submit Application"
          onPress={handleSubmit}
          loading={createMutation.isPending}
          fullWidth
        />
      </ScreenContent>

      <StaffDocumentPickerSheet
        visible={!!pickerFor}
        onClose={() => setPickerFor(null)}
        onPickPhoto={() => pickerFor && pickPhoto(pickerFor)}
        onPickDocument={() => pickerFor && pickDocument(pickerFor)}
      />
    </View>
  );
}
