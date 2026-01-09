'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Box, Typography, TextField, Tabs, Tab, CircularProgress } from '@mui/material';
import { ReportTable } from '@/components/reports/ReportTable';
import { useReportData } from '@/hooks/useReportData';

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<'normal' | 'brg'>('normal');
  const [fromDate, setFromDate] = useState(() =>
    format(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd')
  );
  const [toDate, setToDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));

  const { reportData, isLoading, error, handleExportCSV } = useReportData({
    activeTab,
    fromDate,
    toDate,
  });

  const totalDurationSec = reportData?.totalDurationSec || 0;

  return (
    <Box>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 3,
        }}
      >
        <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
          レポート
        </Typography>
        <Button onClick={handleExportCSV}>CSVエクスポート</Button>
      </Box>

      <Box
        sx={{
          mb: 3,
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
        }}
      >
        <Box sx={{ display: 'flex', gap: 2 }}>
          <TextField
            label="開始日"
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ flex: 1 }}
          />
          <TextField
            label="終了日"
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ flex: 1 }}
          />
        </Box>

        <Tabs
          value={activeTab === 'normal' ? 0 : 1}
          onChange={(_, value) => {
            setActiveTab(value === 0 ? 'normal' : 'brg');
          }}
        >
          <Tab label="通常" />
          <Tab label="BRG" />
        </Tabs>
      </Box>

      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      )}
      {!isLoading && error && (
        <Box sx={{ p: 3, bgcolor: 'error.light', borderRadius: 1 }}>
          <Typography variant="h6" sx={{ color: 'error.main', mb: 1 }}>
            エラーが発生しました
          </Typography>
          <Typography variant="body2" sx={{ color: 'error.dark', mb: 2 }}>
            {error instanceof Error ? error.message : '不明なエラーが発生しました'}
          </Typography>
          {error instanceof Error && error.message.includes('詳細:') && (
            <Typography
              variant="body2"
              sx={{ color: 'error.dark', fontFamily: 'monospace', fontSize: '0.875rem', mt: 1 }}
            >
              {error.message.split('詳細:')[1]?.trim()}
            </Typography>
          )}
        </Box>
      )}
      {!isLoading && !error && (
        <ReportTable reportData={reportData} totalDurationSec={totalDurationSec} />
      )}
    </Box>
  );
}
