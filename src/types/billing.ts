// Mirrors app/services/config/billing_config.py's return shape and
// app/api/v1/endpoints/admin.py's BillingSettingsUpdate.
export interface BillingConfig {
  platform_fee: number;
  gst_rate: number;
  gst_percent: number;
}

export interface BillingSettingsUpdateRequest {
  platform_fee?: number;
  gst_percent?: number;
}
