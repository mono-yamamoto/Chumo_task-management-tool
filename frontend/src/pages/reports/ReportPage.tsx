import { useState, useMemo, useCallback } from 'react';
import { Header } from '../../components/layout/Header';
import { Tabs, TabList, Tab, TabPanel } from '../../components/ui/Tabs';
import { Modal } from '../../components/ui/Modal';
import { TaskDrawer } from '../../components/shared/TaskDrawer/TaskDrawer';
import { ReportDetailTab } from '../../components/shared/ReportDrawer/ReportDetailTab';
import { ReportToolbar } from './components/ReportToolbar';
import { DateRangeRow } from './components/DateRangeRow';
import { SummaryRow } from './components/SummaryRow';
import { ReportTable } from './components/ReportTable';
import { ExportModalContent } from './components/ExportModalContent';
import { SessionEditModalContent } from './components/SessionEditModalContent';
import { getReportEntries } from '../../lib/mockData';
import type { ReportEntry, ReportType, TaskSession } from '../../types';

function getLastDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function formatDateSlash(year: number, month: number, day: number): string {
  return `${year}/${String(month).padStart(2, '0')}/${String(day).padStart(2, '0')}`;
}

export function ReportPage() {
  // 月ナビ状態
  const [year, setYear] = useState(2026);
  const [month, setMonth] = useState(1);

  // タブ状態
  const [activeTab, setActiveTab] = useState<ReportType | 'all'>('all');

  // モーダル状態
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<{
    entry: ReportEntry;
    session: TaskSession;
  } | null>(null);

  // ドロワー状態
  const [selectedEntry, setSelectedEntry] = useState<ReportEntry | null>(null);

  // レポートデータ
  const entries = useMemo(() => {
    const type = activeTab === 'all' ? undefined : activeTab;
    return getReportEntries(type);
  }, [activeTab]);

  const totalDurationSec = useMemo(
    () => entries.reduce((sum, e) => sum + e.totalDurationSec, 0),
    [entries]
  );

  // 日付範囲
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

            <TabPanel id="all">
              <ReportTable entries={entries} onRowClick={handleRowClick} />
            </TabPanel>
            <TabPanel id="brg">
              <ReportTable entries={entries} onRowClick={handleRowClick} />
            </TabPanel>
          </div>
        </Tabs>
      </div>

      {/* 共通ドロワー（レポート詳細タブを差し込み） */}
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
        footer={<ExportModalContent.Footer onCancel={() => setIsExportModalOpen(false)} />}
      >
        <ExportModalContent />
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
