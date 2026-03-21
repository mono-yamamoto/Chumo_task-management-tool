import { useState } from 'react';
import { Pencil, Bell, Check } from 'lucide-react';
import { Button } from '../../ui/Button';
import type { ReportEntry, TaskSession } from '../../../types';
import { formatDuration } from '../../../lib/taskUtils';

// セッション未記録メンバーのモックデータ
const MOCK_UNRECORDED_MEMBERS = [
  { id: 'user-unr-1', name: '菊池', initial: '菊', color: 'bg-blue-600' },
  { id: 'user-unr-2', name: '山本', initial: '山', color: 'bg-green-600', notified: true },
];

// セッション用のダミーアバターカラー
const AVATAR_COLORS = ['bg-amber-600', 'bg-teal-600', 'bg-amber-600', 'bg-purple-600'];

interface ReportDetailTabProps {
  entry: ReportEntry;
  onEditSession: (entry: ReportEntry, session: TaskSession) => void;
}

export function ReportDetailTab({ entry, onEditSession }: ReportDetailTabProps) {
  const [reason, setReason] = useState(entry.over3Reason ?? '');

  const totalSec = entry.sessions.reduce((sum, s) => sum + s.durationSec, 0);

  return (
    <div className="space-y-0">
      {/* 3時間超過理由 */}
      <div className="space-y-2 px-6 py-5 border-b border-border-default">
        <label className="text-xs font-medium text-text-tertiary">3時間超過理由</label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="3時間を超過した場合は理由を記入してください"
          className="h-[100px] w-full resize-none rounded-lg border border-border-default bg-bg-secondary px-3 py-3 text-sm leading-relaxed text-text-primary placeholder:text-text-tertiary focus:border-border-focus focus:outline-none focus:ring-1 focus:ring-border-focus"
        />
        <p className="text-xs text-text-tertiary">3時間を超過した場合は理由を記入してください</p>
      </div>

      {/* セッション履歴 */}
      <div className="space-y-2 px-6 py-4 border-b border-border-default">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-text-tertiary">セッション履歴</span>
          <span className="text-xs font-medium text-text-secondary">
            合計: {formatDuration(totalSec)}
          </span>
        </div>

        <div className="space-y-0">
          {entry.sessions.map((session, i) => (
            <SessionRow
              key={session.id}
              session={session}
              colorClass={AVATAR_COLORS[i % AVATAR_COLORS.length]!}
              onEdit={() => onEditSession(entry, session)}
            />
          ))}
        </div>
      </div>

      {/* セッション未記録メンバー */}
      <div className="space-y-2 px-6 py-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-text-tertiary">セッション未記録メンバー</span>
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-2.5 text-xs text-primary-default border-primary-default"
          >
            <Bell size={14} />
            全員に通知
          </Button>
        </div>
        <p className="text-xs text-text-tertiary">
          以下のメンバーはアサインされていますがセッション履歴がありません
        </p>

        <div className="space-y-1">
          {MOCK_UNRECORDED_MEMBERS.map((member) => (
            <div key={member.id} className="flex items-center justify-between py-1.5">
              <div className="flex items-center gap-2">
                <div
                  className={`flex h-7 w-7 items-center justify-center rounded-full ${member.color}`}
                >
                  <span className="text-[11px] font-bold text-white">{member.initial}</span>
                </div>
                <span className="text-sm font-medium text-text-primary">{member.name}</span>
              </div>

              {member.notified ? (
                <Button
                  variant="outline"
                  size="sm"
                  isDisabled
                  className="h-7 px-2.5 text-xs text-primary-default border-primary-default bg-bg-brand-subtle opacity-100"
                >
                  <Check size={14} />
                  通知済み
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2.5 text-xs text-primary-default border-primary-default"
                >
                  <Bell size={14} />
                  通知
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

interface SessionRowProps {
  session: TaskSession;
  colorClass: string;
  onEdit: () => void;
}

function SessionRow({ session, colorClass, onEdit }: SessionRowProps) {
  const userName = getSessionUserName(session.userId);
  const initial = userName.charAt(0);
  const startStr = formatDateTime(session.startedAt);
  const endStr = session.endedAt ? formatTime(session.endedAt) : '-';
  const duration = formatDuration(session.durationSec);

  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-2">
        <div
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${colorClass}`}
        >
          <span className="text-[11px] font-bold text-white">{initial}</span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-medium text-text-primary">{userName}</span>
          <span className="text-xs text-text-tertiary">
            {startStr} - {endStr}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm text-text-secondary">{duration}</span>
        <button
          type="button"
          onClick={onEdit}
          className="text-text-tertiary transition-colors hover:text-text-primary"
        >
          <Pencil size={16} />
        </button>
      </div>
    </div>
  );
}

// ヘルパー関数
function getSessionUserName(userId: string): string {
  const names: Record<string, string> = {
    'user-1': '田中',
    'user-2': '佐藤',
    'user-3': '鈴木',
    'user-4': '高橋',
    'user-5': '伊藤',
    'user-6': '渡辺',
  };
  return names[userId] ?? 'Unknown';
}

function formatDateTime(date: Date): string {
  const d = new Date(date);
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const da = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  const s = String(d.getSeconds()).padStart(2, '0');
  return `${y}-${mo}-${da} ${h}:${m}:${s}`;
}

function formatTime(date: Date): string {
  const d = new Date(date);
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  const s = String(d.getSeconds()).padStart(2, '0');
  return `${h}:${m}:${s}`;
}
