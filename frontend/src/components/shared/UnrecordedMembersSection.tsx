import { useState, useMemo, useCallback, useEffect } from 'react';
import { Bell, Check, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { useUsers } from '@/hooks/useUsers';
import { useSendSessionReminder } from '@/hooks/useSessionReminders';
import { useToast } from '@/hooks/useToast';
import { HttpError } from '@/lib/api';

function reminderErrorMessage(error: Error): string {
  if (error instanceof HttpError && error.status === 403) {
    return '通知を送信する権限がありません（タスクのアサイニーまたは管理者のみ送信可能）';
  }
  return error.message || '通知の送信に失敗しました';
}

interface UnrecordedMembersSectionProps {
  taskId: string;
  unrecordedMemberIds: string[];
  sessionReminders?: Record<string, { sentAt: string; sentBy: string }>;
}

export function UnrecordedMembersSection({
  taskId,
  unrecordedMemberIds,
  sessionReminders,
}: UnrecordedMembersSectionProps) {
  const { getUserName, getUserById } = useUsers();
  const sendReminder = useSendSessionReminder();
  const { addToast } = useToast();
  const [resendIds, setResendIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    setResendIds(new Set());
  }, [taskId]);

  const unnotifiedIds = useMemo(
    () => unrecordedMemberIds.filter((id) => !sessionReminders?.[id]),
    [unrecordedMemberIds, sessionReminders]
  );

  const allNotified = unnotifiedIds.length === 0;

  const handleNotifyAll = useCallback(() => {
    if (unnotifiedIds.length === 0) return;
    sendReminder.mutate(
      { taskId, targetUserIds: unnotifiedIds },
      {
        onSuccess: ({ sentCount }) => addToast(`${sentCount}件の通知を送信しました`, 'success'),
        onError: (error) => addToast(reminderErrorMessage(error), 'error'),
      }
    );
  }, [taskId, unnotifiedIds, sendReminder, addToast]);

  const handleNotifySingle = useCallback(
    (userId: string) => {
      sendReminder.mutate(
        { taskId, targetUserIds: [userId] },
        {
          onSuccess: () => {
            addToast('通知を送信しました', 'success');
            // 再送モード解除は成功時のみ。失敗時はユーザーが再試行できるよう維持する。
            setResendIds((prev) => {
              if (!prev.has(userId)) return prev;
              const next = new Set(prev);
              next.delete(userId);
              return next;
            });
          },
          onError: (error) => addToast(reminderErrorMessage(error), 'error'),
        }
      );
    },
    [taskId, sendReminder, addToast]
  );

  const handleToggleResend = useCallback((userId: string) => {
    setResendIds((prev) => {
      const next = new Set(prev);
      next.add(userId);
      return next;
    });
  }, []);

  return (
    <div className="space-y-2 px-6 py-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-text-tertiary">セッション未記録メンバー</span>
        <Button
          variant="outline"
          size="sm"
          isDisabled={allNotified || sendReminder.isPending}
          onPress={handleNotifyAll}
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
        {unrecordedMemberIds.map((userId) => {
          const user = getUserById(userId);
          const name = getUserName(userId);
          const isNotified = !!sessionReminders?.[userId];
          const isResendMode = resendIds.has(userId);

          return (
            <div key={userId} className="flex items-center justify-between py-1.5">
              <div className="flex items-center gap-2">
                <Avatar
                  name={name}
                  imageUrl={user?.avatarUrl ?? undefined}
                  colorName={user?.avatarColor}
                  size="sm"
                />
                <span className="text-sm font-medium text-text-primary">{name}</span>
              </div>

              {isNotified && !isResendMode ? (
                <Button
                  variant="outline"
                  size="sm"
                  onPress={() => handleToggleResend(userId)}
                  className="h-7 px-2.5 text-xs text-primary-default border-primary-default bg-bg-brand-subtle opacity-100"
                >
                  <Check size={14} />
                  通知済み
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  isDisabled={sendReminder.isPending}
                  onPress={() => handleNotifySingle(userId)}
                  className="h-7 px-2.5 text-xs text-primary-default border-primary-default"
                >
                  {isResendMode ? <RotateCw size={14} /> : <Bell size={14} />}
                  {isResendMode ? '再送' : '通知'}
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
