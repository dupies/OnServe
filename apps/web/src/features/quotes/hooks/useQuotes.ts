import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  createQuoteRequest,
  getCustomerQuoteRequests,
  getQuoteRequestById,
  getProviderQuoteRequests,
  submitQuote,
  acceptQuote,
} from '../services/quoteService';
import type { QuoteRequestInput } from '@onserve/shared';

export function useCustomerQuoteRequests() {
  return useQuery({
    queryKey: ['quote-requests', 'customer'],
    queryFn: getCustomerQuoteRequests,
  });
}

export function useQuoteRequest(id: string | undefined) {
  return useQuery({
    queryKey: ['quote-request', id],
    queryFn: () => getQuoteRequestById(id!),
    enabled: !!id,
  });
}

export function useProviderQuoteRequests() {
  return useQuery({
    queryKey: ['quote-requests', 'provider'],
    queryFn: getProviderQuoteRequests,
  });
}

export function useCreateQuoteRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: QuoteRequestInput) => createQuoteRequest(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['quote-requests'] }),
  });
}

export function useSubmitQuote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      quoteRequestId,
      quotedPrice,
      estimatedDurationMins,
      notes,
    }: {
      quoteRequestId: string;
      quotedPrice: number;
      estimatedDurationMins: number | null;
      notes: string | null;
    }) => submitQuote(quoteRequestId, quotedPrice, estimatedDurationMins, notes),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['quote-requests'] }),
  });
}

export function useAcceptQuote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (quoteId: string) => acceptQuote(quoteId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['quote-requests'] }),
  });
}
