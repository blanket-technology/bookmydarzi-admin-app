// Which measurement fields to collect, driven by garment type + gender.
//
// The order object exposed to bmdadmin only carries `service_name` /
// `category_name` display strings, not the catalog's numeric ServiceId, so
// this can't call the backend's per-service measurement-template endpoint
// (GET /catalog/services/{id}/measurement-template) the way the customer app
// used to. Instead this is a small, self-contained garment-type map: it
// inspects the order's service/category name for known garment keywords and
// returns the field set a Bridge/employee or Admin should fill for that
// garment + gender. Unknown garments fall back to a sensible general set.
//
// Field keys match EmployeeOrderMeasurementRequest / AdminOrderMeasurementRequest
// (both ultimately map onto UserMeasurement columns - see backend
// app/schemas/employee_order.py EmployeeMeasurementRequest).

export type MeasurementGender = 'male' | 'female' | 'unisex';

export interface MeasurementFieldDef {
  key:
    | 'chest'
    | 'waist'
    | 'hips'
    | 'shoulder'
    | 'neck'
    | 'sleeve_length'
    | 'inseam'
    | 'height';
  label: string;
}

const ALL_FIELDS: Record<MeasurementFieldDef['key'], MeasurementFieldDef> = {
  chest: { key: 'chest', label: 'Chest (in)' },
  waist: { key: 'waist', label: 'Waist (in)' },
  hips: { key: 'hips', label: 'Hips (in)' },
  shoulder: { key: 'shoulder', label: 'Shoulder (in)' },
  neck: { key: 'neck', label: 'Neck (in)' },
  sleeve_length: { key: 'sleeve_length', label: 'Sleeve Length (in)' },
  inseam: { key: 'inseam', label: 'Inseam (in)' },
  height: { key: 'height', label: 'Height (in)' },
};

// Garment keyword -> field key set, per gender. Matched against the order's
// service_name/category_name (lowercased, substring match). Ordered
// most-specific first so e.g. "blouse" matches before a generic "top".
const GARMENT_RULES: { keywords: string[]; male?: MeasurementFieldDef['key'][]; female?: MeasurementFieldDef['key'][]; unisex?: MeasurementFieldDef['key'][] }[] = [
  {
    keywords: ['shirt', 'kurta', 'jacket', 'blazer', 'coat', 'sherwani'],
    male: ['chest', 'shoulder', 'neck', 'sleeve_length', 'height'],
    unisex: ['chest', 'shoulder', 'neck', 'sleeve_length', 'height'],
  },
  {
    keywords: ['pant', 'trouser', 'jeans', 'bottom'],
    male: ['waist', 'hips', 'inseam', 'height'],
    unisex: ['waist', 'hips', 'inseam', 'height'],
  },
  {
    keywords: ['suit', '3-piece', '2-piece'],
    male: ['chest', 'waist', 'hips', 'shoulder', 'neck', 'sleeve_length', 'inseam', 'height'],
  },
  {
    keywords: ['blouse'],
    female: ['chest', 'waist', 'shoulder', 'sleeve_length', 'height'],
  },
  {
    keywords: ['saree', 'sari', 'petticoat'],
    female: ['waist', 'hips', 'height'],
  },
  {
    keywords: ['lehenga', 'gown', 'dress'],
    female: ['chest', 'waist', 'hips', 'shoulder', 'height'],
  },
  {
    keywords: ['salwar', 'kameez', 'churidar', 'anarkali'],
    female: ['chest', 'waist', 'hips', 'shoulder', 'sleeve_length', 'height'],
  },
];

// General fallback when no garment keyword matches - broad enough to cover
// most stitching services without over-collecting.
const FALLBACK_FIELDS: MeasurementFieldDef['key'][] = [
  'chest', 'waist', 'hips', 'shoulder', 'height',
];

export function resolveMeasurementFields(
  serviceLabel: string | undefined,
  gender: MeasurementGender,
): MeasurementFieldDef[] {
  const haystack = (serviceLabel ?? '').toLowerCase();
  for (const rule of GARMENT_RULES) {
    if (rule.keywords.some((kw) => haystack.includes(kw))) {
      const keys = rule[gender] ?? rule.unisex ?? rule.male ?? rule.female;
      if (keys) return keys.map((k) => ALL_FIELDS[k]);
    }
  }
  return FALLBACK_FIELDS.map((k) => ALL_FIELDS[k]);
}
