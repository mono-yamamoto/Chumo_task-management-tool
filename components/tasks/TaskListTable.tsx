'use client';

import { useMemo, useState } from 'react';
import { Task, Label, User } from '@/types';
import { FLOW_STATUS_LABELS } from '@/constants/taskConstants';
import { Badge } from '@/components/ui/badge';
import { UnreadBadge } from '@/components/ui/UnreadBadge';
import { ProgressStatusBadge } from '@/components/ui/ProgressStatusBadge';
import { TaskTimerButton } from '@/components/tasks/TaskTimerButton';
import { useUnreadComments } from '@/hooks/useUnreadComments';
import {
  DndContext,
  DragEndEvent,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { SortableTableRow } from '@/components/tasks/SortableTableRow';
import {
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Paper,
  Box,
} from '@mui/material';
import { format } from 'date-fns';
import { ProjectType } from '@/constants/projectTypes';
import { SortMode } from '@/stores/taskStore';

interface TaskListTableProps {
  tasks: (Task & { projectType: ProjectType })[];
  onTaskSelect: (taskId: string) => void;
  selectedProjectType?: ProjectType | 'all';
  allUsers?: User[];
  allLabels?: Label[];
  activeSession: { projectType: ProjectType; taskId: string; sessionId: string } | null;
  onStartTimer: (projectType: ProjectType, taskId: string) => void;
  onStopTimer: () => void;
  isStoppingTimer: boolean;
  kobetsuLabelId: string | null;
  currentUserId?: string | null;
  emptyMessage?: string;
  rowSx?: (task: Task & { projectType: ProjectType }, isActive: boolean) => object;
  sortMode?: SortMode;
  onSortModeChange?: (mode: SortMode) => void;
  // D&D関連props
  enableDnd?: boolean;
  onDragEnd?: (activeId: string, overId: string) => void;
}

export function TaskListTable({
  tasks,
  onTaskSelect,
  selectedProjectType,
  allUsers,
  allLabels,
  activeSession,
  onStartTimer,
  onStopTimer,
  isStoppingTimer,
  currentUserId,
  emptyMessage = 'タスクがありません',
  rowSx,
  sortMode = 'order',
  onSortModeChange,
  enableDnd = false,
  onDragEnd,
}: TaskListTableProps) {
  // 未読コメントがあるタスクIDを取得
  const { data: unreadTaskIds } = useUnreadComments(currentUserId ?? null);

  // アサインの表示名を取得
  const getAssigneeNames = (assigneeIds: string[]) => {
    if (!allUsers || assigneeIds.length === 0) return '-';
    return (
      assigneeIds
        .map((id) => allUsers.find((u) => u.id === id)?.displayName)
        .filter(Boolean)
        .join(', ') || '-'
    );
  };

  // 区分の表示名を取得
  const getLabelName = (labelId: string) => {
    if (!allLabels || !labelId) return '-';
    const label = allLabels.find((l) => l.id === labelId);
    return label?.name || '-';
  };

  // コンポーネントマウント時の時刻を保持（1週間判定用）
  const [mountTime] = useState(() => Date.now());

  // 現在時刻から1週間前の時刻を計算
  const oneWeekAgo = useMemo(() => {
    return mountTime - 7 * 24 * 60 * 60 * 1000;
  }, [mountTime]);

  // 未アサインかつ作成から1週間以内のタスクかどうかを判定
  const isNewTask = (task: Task & { projectType: ProjectType }) => {
    if (task.assigneeIds.length > 0) return false;
    if (!task.createdAt) return false;
    return task.createdAt.getTime() >= oneWeekAgo;
  };

  // プロジェクトタイプを表示するかどうか
  const shouldShowProjectType = selectedProjectType === 'all' || selectedProjectType === undefined;

  // IT日ヘッダークリック時のソート切り替え
  const handleItUpDateSort = () => {
    if (!onSortModeChange) return;
    if (sortMode === 'itUpDate-asc') {
      onSortModeChange('itUpDate-desc');
    } else if (sortMode === 'itUpDate-desc') {
      onSortModeChange('order');
    } else {
      onSortModeChange('itUpDate-asc');
    }
  };

  // IT日のソート方向を取得
  const getItUpDateSortDirection = (): 'asc' | 'desc' | false => {
    if (sortMode === 'itUpDate-asc') return 'asc';
    if (sortMode === 'itUpDate-desc') return 'desc';
    return false;
  };

  // D&D用センサー
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor)
  );

  // D&Dイベントハンドラ
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !onDragEnd) return;
    onDragEnd(active.id as string, over.id as string);
  };

  // タスクIDリスト（D&D用）
  const taskIds = useMemo(() => tasks.map((t) => t.id), [tasks]);

  // D&D有効時のテーブル
  if (enableDnd) {
    return (
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                {/* D&D有効時はドラッグハンドル列を追加 */}
                <TableRow sx={{ bgcolor: 'grey.50' }}>
                  <TableCell sx={{ width: 40 }} />
                  <TableCell>タイトル</TableCell>
                  <TableCell>アサイン</TableCell>
                  <TableCell>
                    {onSortModeChange ? (
                      <TableSortLabel
                        active={sortMode === 'itUpDate-asc' || sortMode === 'itUpDate-desc'}
                        direction={getItUpDateSortDirection() || 'asc'}
                        onClick={handleItUpDateSort}
                      >
                        ITアップ
                      </TableSortLabel>
                    ) : (
                      'ITアップ'
                    )}
                  </TableCell>
                  <TableCell>ステータス</TableCell>
                  <TableCell>進捗</TableCell>
                  <TableCell>区分</TableCell>
                  <TableCell>タイマー</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {tasks && tasks.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} sx={{ textAlign: 'center', py: 4 }}>
                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        {emptyMessage}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  tasks.map((task) => (
                    <SortableTableRow
                      key={task.id}
                      task={task}
                      onTaskSelect={onTaskSelect}
                      shouldShowProjectType={shouldShowProjectType}
                      allUsers={allUsers}
                      allLabels={allLabels}
                      activeSession={activeSession}
                      onStartTimer={onStartTimer}
                      onStopTimer={onStopTimer}
                      isStoppingTimer={isStoppingTimer}
                      currentUserId={currentUserId}
                      unreadTaskIds={unreadTaskIds}
                      isNewTask={isNewTask(task)}
                    />
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </SortableContext>
      </DndContext>
    );
  }

  // D&D無効時の通常テーブル
  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow sx={{ bgcolor: 'grey.50' }}>
            <TableCell>タイトル</TableCell>
            <TableCell>アサイン</TableCell>
            <TableCell>
              {onSortModeChange ? (
                <TableSortLabel
                  active={sortMode === 'itUpDate-asc' || sortMode === 'itUpDate-desc'}
                  direction={getItUpDateSortDirection() || 'asc'}
                  onClick={handleItUpDateSort}
                >
                  ITアップ
                </TableSortLabel>
              ) : (
                'ITアップ'
              )}
            </TableCell>
            <TableCell>ステータス</TableCell>
            <TableCell>進捗</TableCell>
            <TableCell>区分</TableCell>
            <TableCell>タイマー</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {tasks && tasks.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  {emptyMessage}
                </Typography>
              </TableCell>
            </TableRow>
          ) : (
            tasks?.map((task) => {
              const isActive = activeSession?.taskId === task.id;
              const isStartDisabled = !!activeSession && activeSession.taskId !== task.id;
              const defaultRowSx = {
                cursor: 'pointer',
                '&:hover': { bgcolor: 'action.hover' },
              };
              const customRowSx = rowSx ? rowSx(task, isActive) : {};
              const finalRowSx = { ...defaultRowSx, ...customRowSx };

              return (
                <TableRow key={task.id} onClick={() => onTaskSelect(task.id)} sx={finalRowSx}>
                  <TableCell sx={{ maxWidth: '400px' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {isNewTask(task) && <Badge variant="error">New</Badge>}
                      {currentUserId &&
                        task.assigneeIds.includes(currentUserId) &&
                        unreadTaskIds?.has(task.id) && <UnreadBadge size="sm" />}
                      <Typography
                        sx={{
                          fontWeight: 'medium',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          flex: 1,
                        }}
                      >
                        {task.title}
                      </Typography>
                    </Box>
                    {shouldShowProjectType && (
                      <Typography
                        variant="caption"
                        sx={{
                          display: 'block',
                          color: 'text.secondary',
                          mt: 0.5,
                        }}
                      >
                        {task.projectType || ''}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell
                    sx={{
                      maxWidth: '200px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {getAssigneeNames(task.assigneeIds)}
                  </TableCell>
                  <TableCell>{task.itUpDate ? format(task.itUpDate, 'yyyy-MM-dd') : '-'}</TableCell>
                  <TableCell>{FLOW_STATUS_LABELS[task.flowStatus]}</TableCell>
                  <TableCell>
                    {task.progressStatus ? (
                      <ProgressStatusBadge status={task.progressStatus} />
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell>{getLabelName(task.kubunLabelId)}</TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <TaskTimerButton
                      isActive={isActive}
                      onStart={() => onStartTimer(task.projectType, task.id)}
                      onStop={onStopTimer}
                      isStopping={isStoppingTimer}
                      startDisabled={isStartDisabled}
                      stopButtonSize="small"
                      startButtonSize="sm"
                      displayMode="icon"
                    />
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
