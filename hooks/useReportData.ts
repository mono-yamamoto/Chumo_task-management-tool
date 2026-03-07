'use client';

import { useQuery } from '@tanstack/react-query';
import type { ReportResponse } from '@/types/report';
import { useAuth } from '@/hooks/useAuth';
import { apiClient } from '@/lib/http/apiClient';

type ReportTab = 'normal' | 'brg';

type UseReportDataOptions = {
  activeTab: ReportTab;
  fromDate: string;
  toDate: string;
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787';

const getValidatedDates = (fromDate: string, toDate: string) => {
  const fallbackFrom = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const fallbackTo = new Date();
  const fromDateObj = fromDate ? new Date(fromDate) : fallbackFrom;
  const toDateObj = toDate ? new Date(toDate) : fallbackTo;

  if (isNaN(fromDateObj.getTime()) || isNaN(toDateObj.getTime())) {
    throw new Error('無効な日付が指定されています');
  }

  return { fromDateObj, toDateObj };
};

const notify = (message: string) => {
  if (typeof window !== 'undefined') {
    window.alert(message);
  }
};

export function useReportData({ activeTab, fromDate, toDate }: UseReportDataOptions) {
  const { getToken } = useAuth();

  const { data, isLoading, error } = useQuery<ReportResponse>({
    queryKey: ['reports', activeTab, fromDate, toDate],
    queryFn: async () => {
      const { fromDateObj, toDateObj } = getValidatedDates(fromDate, toDate);

      const params = new globalThis.URLSearchParams({
        from: fromDateObj.toISOString(),
        to: toDateObj.toISOString(),
        type: activeTab,
      });

      return apiClient<ReportResponse>(`/api/reports/time?${params}`, { getToken });
    },
  });

  const handleExportCSV = async () => {
    try {
      const { fromDateObj, toDateObj } = getValidatedDates(fromDate, toDate);
      const params = new globalThis.URLSearchParams({
        from: fromDateObj.toISOString(),
        to: toDateObj.toISOString(),
        type: activeTab,
      });

      // CSV は blob で返ってくるので apiClient ではなく直接 fetch
      const token = await getToken();
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${API_BASE_URL}/api/reports/time/csv?${params}`, { headers });
      if (!response.ok) {
        notify('CSVのエクスポートに失敗しました');
        return;
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report_${activeTab}_${fromDate}_${toDate}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      if (err instanceof Error && err.message === '無効な日付が指定されています') {
        notify(err.message);
        return;
      }
      notify('CSVのエクスポートに失敗しました');
    }
  };

  return {
    reportData: data,
    isLoading,
    error,
    handleExportCSV,
  };
}
