import { getApiUrl } from '@/config/api';

// Absolute URLs (e.g. ImageKit/CDN) pass through unchanged; relative paths
// like the raw /uploads/tailors/{file} or /static/tailors/{file} some
// upload endpoints store get the API base URL prefixed so they actually
// resolve to something loadable.
export const resolveDocUrl = (url?: string | null): string | undefined => {
  if (!url) return undefined;
  return /^https?:\/\//i.test(url) ? url : getApiUrl(url);
};

// KYC uploads accept JPG/PNG/PDF (assert_image_or_pdf_magic_bytes,
// backend). A PDF can't be rendered by expo-image's <Image> — it just shows
// blank — so PDFs open in the device's own viewer/browser instead of the
// in-app preview modal.
export const isPdfUrl = (url?: string | null): boolean => !!url && /\.pdf($|\?)/i.test(url);

const withoutQuery = (url: string): string => url.split('?')[0];

/**
 * KYC documents are private files served through short-lived signed URLs (about 15
 * minutes). After a refetch of the record, finds the same file's NEW signed URL by
 * matching everything before the query string. Returns null if it is not found.
 */
export const findFreshSignedUrl = (record: unknown, staleUrl: string): string | null => {
  const target = withoutQuery(staleUrl);
  const seen = new Set<unknown>();
  const walk = (value: unknown): string | null => {
    if (typeof value === 'string') {
      const resolved = resolveDocUrl(value);
      return resolved && resolved !== staleUrl && withoutQuery(resolved) === target ? resolved : null;
    }
    if (!value || typeof value !== 'object' || seen.has(value)) return null;
    seen.add(value);
    for (const child of Object.values(value as Record<string, unknown>)) {
      const found = walk(child);
      if (found) return found;
    }
    return null;
  };
  return walk(record);
};
