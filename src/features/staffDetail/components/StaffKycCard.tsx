import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import { Card, Pressable } from '@/components/ui';
import { useTheme } from '@/hooks/useTheme';
import { KYC_DOCS, type KycDocKey, type KycDocumentUrls } from '@/features/staffDetail/types';
import { isPdfUrl } from '@/utils/documents';

interface StaffKycCardProps {
  documents: KycDocumentUrls;
  uploading: boolean;
  onView: (url?: string | null) => void;
  onUploadPress: (key: KycDocKey) => void;
}

// Shared Aadhaar/PAN/Other KYC document list — identical between Tailor and
// Employee (same 3 document types, same view/replace pattern).
export const StaffKycCard = ({ documents, uploading, onView, onUploadPress }: StaffKycCardProps) => {
  const { colors } = useTheme();

  return (
    <Card className="mb-4">
      {KYC_DOCS.map((doc) => {
        const url = documents[doc.urlField];
        const uploaded = !!url;
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
            <View className="flex-row items-center gap-2">
              {uploaded ? (
                <Pressable
                  onPress={() => onView(url)}
                  className="px-3 py-1.5 rounded-lg flex-row items-center"
                  style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}
                >
                  <Ionicons name={isPdfUrl(url) ? 'document-text-outline' : 'eye-outline'} size={14} color={colors.text} />
                  <Text className="text-xs font-semibold ml-1" style={{ color: colors.text }}>
                    View
                  </Text>
                </Pressable>
              ) : null}
              <Pressable
                onPress={() => onUploadPress(doc.key)}
                disabled={uploading}
                className="px-3 py-1.5 rounded-lg"
                style={{ backgroundColor: colors.primaryLight }}
              >
                <Text className="text-xs font-semibold" style={{ color: colors.primary }}>
                  {uploaded ? 'Replace' : 'Upload'}
                </Text>
              </Pressable>
            </View>
          </View>
        );
      })}
    </Card>
  );
};
