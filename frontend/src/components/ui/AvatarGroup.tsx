import { Avatar } from './Avatar';
import { cn } from '../../lib/utils';

interface AvatarGroupUser {
  id: string;
  displayName: string;
  avatarUrl?: string | null;
  avatarColor?: string | null;
  imageUrl?: string;
}

interface AvatarGroupProps {
  users: AvatarGroupUser[];
  max?: number;
  size?: 'sm' | 'md';
  className?: string;
}

export function AvatarGroup({ users, max = 5, size = 'sm', className }: AvatarGroupProps) {
  if (users.length === 0) return null;

  const visible = users.slice(0, max);
  const remaining = users.length - max;

  return (
    <div className={cn('flex items-center -space-x-2', className)}>
      {visible.map((user) => (
        <Avatar
          key={user.id}
          name={user.displayName}
          imageUrl={user.avatarUrl ?? user.imageUrl}
          colorName={user.avatarColor}
          size={size}
          className="ring-2 ring-bg-primary"
        />
      ))}
      {remaining > 0 && (
        <span className="ml-1 text-xs font-medium text-text-tertiary">+{remaining}</span>
      )}
    </div>
  );
}
