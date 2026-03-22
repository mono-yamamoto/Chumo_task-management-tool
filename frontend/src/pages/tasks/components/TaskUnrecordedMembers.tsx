import { Bell, Check } from 'lucide-react';
import { Avatar } from '../../../components/ui/Avatar';

const MOCK_UNRECORDED = [
  { id: 'u1', name: '菊池', notified: false },
  { id: 'u2', name: '山本', notified: true },
];

export function TaskUnrecordedMembers() {
  return (
    <div className="flex flex-col gap-2">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-text-secondary">セッション未記録メンバー</span>
        <button
          type="button"
          className="inline-flex h-7 items-center gap-1 rounded-md border border-primary-default px-2.5 py-1 text-xs font-medium text-primary-default transition-colors hover:bg-bg-brand-subtle"
          onClick={() => {}} // TODO: 全員通知処理
        >
          <Bell size={14} />
          <span>全員に通知</span>
        </button>
      </div>

      {/* メンバーリスト */}
      <div className="flex flex-col gap-2">
        {MOCK_UNRECORDED.map((member) => (
          <div key={member.id} className="flex h-10 items-center gap-3">
            <Avatar name={member.name} size="sm" className="h-7 w-7" />
            <span className="min-w-0 flex-1 text-sm text-text-primary">{member.name}</span>
            {member.notified ? (
              <span className="inline-flex h-7 items-center gap-1 rounded-md border border-primary-default bg-bg-brand-subtle px-2.5 py-1 text-xs font-medium text-primary-default">
                <Check size={14} />
                <span>通知済み</span>
              </span>
            ) : (
              <button
                type="button"
                className="inline-flex h-7 items-center gap-1 rounded-md border border-primary-default px-2.5 py-1 text-xs font-medium text-primary-default transition-colors hover:bg-bg-brand-subtle"
                onClick={() => {}} // TODO: 個別通知処理
              >
                <Bell size={14} />
                <span>通知</span>
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
