import apiClient from '@/config/axios';
import { ENDPOINTS } from '@/services/endpoints';
import type {
  AdminCashBalanceSummary,
  AdminCashSettlement,
  CashBalance,
  CashLedgerEntry,
  CashSettlement,
  CashSettlementSubmitRequest,
} from '@/types/cashSettlement';

export const cashSettlementService = {
  // Employee self-service
  myBalance: async (): Promise<CashBalance> => {
    const { data } = await apiClient.get<CashBalance>(ENDPOINTS.EMPLOYEE.CASH_BALANCE);
    return data;
  },

  myLedger: async (): Promise<CashLedgerEntry[]> => {
    const { data } = await apiClient.get<CashLedgerEntry[]>(ENDPOINTS.EMPLOYEE.CASH_LEDGER);
    return data;
  },

  mySettlements: async (): Promise<CashSettlement[]> => {
    const { data } = await apiClient.get<CashSettlement[]>(ENDPOINTS.EMPLOYEE.CASH_SETTLEMENTS);
    return data;
  },

  submitSettlement: async (payload: CashSettlementSubmitRequest): Promise<CashSettlement> => {
    const { data } = await apiClient.post<CashSettlement>(ENDPOINTS.EMPLOYEE.CASH_SETTLEMENTS, payload);
    return data;
  },

  uploadSettlementProof: async (
    settlementId: string,
    file: { uri: string; fileName?: string; mimeType?: string },
  ): Promise<CashSettlement> => {
    const form = new FormData();
    // React Native FormData file shape - same pattern as offersService.uploadImage.
    form.append('file', {
      uri: file.uri,
      name: file.fileName ?? 'settlement_proof.jpg',
      type: file.mimeType ?? 'image/jpeg',
    } as unknown as Blob);
    const { data } = await apiClient.post<CashSettlement>(
      ENDPOINTS.EMPLOYEE.CASH_SETTLEMENT_PROOF(settlementId),
      form,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return data;
  },

  // Admin
  adminBalances: async (): Promise<AdminCashBalanceSummary[]> => {
    const { data } = await apiClient.get<AdminCashBalanceSummary[]>(ENDPOINTS.ADMIN.CASH_BALANCES);
    return data;
  },

  adminListSettlements: async (status?: string): Promise<AdminCashSettlement[]> => {
    const { data } = await apiClient.get<AdminCashSettlement[]>(ENDPOINTS.ADMIN.CASH_SETTLEMENTS, {
      params: status ? { status } : undefined,
    });
    return data;
  },

  adminConfirmSettlement: async (settlementId: string, note?: string): Promise<AdminCashSettlement> => {
    const { data } = await apiClient.patch<AdminCashSettlement>(
      ENDPOINTS.ADMIN.CASH_SETTLEMENT_CONFIRM(settlementId),
      { note },
    );
    return data;
  },

  adminRejectSettlement: async (settlementId: string, reason: string): Promise<AdminCashSettlement> => {
    const { data } = await apiClient.patch<AdminCashSettlement>(
      ENDPOINTS.ADMIN.CASH_SETTLEMENT_REJECT(settlementId),
      { reason },
    );
    return data;
  },

  getCashCap: async (): Promise<{ cap: number }> => {
    const { data } = await apiClient.get<{ cap: number }>(ENDPOINTS.ADMIN.CASH_CAP);
    return data;
  },

  updateCashCap: async (cap: number): Promise<{ cap: number }> => {
    const { data } = await apiClient.patch<{ cap: number }>(ENDPOINTS.ADMIN.CASH_CAP, { cap });
    return data;
  },
};
