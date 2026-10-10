import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Linking, Text, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useTheme } from '@/hooks/useTheme';

interface DocumentPreviewModalProps {
  url: string | null;
  onClose: () => void;
  /** Called once when the image fails to load (private documents use signed URLs
   * that expire after ~15 minutes). Return the record's fresh URL for the same file
   * and the preview retries with it; return null/undefined to show the error. */
  onRefreshUrl?: (staleUrl: string) => Promise<string | null | undefined>;
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
export const DocumentPreviewModal = ({ url, onClose, onRefreshUrl }: DocumentPreviewModalProps) => {
  const { colors } = useTheme();
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [overrideUrl, setOverrideUrl] = useState<string | null>(null);
  const refreshedFor = useRef<string | null>(null);

  useEffect(() => {
    setStatus('loading');
    setOverrideUrl(null);
    refreshedFor.current = null;
  }, [url]);

  const shownUrl = overrideUrl ?? url;

  const handleError = async () => {
    // One refresh attempt per document: an expired signed URL is the usual cause.
    if (url && onRefreshUrl && refreshedFor.current !== url) {
      refreshedFor.current = url;
      try {
        const fresh = await onRefreshUrl(url);
        if (fresh && fresh !== shownUrl) {
          setStatus('loading');
          setOverrideUrl(fresh);
          return;
        }
      } catch {
        // fall through to the error state
      }
    }
    setStatus('error');
  };

  return (
    <Modal visible={!!url} onClose={onClose} title="Document">
      {url ? (
        <View>
          {status === 'error' ? (
            <View className="items-center py-10" style={{ gap: 10 }}>
              <Ionicons name="document-outline" size={32} color={colors.textMuted} />
              <Text className="text-sm text-center" style={{ color: colors.textSecondary }}>
                Couldn&apos;t load this document. The link may have expired, or it may be a
                PDF or an unsupported format. Close and open it again, or try Open externally.
              </Text>
              <Button
                title="Open externally"
                variant="outline"
                onPress={() => Linking.openURL(shownUrl ?? url).catch(() => undefined)}
              />
            </View>
          ) : (
            <View style={{ width: '100%', aspectRatio: 1, borderRadius: 16, overflow: 'hidden' }}>
              <Image
                source={{ uri: shownUrl ?? url }}
                style={{ width: '100%', height: '100%' }}
                contentFit="contain"
                onLoad={() => setStatus('loaded')}
                onError={() => void handleError()}
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
