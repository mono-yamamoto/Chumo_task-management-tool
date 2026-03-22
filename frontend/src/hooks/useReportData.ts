import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api';
import { queryKeys } from '../lib/queryKeys';
import { useAuth } from './useAuth';

interface ReportItem {
  title: string;
  durationSec: number;
  over3hours?: string;
  taskId: string;
  projectType: string;
}

interface ReportResponse {
  items: ReportItem[];
  totalDurationSec: number;
}

export type { ReportItem };

/**
 * レポートデータを取得
 * GET /api/reports/time?from=YYYY-MM-DD&to=YYYY-MM-DD&type=normal|brg
 */
export function useReportData(type: 'normal' | 'brg', fromDate: string, toDate: string) {
  const { getToken, isSignedIn } = useAuth();

  return useQuery({
    queryKey: queryKeys.reports(type, fromDate, toDate),
    queryFn: () =>
      apiClient<ReportResponse>(`/api/reports/time?from=${fromDate}&to=${toDate}&type=${type}`, {
        getToken,
      }),
    enabled: isSignedIn && !!fromDate && !!toDate,
  });
}

/**
 * レポートCSVをダウンロード
 */
export async function downloadReportCsv(
  type: 'normal' | 'brg',
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
  URL.revokeObjectURL(blobUrl);
}
