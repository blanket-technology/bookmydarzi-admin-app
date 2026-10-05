import { Ionicons } from '@expo/vector-icons';
import { Fragment } from 'react';
import { Text } from 'react-native';
import { BottomSheet, Pressable } from '@/components/ui';
import { useTheme } from '@/hooks/useTheme';

interface StaffDocumentPickerSheetProps {
  visible: boolean;
  onClose: () => void;
  onPickPhoto: () => void;
  onPickDocument: () => void;
}

// Shared "Photo (from library) / PDF Document" source picker for KYC
// document upload — identical between Tailor and Employee.
//
// Bug fix: both option rows used to render as plain BottomSheet children
// instead of via its `footer` prop. BottomSheet only reliably applies safe
// bottom-inset padding to footer content - plain children get an unbounded
// ScrollView with contentContainerStyle={flexGrow:1}, which let the last
// row ("PDF Document") render clipped at/past the visible edge, same class
// of bug already fixed on the Reject Application sheet. This sheet has no
// real scrollable body, so both rows move into footer instead.
export const StaffDocumentPickerSheet = ({ visible, onClose, onPickPhoto, onPickDocument }: StaffDocumentPickerSheetProps) => {
  const { colors } = useTheme();
  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Upload Document"
      children={null}
      footer={
        <Fragment>
          <Pressable
            onPress={onPickPhoto}
            className="flex-row items-center py-3.5 border-b"
            style={{ borderColor: colors.border }}
          >
            <Ionicons name="image-outline" size={20} color={colors.primary} />
            <Text className="ml-3 font-medium" style={{ color: colors.text }}>
              Photo (from library)
            </Text>
          </Pressable>
          <Pressable onPress={onPickDocument} className="flex-row items-center py-3.5">
            <Ionicons name="document-text-outline" size={20} color={colors.primary} />
            <Text className="ml-3 font-medium" style={{ color: colors.text }}>
              PDF Document
            </Text>
          </Pressable>
        </Fragment>
      }
    />
  );
};
