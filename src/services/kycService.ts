import apiClient from '@/config/axios';
import { ENDPOINTS } from '@/services/endpoints';
import type { KycDocumentType, KycStatus, KycUploadResponse } from '@/types/kyc';

// One shared client for both self-service KYC endpoint families - identical
// request/response shapes (app/services/staff/kyc_self_service.py backs
// both app/api/v1/endpoints/tailors.py's and employee.py's /me/kyc routes),
// only the base path differs by role.
const basePathFor = (role: 'tailor' | 'employee') =>
  role === 'tailor' ? ENDPOINTS.TAILOR.MY_KYC : ENDPOINTS.EMPLOYEE.MY_KYC;

export const kycService = {
  getStatus: async (role: 'tailor' | 'employee'): Promise<KycStatus> => {
    const { data } = await apiClient.get<KycStatus>(basePathFor(role));
    return data;
  },

  upload: async (
    role: 'tailor' | 'employee',
    documentType: KycDocumentType,
    file: { uri: string; fileName?: string; mimeType?: string },
  ): Promise<KycUploadResponse> => {
    const formData = new FormData();
    formData.append('document_type', documentType);
    formData.append('file', {
      uri: file.uri,
      name: file.fileName ?? `${documentType}.jpg`,
      type: file.mimeType ?? 'image/jpeg',
    } as unknown as Blob);
    const { data } = await apiClient.post<KycUploadResponse>(basePathFor(role), formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  delete: async (role: 'tailor' | 'employee', documentType: KycDocumentType) => {
    const { data } = await apiClient.delete(basePathFor(role), { params: { document_type: documentType } });
    return data;
  },
};
