import { ChevronDown, Calendar, Plus } from 'lucide-react';
import { Avatar } from '../../../components/ui/Avatar';
import { IconButton } from '../../../components/ui/IconButton';

// モックデータ（タスク詳細画面用）
const MOCK_DETAIL = {
  status: 'ディレクション',
  progress: '個別',
  itUpDate: '2026/02/06',
  releaseDate: '2026/02/13',
  assignees: [
    { id: 'a1', name: '梅村', initial: 'CO' },
    { id: 'a2', name: '滝田', initial: '滝' },
  ],
  kubun: '個別',
  description:
    '自動車保険の優待サービスページの改善を行います。\nデザインはUIデザインシステムを元に制作委託チームにて制作いたしますので、コーディング対応のご対応をお願いいたします。',
};

export function TaskBasicInfo() {
  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-md font-bold text-text-primary">基本情報</h2>

      <FormSelectRow label="ステータス" value={MOCK_DETAIL.status} />
      <FormSelectRow label="進捗" value={MOCK_DETAIL.progress} />
      <FormDateRow label="ITアップ日" value={MOCK_DETAIL.itUpDate} />
      <FormDateRow label="リリース日" value={MOCK_DETAIL.releaseDate} />

      {/* 担当 */}
      <div className="flex h-10 items-center">
        <span className="w-[120px] shrink-0 text-sm text-text-secondary">担当</span>
        <div className="flex flex-1 items-center gap-1">
          {MOCK_DETAIL.assignees.map((a) => (
            <Avatar key={a.id} name={a.name} size="md" />
          ))}
          <IconButton
            aria-label="担当を追加"
            size="sm"
            className="rounded-full border border-border-default text-text-tertiary"
          >
            <Plus size={16} />
          </IconButton>
        </div>
      </div>

      <FormSelectRow label="区分" value={MOCK_DETAIL.kubun} />

      {/* 説明 */}
      <div className="flex flex-col gap-2 pt-3">
        <span className="text-sm font-medium text-text-secondary">説明</span>
        <div className="h-[120px] overflow-y-auto rounded-sm border border-border-default bg-bg-secondary p-3">
          <p className="whitespace-pre-wrap text-sm leading-normal text-text-primary">
            {MOCK_DETAIL.description}
          </p>
        </div>
      </div>
    </div>
  );
}

function FormSelectRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex h-10 items-center">
      <span className="w-[120px] shrink-0 text-sm text-text-secondary">{label}</span>
      <button
        type="button"
        className="flex h-9 flex-1 items-center justify-between rounded-sm border border-border-default bg-bg-secondary px-3 py-2 text-sm text-text-primary transition-colors hover:bg-bg-tertiary"
      >
        <span>{value}</span>
        <ChevronDown size={16} className="text-text-tertiary" />
      </button>
    </div>
  );
}

function FormDateRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex h-10 items-center">
      <span className="w-[120px] shrink-0 text-sm text-text-secondary">{label}</span>
      <button
        type="button"
        className="flex h-9 flex-1 items-center justify-between rounded-sm border border-border-default bg-bg-secondary px-3 py-2 text-sm text-text-primary transition-colors hover:bg-bg-tertiary"
      >
        <span>{value}</span>
        <Calendar size={16} className="text-text-tertiary" />
      </button>
    </div>
  );
}
