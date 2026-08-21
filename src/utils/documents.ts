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
