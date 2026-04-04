import { ListFilter, X } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { PROJECT_TYPES } from '../../../types';
import { useUsers } from '../../../hooks/useUsers';
import { useLabels } from '../../../hooks/useLabels';

const FLOW_STATUS_OPTIONS = [
  { value: '完了以外', label: '完了以外' },
  { value: '未着手', label: '未着手' },
  { value: 'ディレクション', label: 'ディレクション' },
  { value: 'コーディング', label: 'コーディング' },
  { value: 'デザイン', label: 'デザイン' },
  { value: '待ち', label: '待ち' },
  { value: '対応中', label: '対応中' },
  { value: '完了', label: '完了' },
];

const PROJECT_OPTIONS = PROJECT_TYPES.map((p) => ({ value: p, label: p }));

const TIMER_OPTIONS = [
  { value: 'active', label: '計測中' },
  { value: 'inactive', label: '未計測' },
];

// 直近12ヶ月分の月選択肢を生成
function generateMonthOptions(): { value: string; label: string }[] {
  const options: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = -2; i <= 9; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = `${d.getFullYear()}年${d.getMonth() + 1}月`;
    options.push({ value, label });
  }
  return options;
}

const MONTH_OPTIONS = generateMonthOptions();

export function TaskFilterPanel() {
  const { data: users = [] } = useUsers();
  const { data: labels = [] } = useLabels();

  const assignOptions = users.map((u) => ({
    value: u.id,
    label: u.displayName,
  }));

  const kubunOptions = labels.map((l) => ({
    value: l.id,
    label: l.name,
  }));

  return (
    <div className="rounded-lg border border-border-default bg-bg-tertiary px-6 py-4 space-y-3">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ListFilter size={18} className="text-text-primary" />
          <span className="text-sm font-bold text-text-primary">フィルター</span>
        </div>
        <Button variant="ghost" size="sm" className="h-auto px-2 py-1 text-xs text-text-tertiary">
          <X size={14} />
          クリア
        </Button>
      </div>

      {/* フィルター Row 1 */}
      <div className="flex items-end gap-3">
        <div className="flex flex-1 flex-col gap-1">
          <span className="text-xs font-medium text-text-secondary">タイトル</span>
          <Input placeholder="タイトルで検索..." inputClassName="bg-bg-primary" />
        </div>
        <Select
          label="プロジェクト"
          options={PROJECT_OPTIONS}
          placeholder="すべて"
          className="flex-1"
        />
        <Select
          label="ステータス"
          options={FLOW_STATUS_OPTIONS}
          value="完了以外"
          active
          className="flex-1"
        />
        <Select label="アサイン" options={assignOptions} placeholder="すべて" className="flex-1" />
      </div>

      {/* フィルター Row 2 */}
      <div className="flex items-end gap-3">
        <Select label="区分" options={kubunOptions} placeholder="すべて" className="flex-1" />
        <Select label="タイマー" options={TIMER_OPTIONS} placeholder="すべて" className="flex-1" />
        <Select
          label="ITアップ月"
          options={MONTH_OPTIONS}
          placeholder="すべて"
          className="flex-1"
        />
        <Select
          label="リリース月"
          options={MONTH_OPTIONS}
          placeholder="すべて"
          className="flex-1"
        />
      </div>
    </div>
  );
}
