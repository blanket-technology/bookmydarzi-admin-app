/** Mirrors app/constants/backout_reason.py - must stay in sync. A plain
 * fixed list (not server-fetched), same convention as this app's other
 * small UI-driven constant lists. */

export type BackoutReasonCode = 'vehicle_breakdown' | 'weather_road_blocked' | 'cannot_reach_location' | 'other';

export const BACKOUT_REASON_CODES: BackoutReasonCode[] = [
  'vehicle_breakdown',
  'weather_road_blocked',
  'cannot_reach_location',
  'other',
];

/** i18n key suffix under backOutSheet.reasons.* for each code. */
export const BACKOUT_REASON_LABEL_KEYS: Record<BackoutReasonCode, string> = {
  vehicle_breakdown: 'vehicleBreakdown',
  weather_road_blocked: 'weatherRoadBlocked',
  cannot_reach_location: 'cannotReachLocation',
  other: 'other',
};
