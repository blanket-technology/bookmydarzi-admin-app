// Mirrors app/schemas/home_admin.py. Banners/offers here are the actual
// distinct "homepage content" concept — categories/sub-categories are the
// same ServiceCategory/ServiceSubCategory tables the Catalog screen manages,
// so they're not duplicated here; manage them from Catalog instead.
export interface Banner {
  Id: string;
  Title: string;
  Subtitle?: string | null;
  ImageUrl?: string | null;
  RedirectUrl?: string | null;
  DisplayOrder: number;
  IsActive: boolean;
  ValidUntil?: string | null;
  CreatedAt: string;
}

export interface BannerCreateRequest {
  title: string;
  subtitle?: string;
  image_url?: string;
  redirect_url?: string;
  display_order?: number;
  valid_until?: string;
}

export type BannerUpdateRequest = Partial<BannerCreateRequest>;

export type DiscountType = 'percentage' | 'flat';

export interface Offer {
  Id: string;
  TailorId?: string | null;
  Title: string;
  Description?: string | null;
  DiscountType: DiscountType;
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
  discount_type?: DiscountType;
  discount_percent?: number;
  discount_amount?: number;
  coupon_code?: string;
  image_url?: string;
  tailor_id?: string;
  valid_from?: string;
  valid_until?: string;
}

export interface OfferUpdateRequest extends Partial<OfferCreateRequest> {
  is_active?: boolean;
}
