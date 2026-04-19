import { useMutation } from '@tanstack/react-query';
import { apiClient } from '../lib/api';
import { useAuth } from './useAuth';

interface ExportCheckResponse {
  exists: boolean;
  folderId?: string;
}

interface ExportResponse {
  success: boolean;
  spreadsheetUrl: string;
}

interface ExportParams {
  year: number;
  month: number;
  overwrite?: boolean;
  folderId?: string;
}

export function useExportToSheets() {
  const { getToken } = useAuth();

  const checkExport = useMutation({
    mutationFn: (params: { year: number; month: number }) =>
      apiClient<ExportCheckResponse>('/api/reports/time/export-check', {
        method: 'POST',
        body: params,
        getToken,
      }),
  });

  const executeExport = useMutation({
    mutationFn: (params: ExportParams) =>
      apiClient<ExportResponse>('/api/reports/time/export', {
        method: 'POST',
        body: params,
        getToken,
      }),
  });

  return {
    checkExport,
    executeExport,
    isProcessing: checkExport.isPending || executeExport.isPending,
  };
}
