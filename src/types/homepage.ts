// Mirrors app/schemas/home_admin.py. Banners here are the actual distinct
// "homepage content" concept — categories/sub-categories are the same
// ServiceCategory/ServiceSubCategory tables the Catalog screen manages, so
// they're not duplicated here; manage them from Catalog instead. Offer
// types live in types/offers.ts (the Offers & Coupons screen's own module)
// - this file used to duplicate them for a redundant homepage Offers tab
// that hit the identical backend endpoints; that tab is gone now.
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
