import { TaskDetailHeader } from './components/TaskDetailHeader';
import { TaskDetailActionBar } from './components/TaskDetailActionBar';
import { TaskBasicInfo } from './components/TaskBasicInfo';
import { TaskSessionHistory } from './components/TaskSessionHistory';
import { TaskUnrecordedMembers } from './components/TaskUnrecordedMembers';
import { TaskDetailComments } from './components/TaskDetailComments';

export function TaskDetailPage() {
  return (
    <div className="flex h-full flex-col overflow-y-auto bg-bg-primary p-6">
      {/* ヘッダー */}
      <TaskDetailHeader taskId="REQ2017-2199" title="【滝田】自動車_優待サービスページ改善" />

      <div className="h-px bg-border-default" />

      {/* アクションバー */}
      <TaskDetailActionBar />

      <div className="h-px bg-border-default" />

      {/* メインエリア — 2カラム */}
      <div className="flex min-h-0 flex-1 gap-6 py-4">
        {/* 左カラム 55% */}
        <div className="basis-[55%] overflow-y-auto">
          <TaskBasicInfo />
        </div>

        {/* 右カラム 45% */}
        <div className="flex basis-[45%] flex-col gap-5 overflow-y-auto">
          <TaskSessionHistory />
          <TaskUnrecordedMembers />
          <div className="h-px bg-border-default" />
          <TaskDetailComments />
        </div>
      </div>
    </div>
  );
}
