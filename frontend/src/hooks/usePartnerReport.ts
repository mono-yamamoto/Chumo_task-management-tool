import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api';
import { queryKeys } from '../lib/queryKeys';
import { useAuth } from './useAuth';

export interface PartnerReportTask {
  taskId: string;
  title: string;
  projectType: string;
  durationSec: number;
}

export interface PartnerReportItem {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  avatarColor: string | null;
  totalDurationSec: number;
  tasks: PartnerReportTask[];
}

interface PartnerReportResponse {
  partners: PartnerReportItem[];
  grandTotalDurationSec: number;
}

/**
 * パートナー稼働時間レポートを取得
 * GET /api/reports/time/partners?from=YYYY-MM-DD&to=YYYY-MM-DD
 */
export function usePartnerReport(fromDate: string, toDate: string, enabled = true) {
  const { getToken, isSignedIn } = useAuth();

  return useQuery({
    queryKey: queryKeys.partnerReport(fromDate, toDate),
    queryFn: () =>
      apiClient<PartnerReportResponse>(`/api/reports/time/partners?from=${fromDate}&to=${toDate}`, {
        getToken,
      }),
    enabled: enabled && isSignedIn && !!fromDate && !!toDate,
  });
}
