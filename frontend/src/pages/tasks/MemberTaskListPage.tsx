import { useMemo } from 'react';
import { Header } from '../../components/layout/Header';
import { TaskDrawer } from '../../components/shared/TaskDrawer/TaskDrawer';
import { MemberTaskToolbar } from './components/MemberTaskToolbar';
import { TaskFilterPanel } from './components/TaskFilterPanel';
import { MemberSection } from './components/MemberSection';
import { MemberCardSection } from './components/MemberCardSection';
import { useViewMode } from '../../hooks/useViewMode';
import { useTaskDrawer } from '../../hooks/useTaskDrawer';
import { getAllTasks, MOCK_USERS } from '../../lib/mockData';
import { FLOW_STATUS_COMPLETED } from '../../lib/constants';
import type { Task, User } from '../../types';

const allTasks = getAllTasks();
const activeTasks = allTasks.filter((t) => t.flowStatus !== FLOW_STATUS_COMPLETED);

export function MemberTaskListPage() {
  const { viewMode, setViewMode } = useViewMode('members');
  const { selectedTaskId, openDrawer, closeDrawer } = useTaskDrawer();

  const selectedTask = useMemo<Task | null>(
    () => allTasks.find((t) => t.id === selectedTaskId) ?? null,
    [allTasks, selectedTaskId]
  );

  // メンバーごとにタスクをグループ化
  const memberGroups = useMemo(() => {
    const grouped = new Map<string, Task[]>();

    for (const task of activeTasks) {
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
    for (const user of MOCK_USERS) {
      const tasks = grouped.get(user.id);
      if (tasks && tasks.length > 0) {
        result.push({ member: user, tasks });
      }
    }

    return result;
  }, []);

  const handleTaskClick = (task: Task) => {
    openDrawer(task.id);
  };

  return (
    <>
      <Header title="タスク" />

      <div className="flex-1 overflow-y-auto p-8 space-y-6">
        <MemberTaskToolbar viewMode={viewMode} onViewModeChange={setViewMode} />
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

        {/* メンバーセクション */}
        <div className="space-y-5">
          {memberGroups.map(({ member, tasks }) =>
            viewMode === 'table' ? (
              <MemberSection
                key={member.id}
                member={member}
                tasks={tasks}
                onTaskClick={handleTaskClick}
              />
            ) : (
              <MemberCardSection
                key={member.id}
                member={member}
                tasks={tasks}
                onTaskClick={handleTaskClick}
              />
            )
          )}
        </div>
      </div>

      <TaskDrawer task={selectedTask} onClose={closeDrawer} />
    </>
  );
}
