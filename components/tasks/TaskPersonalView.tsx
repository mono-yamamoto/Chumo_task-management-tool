'use client';

import { useMemo, useState } from 'react';
import { Task, Label, User } from '@/types';
import { groupTasksByAssignee, UNASSIGNED_ID } from '@/lib/taskGrouping';
import { PersonalTaskSection } from '@/components/tasks/PersonalTaskSection';
import { useUnreadComments } from '@/hooks/useUnreadComments';
import { Box, Typography } from '@mui/material';
import { ProjectType } from '@/constants/projectTypes';

interface TaskPersonalViewProps {
  tasks: (Task & { projectType: ProjectType })[];
  onTaskSelect: (taskId: string) => void;
  allUsers?: User[];
  allLabels?: Label[];
  currentUserId?: string | null;
  emptyMessage?: string;
}

export function TaskPersonalView({
  tasks,
  onTaskSelect,
  allUsers,
  allLabels,
  currentUserId,
  emptyMessage = 'タスクがありません',
}: TaskPersonalViewProps) {
  // 未読コメントがあるタスクIDを取得
  const { data: unreadTaskIds } = useUnreadComments(currentUserId ?? null);

  // コンポーネントマウント時の時刻を保持（1週間判定用）
  const [mountTime] = useState(() => Date.now());

  // 現在時刻から1週間前の時刻を計算
  const oneWeekAgo = useMemo(() => {
    return mountTime - 7 * 24 * 60 * 60 * 1000;
  }, [mountTime]);

  // タスクを担当者別→ステータス別にグルーピング
  const sections = useMemo(() => {
    return groupTasksByAssignee(tasks, allUsers);
  }, [tasks, allUsers]);

  // 自分のセクションを先頭に移動
  const sortedSections = useMemo(() => {
    if (!currentUserId) return sections;

    const mySection = sections.find((s) => s.assigneeId === currentUserId);
    const otherSections = sections.filter(
      (s) => s.assigneeId !== currentUserId && s.assigneeId !== UNASSIGNED_ID
    );
    const unassignedSection = sections.find((s) => s.assigneeId === UNASSIGNED_ID);

    return [
      ...(mySection ? [mySection] : []),
      ...otherSections,
      ...(unassignedSection ? [unassignedSection] : []),
    ];
  }, [sections, currentUserId]);

  if (tasks.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {emptyMessage}
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      {sortedSections.map((section) => (
        <PersonalTaskSection
          key={section.assigneeId}
          section={section}
          onTaskSelect={onTaskSelect}
          allLabels={allLabels}
          currentUserId={currentUserId}
          unreadTaskIds={unreadTaskIds}
          oneWeekAgo={oneWeekAgo}
          defaultExpanded={section.assigneeId === currentUserId || sortedSections.length <= 3}
        />
      ))}
    </Box>
  );
}
