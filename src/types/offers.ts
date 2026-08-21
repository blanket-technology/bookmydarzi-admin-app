// Mirrors app/schemas/home_admin.py's OfferListItem/OfferCreate/OfferUpdate.
export interface OfferItem {
  Id: number;
  TailorId?: number | null;
  Title: string;
  Description?: string | null;
  DiscountType: 'percentage' | 'flat';
  DiscountPercent: number;
  DiscountAmount?: number | null;
  CouponCode?: string | null;
  ImageUrl?: string | null;
  ValidFrom?: string | null;
  ValidUntil?: string | null;
  IsActive: boolean;
  CreatedAt: string;
}

export interface OfferCreateRequest {
  title: string;
  description?: string;
  discount_type: 'percentage' | 'flat';
  discount_percent?: number;
  discount_amount?: number;
  coupon_code?: string;
  image_url?: string;
  tailor_id?: number;
  valid_from?: string;
  valid_until?: string;
}

export interface OfferUpdateRequest {
  title?: string;
  description?: string;
  discount_type?: 'percentage' | 'flat';
  discount_percent?: number;
  discount_amount?: number;
  coupon_code?: string;
  image_url?: string;
  tailor_id?: number;
  valid_from?: string;
  valid_until?: string;
  is_active?: boolean;
}
