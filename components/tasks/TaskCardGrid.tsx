'use client';

import { Box, Typography, Chip } from '@mui/material';
import { Task, Label, FlowStatus } from '@/types';
import { FLOW_STATUS_LABELS } from '@/constants/taskConstants';
import { ProjectType } from '@/constants/projectTypes';
import { TaskCard } from './TaskCard';
import { useUnreadComments } from '@/hooks/useUnreadComments';
import { useMemo, useState, useCallback } from 'react';

// ステータスの表示順序
const STATUS_ORDER: FlowStatus[] = [
  '対応中',
  'コーディング',
  'デザイン',
  'ディレクション',
  '待ち',
  '未着手',
  '週次報告',
  '月次報告',
  '完了',
];

interface StatusGroup {
  status: FlowStatus;
  tasks: (Task & { projectType: ProjectType })[];
}

interface TaskCardGridProps {
  tasks: (Task & { projectType: ProjectType })[];
  onTaskSelect: (taskId: string) => void;
  selectedProjectType?: ProjectType | 'all';
  allLabels?: Label[];
  currentUserId?: string | null;
  emptyMessage?: string;
}

export function TaskCardGrid({
  tasks,
  onTaskSelect,
  selectedProjectType,
  allLabels,
  currentUserId,
  emptyMessage = 'タスクがありません',
}: TaskCardGridProps) {
  // 未読コメントがあるタスクIDを取得
  const { data: unreadTaskIds } = useUnreadComments(currentUserId ?? null);

  // コンポーネントマウント時の時刻を保持（1週間判定用）
  const [mountTime] = useState(() => Date.now());

  // 現在時刻から1週間前の時刻を計算
  const oneWeekAgo = useMemo(() => {
    return mountTime - 7 * 24 * 60 * 60 * 1000;
  }, [mountTime]);

  // 未アサインかつ作成から1週間以内のタスクかどうかを判定
  const isNewTask = useCallback(
    (task: Task & { projectType: ProjectType }): boolean => {
      if (task.assigneeIds.length > 0) return false;
      if (!task.createdAt) return false;
      return task.createdAt.getTime() >= oneWeekAgo;
    },
    [oneWeekAgo]
  );

  // 全プロジェクト表示時にプロジェクトタイプを表示
  const shouldShowProjectType = selectedProjectType === 'all';

  // タスクをステータス別にグルーピング
  const statusGroups = useMemo(() => {
    const statusMap = new Map<FlowStatus, (Task & { projectType: ProjectType })[]>();

    for (const task of tasks) {
      const list = statusMap.get(task.flowStatus);
      if (list) {
        list.push(task);
      } else {
        statusMap.set(task.flowStatus, [task]);
      }
    }

    // ステータス順序に従ってソート
    const groups: StatusGroup[] = STATUS_ORDER.filter((status) => statusMap.has(status)).map(
      (status) => ({
        status,
        tasks: statusMap.get(status) || [],
      })
    );

    return groups;
  }, [tasks]);

  if (tasks.length === 0) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="text.secondary">{emptyMessage}</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {statusGroups.map((group) => (
        <Box key={group.status}>
          {/* ステータスヘッダー */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              mb: 1.5,
              py: 0.5,
              px: 1,
              bgcolor: 'grey.50',
              borderRadius: 1,
            }}
          >
            <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
              {FLOW_STATUS_LABELS[group.status]}
            </Typography>
            <Chip
              label={group.tasks.length}
              size="small"
              sx={{
                height: 20,
                fontSize: '0.75rem',
                bgcolor: 'grey.200',
              }}
            />
          </Box>

          {/* カードリスト */}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, px: 1 }}>
            {group.tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onTaskSelect={onTaskSelect}
                allLabels={allLabels}
                currentUserId={currentUserId}
                showProjectType={shouldShowProjectType}
                showProgressStatus={true}
                hasUnreadComment={!!(currentUserId && unreadTaskIds?.has(task.id))}
                isNewTask={isNewTask(task)}
              />
            ))}
          </Box>
        </Box>
      ))}
    </Box>
  );
}
