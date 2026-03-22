import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api';
import { queryKeys } from '../lib/queryKeys';
import { useAuth } from './useAuth';
import type { Contact } from '../types';

interface ContactsResponse {
  contacts: Contact[];
}

/**
 * お問い合わせ一覧を取得
 * GET /api/contact?status=pending|resolved
 */
export function useContacts(status: 'pending' | 'resolved') {
  const { getToken, isSignedIn } = useAuth();

  return useQuery({
    queryKey: queryKeys.contacts(status),
    queryFn: () =>
      apiClient<ContactsResponse>(`/api/contact?status=${status}`, { getToken }).then(
        (res) => res.contacts
      ),
    enabled: isSignedIn,
  });
}

/**
 * お問い合わせ作成
 * POST /api/contact
 */
export function useCreateContact() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      type: string;
      title: string;
      content?: string;
      userName: string;
      userEmail: string;
      errorReportDetails?: {
        issue: string;
        reproductionSteps: string;
        environment: {
          device: string;
          os: string;
          browser: string;
          osVersion?: string;
          browserVersion: string;
        };
        screenshotUrl?: string;
      };
    }) =>
      apiClient<{ id: string }>('/api/contact', {
        method: 'POST',
        body: data,
        getToken,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.contacts() });
    },
  });
}

/**
 * お問い合わせステータス更新
 * PUT /api/contact/:id
 */
export function useUpdateContactStatus() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ contactId, status }: { contactId: string; status: 'pending' | 'resolved' }) =>
      apiClient<{ success: boolean }>(`/api/contact/${contactId}`, {
        method: 'PUT',
        body: { status },
        getToken,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.contacts() });
    },
  });
}
