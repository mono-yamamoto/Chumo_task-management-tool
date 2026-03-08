import { LayoutList, LayoutGrid, Users, Plus } from 'lucide-react';
import { ToggleGroup } from '../../../components/ui/ToggleGroup';
import { Button } from '../../../components/ui/Button';
import type { ViewMode } from '../../../hooks/useViewMode';

interface TaskListToolbarProps {
  taskCount: number;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

export function TaskListToolbar({ taskCount, viewMode, onViewModeChange }: TaskListToolbarProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        <h2 className="text-xl font-bold text-text-primary">タスク一覧</h2>
        <span className="inline-flex items-center justify-center rounded-full bg-bg-brand-subtle px-2 py-0.5 text-xs font-bold text-primary-default">
          {taskCount}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" className="text-text-secondary text-xs">
          <Users size={16} />
          メンバー別タスク一覧
        </Button>
        <ToggleGroup
          items={[
            {
              value: 'table',
              label: 'テーブルビュー',
              icon: <LayoutList size={16} />,
            },
            {
              value: 'card',
              label: 'カードビュー',
              icon: <LayoutGrid size={16} />,
            },
          ]}
          value={viewMode}
          onChange={(v) => onViewModeChange(v as ViewMode)}
        />
        <Button size="sm" className="px-4">
          <Plus size={16} />
          新規タスク
        </Button>
      </div>
    </div>
  );
}
