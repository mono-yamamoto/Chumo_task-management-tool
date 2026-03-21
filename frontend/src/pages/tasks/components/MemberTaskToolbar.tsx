import { LayoutList, LayoutGrid, List, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ToggleGroup } from '../../../components/ui/ToggleGroup';
import { Button } from '../../../components/ui/Button';
import type { ViewMode } from '../../../hooks/useViewMode';

interface MemberTaskToolbarProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

export function MemberTaskToolbar({ viewMode, onViewModeChange }: MemberTaskToolbarProps) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="text-xl font-bold text-text-primary">メンバー別タスク一覧</h2>
      <div className="flex items-center gap-2">
        <Link to="/tasks">
          <Button variant="outline" size="sm" className="text-xs text-primary-default">
            <List size={16} className="text-primary-default" />
            タスク一覧
          </Button>
        </Link>
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
