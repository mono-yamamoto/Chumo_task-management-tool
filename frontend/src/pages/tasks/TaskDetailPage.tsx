import { useParams } from 'react-router-dom';
import { TaskDetailHeader } from './components/TaskDetailHeader';
import { TaskDetailActionBar } from './components/TaskDetailActionBar';
import { TaskBasicInfo } from './components/TaskBasicInfo';
import { TaskSessionHistory } from './components/TaskSessionHistory';
import { TaskUnrecordedMembers } from './components/TaskUnrecordedMembers';
import { TaskDetailComments } from './components/TaskDetailComments';
import { Spinner } from '../../components/ui/Spinner';
import { useTask } from '../../hooks/useTask';

export function TaskDetailPage() {
  const { taskId } = useParams<{ taskId: string }>();
  const { data: task, isLoading, error } = useTask(taskId ?? null);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center bg-bg-primary">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !task) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 bg-bg-primary">
        <p className="text-sm text-error-text">
          {error ? `タスクの取得に失敗しました: ${error.message}` : 'タスクが見つかりません'}
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-bg-primary p-6">
      {/* ヘッダー */}
      <TaskDetailHeader title={task.title} />

      <div className="h-px bg-border-default" />

      {/* アクションバー */}
      <TaskDetailActionBar task={task} />

      <div className="h-px bg-border-default" />

      {/* メインエリア — 2カラム */}
      <div className="flex min-h-0 flex-1 gap-6 py-4">
        {/* 左カラム 55% */}
        <div className="basis-[55%] overflow-y-auto">
          <TaskBasicInfo task={task} />
        </div>

        {/* 右カラム 45% */}
        <div className="flex basis-[45%] flex-col gap-5 overflow-y-auto">
          <TaskSessionHistory
            taskId={task.id}
            projectType={task.projectType}
            over3Reason={task.over3Reason}
          />
          <TaskUnrecordedMembers />
          <div className="h-px bg-border-default" />
          <TaskDetailComments taskId={task.id} projectType={task.projectType} />
        </div>
      </div>
    </div>
  );
}
