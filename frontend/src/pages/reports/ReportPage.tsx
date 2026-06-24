import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../../components/layout/Header';
import { Tabs, TabList, Tab, TabPanel } from '../../components/ui/Tabs';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Spinner } from '../../components/ui/Spinner';
import { TaskDrawer } from '../../components/shared/TaskDrawer/TaskDrawer';
import { ReportDetailTab } from '../../components/shared/ReportDrawer/ReportDetailTab';
import { ReportToolbar } from './components/ReportToolbar';
import { DateRangeRow } from './components/DateRangeRow';
import { SummaryRow } from './components/SummaryRow';
import { ReportTable } from './components/ReportTable';
import { PartnerReportList } from './components/PartnerReportList';
import { SessionEditModalContent } from './components/SessionEditModalContent';
import { useReportData } from '../../hooks/useReportData';
import { usePartnerReport } from '../../hooks/usePartnerReport';
import { useExportToSheets } from '../../hooks/useExportToSheets';
import { useToast } from '../../hooks/useToast';
import { HttpError } from '../../lib/api';
import type { ReportEntry, ReportType, TaskSession } from '../../types';

type ReportTabId = ReportType | 'all' | 'partner';

const REPORT_TABS: { id: ReportTabId; label: string }[] = [
  { id: 'all', label: '通常' },
  { id: 'brg', label: 'BRG' },
  { id: 'faq_imp', label: 'FAQ_IMP' },
  { id: 'partner', label: 'パートナー' },
];

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
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { checkExport, executeExport, isProcessing } = useExportToSheets();

  // 月ナビ状態
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  // タブ状態
  const [activeTab, setActiveTab] = useState<ReportTabId>('all');
  const isPartnerTab = activeTab === 'partner';

  // 上書き確認モーダル
  const [showOverwriteConfirm, setShowOverwriteConfirm] = useState(false);
  const [existingFolderId, setExistingFolderId] = useState<string | undefined>();

  // 日付範囲の表示
  const [showDateRange, setShowDateRange] = useState(false);

  // セッション編集
  const [editingSession, setEditingSession] = useState<{
    entry: ReportEntry;
    session: TaskSession;
  } | null>(null);

  // ドロワー状態（kind は今後の編集権限制御等の拡張用に保持）
  const [selectedTask, setSelectedTask] = useState<{
    kind: 'report' | 'partner';
    entry: ReportEntry;
  } | null>(null);

  const selectedEntry = selectedTask?.entry ?? null;
  const selectedTaskId = selectedEntry?.taskId ?? null;

  // API用の日付
  const fromDate = formatDateISO(year, month, 1);
  const toDate = formatDateISO(year, month, getLastDayOfMonth(year, month));

  // レポートデータ取得（パートナータブ以外）
  const reportType: ReportType =
    activeTab === 'partner' || activeTab === 'all' ? 'normal' : activeTab;
  const {
    data,
    isLoading: isTaskReportLoading,
    error: taskReportError,
  } = useReportData(reportType, fromDate, toDate, !isPartnerTab);

  // パートナー稼働時間レポート取得
  const {
    data: partnerData,
    isLoading: isPartnerLoading,
    error: partnerError,
  } = usePartnerReport(fromDate, toDate, isPartnerTab);

  const isLoading = isPartnerTab ? isPartnerLoading : isTaskReportLoading;
  const error = isPartnerTab ? partnerError : taskReportError;
  const totalDurationSec = isPartnerTab
    ? (partnerData?.grandTotalDurationSec ?? 0)
    : (data?.totalDurationSec ?? 0);

  // API ReportItem → フロント ReportEntry にマッピング（メモ化）
  const entries = useMemo<ReportEntry[]>(
    () =>
      (data?.items ?? []).map((item) => ({
        id: item.taskId,
        taskId: item.taskId,
        title: item.title,
        type: reportType,
        projectType: item.projectType,
        totalDurationSec: item.durationSec,
        over3Reason: item.over3hours,
        sessions: [],
        date: new Date(year, month - 1, 1),
        currentUserUnrecorded: item.currentUserUnrecorded,
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

  const handleStartDateChange = useCallback((dateStr: string) => {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      setYear(d.getFullYear());
      setMonth(d.getMonth() + 1);
    }
  }, []);

  const handleEndDateChange = useCallback((dateStr: string) => {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      setYear(d.getFullYear());
      setMonth(d.getMonth() + 1);
    }
  }, []);

  const handleRowClick = (entry: ReportEntry) => {
    setSelectedTask({ kind: 'report', entry });
  };

  const handleEditSession = (entry: ReportEntry, session: TaskSession) => {
    setEditingSession({ entry, session });
  };

  const handleTabChange = (key: React.Key) => {
    setActiveTab(key as ReportTabId);
  };

  const handlePartnerTaskClick = (taskId: string) => {
    // partnerデータから該当タスクを引いてReportEntry形式に変換し、ReportDetailTabで詳細を出す
    const task = partnerData?.partners.flatMap((p) => p.tasks).find((t) => t.taskId === taskId);
    if (!task) return;

    setSelectedTask({
      kind: 'partner',
      entry: {
        id: taskId,
        taskId,
        title: task.title,
        type: 'normal',
        projectType: task.projectType,
        totalDurationSec: task.durationSec,
        sessions: [],
        date: new Date(year, month - 1, 1),
        currentUserUnrecorded: false,
      },
    });
  };

  const handleExportError = useCallback(
    (error: Error) => {
      if (error instanceof HttpError && error.details?.requiresAuth) {
        addToast('Google Drive認証が必要です。設定ページへ移動します。', 'warning');
        navigate('/settings?tab=integrations');
      } else {
        addToast(error.message || 'スプレッドシートの出力に失敗しました', 'error');
      }
    },
    [addToast, navigate]
  );

  const handleExport = useCallback(() => {
    checkExport.mutate(
      { year, month },
      {
        onSuccess: (data) => {
          if (data.exists) {
            setExistingFolderId(data.folderId);
            setShowOverwriteConfirm(true);
          } else {
            // フォルダが無いので即出力
            executeExport.mutate(
              { year, month },
              {
                onSuccess: (res) => {
                  addToast('スプレッドシートを作成しました', 'success');
                  window.open(res.spreadsheetUrl, '_blank');
                },
                onError: handleExportError,
              }
            );
          }
        },
        onError: handleExportError,
      }
    );
  }, [year, month, checkExport, executeExport, addToast, handleExportError]);

  const handleOverwriteConfirm = useCallback(() => {
    setShowOverwriteConfirm(false);
    executeExport.mutate(
      { year, month, overwrite: true, folderId: existingFolderId },
      {
        onSuccess: (res) => {
          addToast('スプレッドシートを上書きしました', 'success');
          window.open(res.spreadsheetUrl, '_blank');
        },
        onError: handleExportError,
      }
    );
  }, [year, month, existingFolderId, executeExport, addToast, handleExportError]);

  return (
    <>
      <Header title="レポート" />

      <div className="flex-1 overflow-y-auto p-8 space-y-6">
        <ReportToolbar
          year={year}
          month={month}
          onPrevMonth={handlePrevMonth}
          onNextMonth={handleNextMonth}
          onExport={handleExport}
          isExporting={isProcessing}
          showDateRange={showDateRange}
          onToggleDateRange={() => setShowDateRange((v) => !v)}
          isExportDisabled={isPartnerTab}
        />

        {showDateRange && (
          <DateRangeRow
            startDate={startDate}
            endDate={endDate}
            onStartDateChange={handleStartDateChange}
            onEndDateChange={handleEndDateChange}
          />
        )}

        <Tabs selectedKey={activeTab} onSelectionChange={handleTabChange}>
          <TabList>
            {REPORT_TABS.map((t) => (
              <Tab key={t.id} id={t.id}>
                {t.label}
              </Tab>
            ))}
          </TabList>

          <div className="mt-6 space-y-6">
            <SummaryRow
              totalDurationSec={totalDurationSec}
              entryCount={isPartnerTab ? (partnerData?.partners.length ?? 0) : entries.length}
              countUnit={isPartnerTab ? '人' : '件'}
            />

            {!isPartnerTab && entries.some((e) => e.currentUserUnrecorded) && (
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center rounded-full bg-error-bg px-3 py-1 text-xs font-medium text-error-text">
                  セッション未記録
                </span>
              </div>
            )}

            {isLoading ? (
              <div className="flex justify-center py-12">
                <Spinner size="lg" />
              </div>
            ) : error ? (
              <div className="rounded-lg border border-error-border bg-error-bg p-4 text-sm text-error-text">
                レポートの取得に失敗しました: {error.message}
              </div>
            ) : (
              REPORT_TABS.map((t) => (
                <TabPanel key={t.id} id={t.id}>
                  {t.id === 'partner' ? (
                    <PartnerReportList
                      partners={partnerData?.partners ?? []}
                      onTaskClick={handlePartnerTaskClick}
                    />
                  ) : (
                    <ReportTable entries={entries} onRowClick={handleRowClick} />
                  )}
                </TabPanel>
              ))
            )}
          </div>
        </Tabs>
      </div>

      <TaskDrawer
        taskId={selectedTaskId}
        onClose={() => setSelectedTask(null)}
        detailTabLabel="レポート詳細"
        detailPadding={false}
        detailContent={
          selectedEntry ? (
            <ReportDetailTab entry={selectedEntry} onEditSession={handleEditSession} />
          ) : undefined
        }
      />

      <Modal
        isOpen={showOverwriteConfirm}
        onClose={() => setShowOverwriteConfirm(false)}
        title="上書き確認"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="outline" size="sm" onPress={() => setShowOverwriteConfirm(false)}>
              キャンセル
            </Button>
            <Button variant="primary" size="sm" onPress={handleOverwriteConfirm}>
              上書き
            </Button>
          </div>
        }
      >
        <p className="text-sm text-text-primary">
          {month}月のデータが既に存在します。上書きしますか？
        </p>
      </Modal>

      <Modal
        isOpen={editingSession != null}
        onClose={() => setEditingSession(null)}
        title="セッション時間の編集"
      >
        {editingSession && (
          <SessionEditModalContent
            session={editingSession.session}
            onCancel={() => setEditingSession(null)}
            onSaved={() => setEditingSession(null)}
          />
        )}
      </Modal>
    </>
  );
}
