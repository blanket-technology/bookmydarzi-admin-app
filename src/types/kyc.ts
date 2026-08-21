// Mirrors app/api/v1/endpoints/tailors.py's get_my_kyc_status /
// app/api/v1/endpoints/employee.py's get_my_kyc_status inline response
// shapes (this subsystem has no dedicated Pydantic schema, same pattern as
// the admin-side KYC upload/delete routes it mirrors).
export type KycDocumentType = 'aadhar' | 'pan_card' | 'other';

export interface KycStatus {
  aadhaar_url: string | null;
  pan_card_url: string | null;
  other_doc_url: string | null;
  is_approved: boolean;
}

export interface KycUploadResponse {
  document_type: KycDocumentType;
  url: string;
}
