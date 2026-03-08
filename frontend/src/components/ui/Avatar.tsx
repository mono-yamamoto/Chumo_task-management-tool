import { cn } from '../../lib/utils';

const AVATAR_COLORS = [
  'bg-teal-500',
  'bg-pink-500',
  'bg-purple-500',
  'bg-blue-500',
  'bg-amber-500',
  'bg-cyan-500',
  'bg-green-500',
  'bg-red-500',
] as const;

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length] ?? AVATAR_COLORS[0];
}

function getInitials(name: string): string {
  // 日本語名の場合は最初の1文字
  if (/[\u3000-\u9fff]/.test(name)) {
    return name.charAt(0);
  }
  // 英語名の場合はイニシャル
  return name
    .split(' ')
    .filter((n) => n.length > 0)
    .map((n) => n.charAt(0))
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

const sizeStyles = {
  sm: 'h-6 w-6 text-xs',
  md: 'h-8 w-8 text-sm',
  lg: 'h-10 w-10 text-md',
} as const;

interface AvatarProps {
  name: string;
  imageUrl?: string;
  size?: keyof typeof sizeStyles;
  className?: string;
}

export function Avatar({ name, imageUrl, size = 'md', className }: AvatarProps) {
  const initials = getInitials(name);
  const colorClass = getAvatarColor(name);

  return (
    <div
      className={cn(
        'inline-flex items-center justify-center rounded-full font-medium text-white shrink-0',
        sizeStyles[size],
        !imageUrl && colorClass,
        className
      )}
      title={name}
    >
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={name}
          className="h-full w-full rounded-full object-cover"
          loading="lazy"
        />
      ) : (
        initials
      )}
    </div>
  );
}
