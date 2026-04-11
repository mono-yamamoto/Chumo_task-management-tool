import { Trash2 } from 'lucide-react';
import { Avatar } from '../../ui/Avatar';
import { IconButton } from '../../ui/IconButton';
import { useDeleteComment } from '../../../hooks/useTaskComments';
import { CommentContent } from './CommentContent';
import type { TaskComment } from '../../../types';

interface CommentItemProps {
  comment: TaskComment;
  authorName: string;
  authorAvatarUrl?: string;
  authorAvatarColor?: string | null;
  isOwn: boolean;
  currentUserId: string;
  taskId: string;
  compact?: boolean;
}

export function CommentItem({
  comment,
  authorName,
  authorAvatarUrl,
  authorAvatarColor,
  isOwn,
  currentUserId,
  taskId,
  compact = false,
}: CommentItemProps) {
  const deleteComment = useDeleteComment();
  const createdAt = new Date(comment.createdAt);

  return (
    <div className={`group flex ${compact ? 'gap-2' : 'gap-3'}`}>
      <Avatar
        name={authorName}
        imageUrl={authorAvatarUrl}
        colorName={authorAvatarColor}
        size="sm"
        className={compact ? 'h-7 w-7 shrink-0' : 'mt-0.5 shrink-0'}
      />
      <div className={compact ? 'flex min-w-0 flex-1 flex-col gap-1' : 'min-w-0 flex-1'}>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-text-primary">{authorName}</span>
          <span className="text-xs text-text-tertiary">
            {createdAt.toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })}{' '}
            {createdAt.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
          </span>
          {isOwn && (
            <IconButton
              onPress={() => deleteComment.mutate({ commentId: comment.id, taskId })}
              aria-label="コメントを削除"
              size="sm"
              className="ml-auto hidden rounded p-1 text-text-tertiary hover:bg-error-bg hover:text-error-text group-hover:block"
            >
              <Trash2 size={14} />
            </IconButton>
          )}
        </div>
        <CommentContent content={comment.content} currentUserId={currentUserId} />
      </div>
    </div>
  );
}
