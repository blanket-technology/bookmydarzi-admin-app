import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Text, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useTheme } from '@/hooks/useTheme';

interface DocumentPreviewModalProps {
  url: string | null;
  onClose: () => void;
}

// Shared image preview for KYC/document "View" actions (tailor detail,
// tailor application review) - PDFs are usually caught upstream and opened
// externally via Linking.openURL instead (expo-image can't render them),
// but that detection is a filename-extension regex (isPdfUrl) that misses
// signed/CDN URLs with no literal ".pdf" in the path. Previously, ANY image
// load failure here - a missed PDF, an unreachable URL, a network error -
// rendered as completely blank space with no feedback at all, just the
// modal's own close button. Now shows a loading spinner while fetching and
// a clear error state with an "Open externally" fallback on failure,
// instead of silently showing nothing.
export const DocumentPreviewModal = ({ url, onClose }: DocumentPreviewModalProps) => {
  const { colors } = useTheme();
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading');

  useEffect(() => {
    setStatus('loading');
  }, [url]);

  return (
    <Modal visible={!!url} onClose={onClose} title="Document">
      {url ? (
        <View>
          {status === 'error' ? (
            <View className="items-center py-10" style={{ gap: 10 }}>
              <Ionicons name="document-outline" size={32} color={colors.textMuted} />
              <Text className="text-sm text-center" style={{ color: colors.textSecondary }}>
                Couldn&apos;t preview this document in-app. It may be a PDF or an
                unsupported format.
              </Text>
              <Button
                title="Open externally"
                variant="outline"
                onPress={() => Linking.openURL(url).catch(() => {})}
              />
            </View>
          ) : (
            <View style={{ width: '100%', aspectRatio: 1, borderRadius: 16, overflow: 'hidden' }}>
              <Image
                source={{ uri: url }}
                style={{ width: '100%', height: '100%' }}
                contentFit="contain"
                onLoad={() => setStatus('loaded')}
                onError={() => setStatus('error')}
              />
              {status === 'loading' ? (
                <View
                  pointerEvents="none"
                  className="items-center justify-center"
                  style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
                >
                  <ActivityIndicator color={colors.primary} />
                </View>
              ) : null}
            </View>
          )}
        </View>
      ) : null}
    </Modal>
  );
};
