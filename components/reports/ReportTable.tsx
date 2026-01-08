'use client';

import Link from 'next/link';
import { Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';
import type { ReportResponse } from '@/types/report';
import { formatDuration } from '@/utils/timer';

type ReportTableProps = {
  reportData: ReportResponse | undefined;
  totalDurationSec: number;
};

export function ReportTable({ reportData, totalDurationSec }: ReportTableProps) {
  return (
    <Box>
      <TableContainer component={Paper} sx={{ mb: 2 }}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: 'grey.50' }}>
              <TableCell>タイトル</TableCell>
              <TableCell>時間</TableCell>
              <TableCell>3時間超過理由</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {reportData?.items && reportData.items.length > 0 ? (
              reportData.items.map((item, index) => {
                const hasTaskId = item.taskId && typeof item.taskId === 'string' && item.taskId.trim() !== '';
                return (
                  <TableRow key={item.taskId || item.title || `item-${index}`}>
                    <TableCell>
                      {hasTaskId ? (
                        <Link
                          href={`/tasks/${item.taskId}`}
                          style={{
                            color: 'inherit',
                            textDecoration: 'none',
                          }}
                        >
                          <Typography
                            component="span"
                            sx={{
                              cursor: 'pointer',
                              '&:hover': {
                                textDecoration: 'underline',
                                color: 'primary.main',
                              },
                            }}
                          >
                            {item.title}
                          </Typography>
                        </Link>
                      ) : (
                        <Box>
                          {item.title}
                          {process.env.NODE_ENV === 'development' && (
                            <Typography variant="caption" sx={{ color: 'error.main', ml: 1 }}>
                              (taskIdなし)
                            </Typography>
                          )}
                        </Box>
                      )}
                    </TableCell>
                    <TableCell>{formatDuration(item.durationSec || 0)}</TableCell>
                    <TableCell>{item.over3hours || '-'}</TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={3} sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    該当するデータがありません
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <Box
        sx={{
          borderTop: 1,
          borderColor: 'divider',
          pt: 2,
          textAlign: 'right',
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 'semibold' }}>
          合計時間: {formatDuration(totalDurationSec)}
        </Typography>
      </Box>
    </Box>
  );
}
