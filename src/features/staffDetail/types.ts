import type { Ionicons } from '@expo/vector-icons';

// Common shape both Tailor Detail and Employee Detail adapt their real data
// into, so the shared hero/KYC/verification/orders/activity components below
// don't need to know which role they're rendering. Role-specific fields
// (specialization/rating for tailor, bridge_* for employee) stay OUTSIDE
// this shape and are rendered via each screen's own Overview/Performance
// tab content — only the truly identical chrome is unified here.
export interface StaffDetailIdentity {
  id: string;
  fullName?: string | null;
  subtitleLine: string;
  profileImageUrl?: string | null;
  isActive: boolean;
  /** null = this role has no verification concept (not shown at all). */
  verification: { isApproved: boolean } | null;
  /** Third badge line under the name, e.g. tailor's specialization/rating
   * or employee's bridge type/area. Omit for a plain two-badge hero. */
  factsLine?: string | null;
}

export type KycDocKey = 'aadhar' | 'pan_card' | 'other';

export const KYC_DOCS: { key: KycDocKey; label: string; urlField: 'aadhar_url' | 'pan_card_url' | 'other_doc_url' }[] = [
  { key: 'aadhar', label: 'Aadhaar', urlField: 'aadhar_url' },
  { key: 'pan_card', label: 'PAN Card', urlField: 'pan_card_url' },
  { key: 'other', label: 'Other Document', urlField: 'other_doc_url' },
];

export interface KycDocumentUrls {
  aadhar_url?: string | null;
  pan_card_url?: string | null;
  other_doc_url?: string | null;
}

export type TabIconName = keyof typeof Ionicons.glyphMap;
