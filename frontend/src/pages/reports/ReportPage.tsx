import { useState, useMemo, useCallback } from 'react';
import { Header } from '../../components/layout/Header';
import { Tabs, TabList, Tab, TabPanel } from '../../components/ui/Tabs';
import { Modal } from '../../components/ui/Modal';
import { Spinner } from '../../components/ui/Spinner';
import { TaskDrawer } from '../../components/shared/TaskDrawer/TaskDrawer';
import { ReportDetailTab } from '../../components/shared/ReportDrawer/ReportDetailTab';
import { ReportToolbar } from './components/ReportToolbar';
import { DateRangeRow } from './components/DateRangeRow';
import { SummaryRow } from './components/SummaryRow';
import { ReportTable } from './components/ReportTable';
import { ExportModalContent } from './components/ExportModalContent';
import { SessionEditModalContent } from './components/SessionEditModalContent';
import { useReportData, downloadReportCsv } from '../../hooks/useReportData';
import { useAuth } from '../../hooks/useAuth';
import type { ReportEntry, ReportType, TaskSession } from '../../types';

function getLastDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function formatDateSlash(year: number, month: number, day: number): string {
  return `${year}/${String(month).padStart(2, '0')}/${String(day).padStart(2, '0')}`;
}

function formatDateISO(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function ReportPage() {
  const { getToken } = useAuth();

  // 月ナビ状態
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  // タブ状態
  const [activeTab, setActiveTab] = useState<ReportType | 'all'>('all');

  // エクスポート状態
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportRange, setExportRange] = useState<'all' | 'normal' | 'brg'>('all');

  // セッション編集
  const [editingSession, setEditingSession] = useState<{
    entry: ReportEntry;
    session: TaskSession;
  } | null>(null);

  // ドロワー状態
  const [selectedEntry, setSelectedEntry] = useState<ReportEntry | null>(null);

  // API用の日付
  const fromDate = formatDateISO(year, month, 1);
  const toDate = formatDateISO(year, month, getLastDayOfMonth(year, month));

  // レポートデータ取得
  const reportType = activeTab === 'all' ? 'normal' : activeTab;
  const { data, isLoading, error } = useReportData(reportType, fromDate, toDate);

  const totalDurationSec = data?.totalDurationSec ?? 0;

  // API ReportItem → フロント ReportEntry にマッピング（メモ化）
  const entries = useMemo<ReportEntry[]>(
    () =>
      (data?.items ?? []).map((item) => ({
        id: item.taskId,
        taskId: item.taskId,
        title: item.title,
        type: reportType,
        totalDurationSec: item.durationSec,
        over3Reason: item.over3hours,
        sessions: [],
        date: new Date(year, month - 1, 1),
      })),
    [data?.items, reportType, year, month]
  );

  // 表示用日付
  const startDate = formatDateSlash(year, month, 1);
  const endDate = formatDateSlash(year, month, getLastDayOfMonth(year, month));

  // ハンドラ
  const handlePrevMonth = useCallback(() => {
    setMonth((prev) => {
      if (prev === 1) {
        setYear((y) => y - 1);
        return 12;
      }
      return prev - 1;
    });
  }, []);

  const handleNextMonth = useCallback(() => {
    setMonth((prev) => {
      if (prev === 12) {
        setYear((y) => y + 1);
        return 1;
      }
      return prev + 1;
    });
  }, []);

  const handleRowClick = (entry: ReportEntry) => {
    setSelectedEntry(entry);
  };

  const handleEditSession = (entry: ReportEntry, session: TaskSession) => {
    setEditingSession({ entry, session });
  };

  const handleTabChange = (key: React.Key) => {
    setActiveTab(key as ReportType | 'all');
  };

  const handleExport = useCallback(async () => {
    const csvType = exportRange === 'all' ? 'normal' : exportRange;
    await downloadReportCsv(csvType, fromDate, toDate, getToken);
    setIsExportModalOpen(false);
  }, [exportRange, fromDate, toDate, getToken]);

  return (
    <>
      <Header title="レポート" />

      <div className="flex-1 overflow-y-auto p-8 space-y-6">
        <ReportToolbar
          year={year}
          month={month}
          onPrevMonth={handlePrevMonth}
          onNextMonth={handleNextMonth}
          onExport={() => setIsExportModalOpen(true)}
        />

        <DateRangeRow startDate={startDate} endDate={endDate} />

        <Tabs selectedKey={activeTab} onSelectionChange={handleTabChange}>
          <TabList>
            <Tab id="all">通常</Tab>
            <Tab id="brg">BRG</Tab>
          </TabList>

          <div className="mt-6 space-y-6">
            <SummaryRow totalDurationSec={totalDurationSec} entryCount={entries.length} />

            {isLoading ? (
              <div className="flex justify-center py-12">
                <Spinner size="lg" />
              </div>
            ) : error ? (
              <div className="rounded-lg border border-error-border bg-error-bg p-4 text-sm text-error-text">
                レポートの取得に失敗しました: {error.message}
              </div>
            ) : (
              <>
                <TabPanel id="all">
                  <ReportTable entries={entries} onRowClick={handleRowClick} />
                </TabPanel>
                <TabPanel id="brg">
                  <ReportTable entries={entries} onRowClick={handleRowClick} />
                </TabPanel>
              </>
            )}
          </div>
        </Tabs>
      </div>

      <TaskDrawer
        isOpen={selectedEntry != null}
        title={selectedEntry?.title ?? ''}
        onClose={() => setSelectedEntry(null)}
        detailTabLabel="レポート詳細"
        detailPadding={false}
        detailContent={
          selectedEntry ? (
            <ReportDetailTab entry={selectedEntry} onEditSession={handleEditSession} />
          ) : null
        }
      />

      <Modal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        title="スプレッドシートに出力"
        footer={
          <ExportModalContent.Footer
            onCancel={() => setIsExportModalOpen(false)}
            onExport={handleExport}
          />
        }
      >
        <ExportModalContent range={exportRange} onRangeChange={setExportRange} />
      </Modal>

      <Modal
        isOpen={editingSession != null}
        onClose={() => setEditingSession(null)}
        title="セッション時間の編集"
        footer={<SessionEditModalContent.Footer onCancel={() => setEditingSession(null)} />}
      >
        {editingSession && <SessionEditModalContent session={editingSession.session} />}
      </Modal>
    </>
  );
}
