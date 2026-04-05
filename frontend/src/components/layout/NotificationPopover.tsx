import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Check, MessageSquare, Clock } from 'lucide-react';
import { DialogTrigger, Popover, Dialog } from 'react-aria-components';
import { IconButton } from '../ui/IconButton';
import { Avatar } from '../ui/Avatar';
import { Spinner } from '../ui/Spinner';
import {
  useUnreadNotificationCount,
  useNotifications,
  useMarkNotificationsRead,
} from '../../hooks/useNotifications';
import { useUsers } from '../../hooks/useUsers';
import type { AppNotification } from '../../types';

/**
 * 相対時間を日本語で返す
 */
function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const diff = now - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'たった今';
  if (minutes < 60) return `${minutes}分前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}時間前`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}日前`;
  return new Date(dateStr).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' });
}

function NotificationIcon({ type }: { type: AppNotification['type'] }) {
  if (type === 'mention') return <MessageSquare size={14} className="text-blue-500" />;
  return <Clock size={14} className="text-amber-500" />;
}

function NotificationItem({
  notification,
  onNavigate,
}: {
  notification: AppNotification;
  onNavigate: (n: AppNotification) => void;
}) {
  const { getUserName, getUserById } = useUsers();
  const actor = getUserById(notification.actorId);

  return (
    <button
      type="button"
      onClick={() => onNavigate(notification)}
      className={`flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-bg-secondary ${
        !notification.isRead ? 'bg-blue-50/50 dark:bg-blue-950/20' : ''
      }`}
    >
      <Avatar
        name={getUserName(notification.actorId)}
        imageUrl={actor?.avatarUrl ?? undefined}
        colorName={actor?.avatarColor}
        size="sm"
        className="mt-0.5 shrink-0"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <NotificationIcon type={notification.type} />
          <span className="truncate text-sm font-medium text-text-primary">
            {notification.title}
          </span>
        </div>
        <p className="mt-0.5 truncate text-xs text-text-secondary">{notification.body}</p>
        <span className="mt-1 block text-xs text-text-tertiary">
          {formatRelativeTime(notification.createdAt)}
        </span>
      </div>
      {!notification.isRead && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-blue-500" />}
    </button>
  );
}

export function NotificationPopover() {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const { data: unreadCount = 0 } = useUnreadNotificationCount();
  const { data: notifications, isLoading } = useNotifications(isOpen);
  const markRead = useMarkNotificationsRead();

  const handleNavigate = useCallback(
    (n: AppNotification) => {
      if (!n.isRead) {
        markRead.mutate({ notificationIds: [n.id] });
      }
      setIsOpen(false);
      if (n.taskId) {
        navigate(`/tasks?task=${n.taskId}`);
      }
    },
    [markRead, navigate]
  );

  const handleMarkAllRead = useCallback(() => {
    markRead.mutate({ all: true });
  }, [markRead]);

  return (
    <DialogTrigger isOpen={isOpen} onOpenChange={setIsOpen}>
      <div className="relative">
        <IconButton aria-label="通知" className="h-9 w-9 rounded-md border border-border-default">
          <Bell size={18} />
        </IconButton>
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-500 px-1 text-[10px] font-bold text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </div>
      <Popover
        placement="bottom end"
        offset={8}
        className="w-[380px] rounded-lg border border-border-default bg-bg-primary shadow-lg outline-none"
      >
        <Dialog className="outline-none">
          <div className="flex items-center justify-between border-b border-border-default px-4 py-3">
            <h3 className="text-sm font-bold text-text-primary">通知</h3>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="flex items-center gap-1 text-xs text-primary-default hover:text-primary-hover"
              >
                <Check size={12} />
                すべて既読にする
              </button>
            )}
          </div>

          <div className="max-h-[400px] overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Spinner size="md" />
              </div>
            ) : notifications && notifications.length > 0 ? (
              <div className="divide-y divide-border-default">
                {notifications.map((n) => (
                  <NotificationItem key={n.id} notification={n} onNavigate={handleNavigate} />
                ))}
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-text-tertiary">通知はありません</p>
            )}
          </div>
        </Dialog>
      </Popover>
    </DialogTrigger>
  );
}
