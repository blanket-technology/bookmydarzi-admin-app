import { Image } from 'expo-image';
import { Modal } from '@/components/ui/Modal';

interface DocumentPreviewModalProps {
  url: string | null;
  onClose: () => void;
}

// Shared image preview for KYC/document "View" actions (tailor detail,
// tailor application review) — PDFs never reach this, they're opened
// externally via Linking.openURL instead (expo-image can't render them).
export const DocumentPreviewModal = ({ url, onClose }: DocumentPreviewModalProps) => (
  <Modal visible={!!url} onClose={onClose} title="Document">
    {url ? (
      <Image
        source={{ uri: url }}
        style={{ width: '100%', aspectRatio: 1, borderRadius: 16 }}
        contentFit="contain"
      />
    ) : null}
  </Modal>
);
