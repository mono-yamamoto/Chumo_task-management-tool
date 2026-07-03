import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api';
import { queryKeys } from '../lib/queryKeys';
import { useAuth } from './useAuth';
import type { ReportType } from '../types';

interface ReportItem {
  title: string;
  durationSec: number;
  over3hours?: string;
  taskId: string;
  projectType: string;
  currentUserUnrecorded: boolean;
}

interface ReportResponse {
  items: ReportItem[];
  totalDurationSec: number;
}

export type { ReportItem };

/**
 * レポートデータを取得
 * GET /api/reports/time?from=YYYY-MM-DD&to=YYYY-MM-DD&type=normal|brg|faq_imp
 */
export function useReportData(type: ReportType, fromDate: string, toDate: string, enabled = true) {
  const { getToken, isSignedIn } = useAuth();

  return useQuery({
    queryKey: queryKeys.reports(type, fromDate, toDate),
    queryFn: () =>
      apiClient<ReportResponse>(`/api/reports/time?from=${fromDate}&to=${toDate}&type=${type}`, {
        getToken,
      }),
    enabled: enabled && isSignedIn && !!fromDate && !!toDate,
  });
}

/**
 * レポートCSVをダウンロード
 */
export async function downloadReportCsv(
  type: ReportType,
  fromDate: string,
  toDate: string,
  getToken: () => Promise<string | null>
) {
  const token = await getToken();
  const url = `/api/reports/time/csv?from=${fromDate}&to=${toDate}&type=${type}`;

  const response = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!response.ok) {
    throw new Error(`CSV download failed: ${response.status}`);
  }

  const blob = await response.blob();
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = `report_${type}_${fromDate}_${toDate}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
}
