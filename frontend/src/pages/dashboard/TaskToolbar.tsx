import { LayoutList, LayoutGrid, Filter } from 'lucide-react';
import { ToggleGroup } from '../../components/ui/ToggleGroup';
import { Button } from '../../components/ui/Button';
import type { ViewMode } from '../../hooks/useViewMode';

interface TaskToolbarProps {
  taskCount: number;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

export function TaskToolbar({ taskCount, viewMode, onViewModeChange }: TaskToolbarProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-bold text-text-primary">マイタスク</h2>
        <span className="inline-flex items-center justify-center rounded-full bg-bg-brand-subtle px-2 py-0.5 text-xs font-bold text-primary-default">
          {taskCount}
        </span>
      </div>
      <div className="flex items-center gap-2">
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
        <Button variant="outline" size="sm" className="text-text-secondary text-xs">
          <Filter size={16} />
          フィルター
        </Button>
      </div>
    </div>
  );
}
