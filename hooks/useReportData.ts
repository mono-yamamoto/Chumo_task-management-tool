'use client';

import { useQuery } from '@tanstack/react-query';
import type { ReportResponse } from '@/types/report';
import { getExportTimeReportCsvUrl, getTimeReportUrl } from '@/utils/functions';

type ReportTab = 'normal' | 'brg';

type UseReportDataOptions = {
  activeTab: ReportTab;
  fromDate: string;
  toDate: string;
};

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
  const { data, isLoading, error } = useQuery<ReportResponse>({
    queryKey: ['reports', activeTab, fromDate, toDate],
    queryFn: async () => {
      const { fromDateObj, toDateObj } = getValidatedDates(fromDate, toDate);

      const params = new globalThis.URLSearchParams({
        from: fromDateObj.toISOString(),
        to: toDateObj.toISOString(),
        type: activeTab,
      });

      const reportUrl = getTimeReportUrl();
      const response = await fetch(`${reportUrl}?${params}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          error: 'Unknown error',
          details: `HTTP ${response.status}: ${response.statusText}`,
        }));
        const errorMessage =
          errorData.error || `Failed to fetch report: ${response.status} ${response.statusText}`;
        const errorDetails = errorData.details ? `\n詳細: ${errorData.details}` : '';
        throw new Error(`${errorMessage}${errorDetails}`);
      }
      return response.json();
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

      const csvUrl = getExportTimeReportCsvUrl();
      const response = await fetch(`${csvUrl}?${params}`);
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
