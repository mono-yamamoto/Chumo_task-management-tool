import { useState, useMemo } from 'react';
import { Calendar, Timer, Check } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { formatDuration } from '../../../lib/taskUtils';
import { useUpdateSession } from '../../../hooks/useSessionMutations';
import type { TaskSession } from '../../../types';

function formatDateInput(date: Date | string): string {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatTimeInput(date: Date | string): string {
  const d = new Date(date);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
}

interface SessionEditModalContentProps {
  session: TaskSession;
  onCancel: () => void;
  onSaved?: () => void;
}

export function SessionEditModalContent({
  session,
  onCancel,
  onSaved,
}: SessionEditModalContentProps) {
  const [dateValue, setDateValue] = useState(() => formatDateInput(session.startedAt));
  const [startTime, setStartTime] = useState(() => formatTimeInput(session.startedAt));
  const [endTime, setEndTime] = useState(() =>
    session.endedAt ? formatTimeInput(session.endedAt) : ''
  );

  const updateSession = useUpdateSession();

  const durationSec = useMemo(() => {
    if (!startTime || !endTime) return 0;
    const [sh, sm, ss] = startTime.split(':').map(Number);
    const [eh, em, es] = endTime.split(':').map(Number);
    const startSec = (sh ?? 0) * 3600 + (sm ?? 0) * 60 + (ss ?? 0);
    const endSec = (eh ?? 0) * 3600 + (em ?? 0) * 60 + (es ?? 0);
    return Math.max(0, endSec - startSec);
  }, [startTime, endTime]);

  const handleSave = () => {
    const startedAt = new Date(`${dateValue}T${startTime}`).toISOString();
    const endedAt = endTime ? new Date(`${dateValue}T${endTime}`).toISOString() : undefined;

    updateSession.mutate(
      { sessionId: session.id, data: { startedAt, endedAt } },
      { onSuccess: onSaved }
    );
  };

  return (
    <div className="space-y-5">
      {/* 日付 */}
      <FieldRow label="日付" icon={<Calendar size={16} />}>
        <input
          type="date"
          value={dateValue}
          onChange={(e) => setDateValue(e.target.value)}
          aria-label="セッション日付"
          className="flex-1 bg-transparent text-base text-text-primary outline-none"
        />
      </FieldRow>

      {/* 開始時間 */}
      <FieldRow label="開始時間" icon={<Timer size={16} />}>
        <input
          type="time"
          step="1"
          value={startTime}
          onChange={(e) => setStartTime(e.target.value)}
          aria-label="開始時間"
          className="flex-1 bg-transparent text-base text-text-primary outline-none"
        />
      </FieldRow>

      {/* 終了時間 */}
      <FieldRow label="終了時間" icon={<Timer size={16} />}>
        <input
          type="time"
          step="1"
          value={endTime}
          onChange={(e) => setEndTime(e.target.value)}
          aria-label="終了時間"
          className="flex-1 bg-transparent text-base text-text-primary outline-none"
        />
      </FieldRow>

      {/* 作業時間 */}
      <div className="space-y-1.5">
        <span className="text-sm font-medium text-text-secondary">作業時間</span>
        <p className="text-xl font-bold text-text-primary">{formatDuration(durationSec)}</p>
      </div>

      {/* フッターボタン */}
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" size="sm" onPress={onCancel}>
          キャンセル
        </Button>
        <Button
          variant="primary"
          size="sm"
          onPress={handleSave}
          isDisabled={updateSession.isPending}
        >
          <Check size={16} />
          保存
        </Button>
      </div>
    </div>
  );
}

interface FieldRowProps {
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}

function FieldRow({ label, icon, children }: FieldRowProps) {
  return (
    <div className="space-y-1.5">
      <span className="text-sm font-medium text-text-secondary">{label}</span>
      <div className="flex h-10 items-center gap-2 rounded-lg border border-border-default bg-bg-primary px-3">
        <span className="text-text-tertiary">{icon}</span>
        {children}
      </div>
    </div>
  );
}
