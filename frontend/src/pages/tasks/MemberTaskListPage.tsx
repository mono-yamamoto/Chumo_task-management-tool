import { useMemo, useState } from 'react';
import { Header } from '../../components/layout/Header';
import { TaskDrawer } from '../../components/shared/TaskDrawer/TaskDrawer';
import { TaskCreateDrawer } from '../../components/shared/TaskCreateDrawer';
import { MemberTaskToolbar } from './components/MemberTaskToolbar';
import { TaskFilterPanel } from './components/TaskFilterPanel';
import { MemberSection } from './components/MemberSection';
import { MemberCardSection } from './components/MemberCardSection';
import { Spinner } from '../../components/ui/Spinner';
import { useViewMode } from '../../hooks/useViewMode';
import { useTaskDrawer } from '../../hooks/useTaskDrawer';
import { useTasks } from '../../hooks/useTasks';
import { useUsers } from '../../hooks/useUsers';
import type { Task, User } from '../../types';

export function MemberTaskListPage() {
  const {
    data,
    isLoading: tasksLoading,
    error: tasksError,
  } = useTasks({ excludeCompleted: true, limit: 500 });
  const { data: users = [], isLoading: usersLoading } = useUsers();

  const tasks = useMemo(() => data?.tasks ?? [], [data?.tasks]);
  const isLoading = tasksLoading || usersLoading;

  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);
  const { viewMode, setViewMode } = useViewMode('members');
  const { selectedTaskId, openDrawer, closeDrawer } = useTaskDrawer();

  // メンバーごとにタスクをグループ化
  const memberGroups = useMemo(() => {
    const grouped = new Map<string, Task[]>();

    for (const task of tasks) {
      for (const assigneeId of task.assigneeIds) {
        const existing = grouped.get(assigneeId);
        if (existing) {
          existing.push(task);
        } else {
          grouped.set(assigneeId, [task]);
        }
      }
    }

    const result: { member: User; tasks: Task[] }[] = [];
    for (const user of users) {
      const userTasks = grouped.get(user.id);
      if (userTasks && userTasks.length > 0) {
        result.push({ member: user, tasks: userTasks });
      }
    }

    return result;
  }, [tasks, users]);

  const handleTaskClick = (task: Task) => {
    openDrawer(task.id);
  };

  return (
    <>
      <Header title="タスク" />

      <div className="flex-1 overflow-y-auto p-8 space-y-6">
        <MemberTaskToolbar
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          onNewTask={() => setIsCreateDrawerOpen(true)}
        />
        <TaskFilterPanel />

        {/* 凡例行 */}
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center rounded-full bg-warning-bg px-3 py-1 text-xs font-medium text-warning-text">
            期限1週間以内
          </span>
          <span className="inline-flex items-center rounded-full bg-error-bg px-3 py-1 text-xs font-medium text-error-text">
            期限超過
          </span>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Spinner size="lg" />
          </div>
        ) : tasksError ? (
          <div className="rounded-lg border border-error-border bg-error-bg p-4 text-sm text-error-text">
            タスクの取得に失敗しました: {tasksError.message}
          </div>
        ) : (
          <div className="space-y-5">
            {memberGroups.map(({ member, tasks: memberTasks }) =>
              viewMode === 'table' ? (
                <MemberSection
                  key={member.id}
                  member={member}
                  tasks={memberTasks}
                  onTaskClick={handleTaskClick}
                />
              ) : (
                <MemberCardSection
                  key={member.id}
                  member={member}
                  tasks={memberTasks}
                  onTaskClick={handleTaskClick}
                />
              )
            )}
          </div>
        )}
      </div>

      <TaskCreateDrawer isOpen={isCreateDrawerOpen} onClose={() => setIsCreateDrawerOpen(false)} />
      <TaskDrawer taskId={selectedTaskId} onClose={closeDrawer} />
    </>
  );
}
