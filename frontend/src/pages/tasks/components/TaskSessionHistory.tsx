import { Plus, Pencil } from 'lucide-react';
import { Avatar } from '../../../components/ui/Avatar';

// モックセッションデータ
const MOCK_SESSIONS = [
  {
    id: 's1',
    name: '梅村',
    time: '2026-01-29 11:44:18 - 12:54:12',
    duration: '3時間31分',
  },
  {
    id: 's2',
    name: '光田',
    time: '2026-01-30 14:05:22 - 14:48:10',
    duration: '0時間42分',
  },
  {
    id: 's3',
    name: '梅村',
    time: '2026-01-29 10:00:33 - 15:39:24',
    duration: '2時間31分',
  },
];

const MOCK_OVER3_REASON = 'デザインしながらコーディングしたため';

export function TaskSessionHistory() {
  return (
    <div className="flex flex-col gap-5">
      {/* セッション履歴ヘッダー */}
      <div className="flex flex-col gap-2">
        <div className="flex h-8 items-center justify-between">
          <h2 className="text-md font-bold text-text-primary">セッション履歴</h2>
          <button
            type="button"
            className="inline-flex h-7 items-center gap-1 rounded-sm border border-primary-default px-2 py-1 text-xs text-primary-default transition-colors hover:bg-bg-brand-subtle"
            onClick={() => {}} // TODO: セッション追加処理
          >
            <Plus size={14} />
            <span>追加</span>
          </button>
        </div>
        <span className="text-sm text-text-secondary">合計: 6時間53分</span>
      </div>

      {/* セッション一覧 */}
      <div className="flex flex-col">
        {MOCK_SESSIONS.map((session) => (
          <div key={session.id} className="flex h-14 items-center gap-3 py-2">
            <Avatar name={session.name} size="md" />
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-sm font-medium text-text-primary">{session.name}</span>
              <span className="text-xs text-text-tertiary">{session.time}</span>
            </div>
            <span className="shrink-0 text-sm font-medium text-text-primary">
              {session.duration}
            </span>
            <button
              type="button"
              className="shrink-0 text-text-tertiary transition-colors hover:text-text-secondary"
              aria-label="セッションを編集"
            >
              <Pencil size={16} />
            </button>
          </div>
        ))}
      </div>

      {/* 3時間超過理由 */}
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-text-secondary">3時間超過理由</span>
        <div className="h-20 overflow-y-auto rounded-sm border border-border-default bg-bg-secondary p-3">
          <p className="whitespace-pre-wrap text-sm text-text-primary">{MOCK_OVER3_REASON}</p>
        </div>
      </div>
    </div>
  );
}
