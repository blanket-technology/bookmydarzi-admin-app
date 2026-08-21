// Mirrors app/schemas/support.py's FAQResponse/FAQCreateSchema/FAQUpdateSchema.
export interface FaqItem {
  id: number;
  question: string;
  answer: string;
  category: string;
  sort_order: number;
  is_active: boolean;
}

export interface FaqListResponse {
  faqs: FaqItem[];
  total: number;
}

export interface FaqCreateRequest {
  question: string;
  answer: string;
  category?: string;
  sort_order?: number;
  is_active?: boolean;
}

export interface FaqUpdateRequest {
  question?: string;
  answer?: string;
  category?: string;
  sort_order?: number;
  is_active?: boolean;
}
