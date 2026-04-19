import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { useActiveSession, useElapsedTime } from '../../hooks/useTimer';

const DEFAULT_TITLE = 'Chumo - タスク管理';

/** ブラウザタブタイトル更新（分離してAppLayoutの再レンダーを防ぐ） */
function TitleUpdater() {
  const { data: activeSession, cached } = useActiveSession();
  const startedAt = activeSession?.startedAt ?? cached?.startedAt ?? null;
  const { formatted } = useElapsedTime(startedAt);

  useEffect(() => {
    document.title = startedAt ? `⏱ ${formatted} - Chumo` : DEFAULT_TITLE;
    return () => {
      document.title = DEFAULT_TITLE;
    };
  }, [startedAt, formatted]);

  return null;
}

export function AppLayout() {
  return (
    <div className="flex h-screen overflow-hidden bg-bg-primary">
      <Sidebar />
      <main className="flex flex-1 flex-col overflow-hidden bg-bg-secondary">
        <Outlet />
      </main>
      <TitleUpdater />
    </div>
  );
}
