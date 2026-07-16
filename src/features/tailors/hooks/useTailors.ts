import { useQuery } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/constants/queryKeys';
import { tailorService } from '@/services/tailorService';

export const useTailors = (params?: { search?: string }, enabled = true) =>
  useQuery({
    queryKey: QUERY_KEYS.TAILORS(params),
    queryFn: () => tailorService.getTailors(params),
    enabled,
  });

export const useTailorWorkload = (enabled = true) =>
  useQuery({
    queryKey: QUERY_KEYS.TAILOR_WORKLOAD,
    queryFn: () => tailorService.getTailorWorkload(),
    enabled,
  });

export const useTailor = (tailorId: string) =>
  useQuery({
    queryKey: ['tailor', tailorId],
    queryFn: () => tailorService.getTailor(tailorId),
    enabled: !!tailorId,
  });
