import { useState } from 'react';
import { Pencil } from 'lucide-react';
import { Avatar } from '../../../components/ui/Avatar';
import { IconButton } from '../../../components/ui/IconButton';
import { Spinner } from '../../../components/ui/Spinner';
import { Modal } from '../../../components/ui/Modal';
import { SessionEditModalContent } from '../../reports/components/SessionEditModalContent';
import { useTaskSessions } from '../../../hooks/useTimer';
import { useUsers } from '../../../hooks/useUsers';
import { useAuth } from '../../../hooks/useAuth';
import { formatDateTime } from '../../../lib/constants';
import { formatDuration } from '../../../lib/taskUtils';
import type { TaskSession } from '../../../types';

interface TaskSessionHistoryProps {
  taskId: string;
  projectType: string;
}

export function TaskSessionHistory({ taskId, projectType }: TaskSessionHistoryProps) {
  const { data: sessions, isLoading } = useTaskSessions(taskId, projectType);
  const { getUserName, getUserById } = useUsers();
  const { userId } = useAuth();
  const [editingSession, setEditingSession] = useState<TaskSession | null>(null);

  const totalSec = sessions?.reduce((sum, s) => sum + s.durationSec, 0) ?? 0;

  return (
    <div className="flex flex-col gap-5">
      {/* セッション履歴ヘッダー */}
      <div className="flex flex-col gap-2">
        <div className="flex h-8 items-center justify-between">
          <h2 className="text-md font-bold text-text-primary">セッション履歴</h2>
        </div>
        {sessions && sessions.length > 0 && (
          <span className="text-sm text-text-secondary">合計: {formatDuration(totalSec)}</span>
        )}
      </div>

      {/* セッション一覧 */}
      {isLoading ? (
        <div className="flex justify-center py-4">
          <Spinner size="sm" />
        </div>
      ) : sessions && sessions.length > 0 ? (
        <div className="flex flex-col">
          {sessions.map((session) => {
            const name = getUserName(session.userId);
            const user = getUserById(session.userId);
            const isOwn = session.userId === userId;
            return (
              <SessionRow
                key={session.id}
                session={session}
                userName={name}
                avatarUrl={user?.avatarUrl ?? undefined}
                avatarColor={user?.avatarColor}
                isOwn={isOwn}
                onEdit={() => setEditingSession(session)}
              />
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-text-tertiary">セッション履歴はありません</p>
      )}

      {/* セッション編集モーダル */}
      <Modal
        isOpen={editingSession != null}
        onClose={() => setEditingSession(null)}
        title="セッション時間の編集"
      >
        {editingSession && (
          <SessionEditModalContent
            session={editingSession}
            onCancel={() => setEditingSession(null)}
            onSaved={() => setEditingSession(null)}
          />
        )}
      </Modal>
    </div>
  );
}

function SessionRow({
  session,
  userName,
  avatarUrl,
  avatarColor,
  isOwn,
  onEdit,
}: {
  session: TaskSession;
  userName: string;
  avatarUrl?: string;
  avatarColor?: string | null;
  isOwn: boolean;
  onEdit: () => void;
}) {
  const start = new Date(session.startedAt);
  const end = session.endedAt ? new Date(session.endedAt) : null;
  const timeStr = end
    ? `${formatDateTime(start)} - ${formatDateTime(end)}`
    : `${formatDateTime(start)} - 計測中`;

  return (
    <div className="flex h-14 items-center gap-3 py-2">
      <Avatar name={userName} imageUrl={avatarUrl} colorName={avatarColor} size="md" />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-sm font-medium text-text-primary">{userName}</span>
        <span className="text-xs text-text-tertiary">{timeStr}</span>
      </div>
      <span className="shrink-0 text-sm font-medium text-text-primary">
        {formatDuration(session.durationSec)}
      </span>
      {isOwn && (
        <IconButton
          onPress={onEdit}
          aria-label="セッションを編集"
          size="sm"
          className="shrink-0 text-text-tertiary hover:text-text-secondary"
        >
          <Pencil size={16} />
        </IconButton>
      )}
    </div>
  );
}
