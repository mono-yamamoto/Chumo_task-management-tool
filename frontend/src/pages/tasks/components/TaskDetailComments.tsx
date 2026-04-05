import { useState } from 'react';
import { Send, Trash2 } from 'lucide-react';
import { Avatar } from '../../../components/ui/Avatar';
import { IconButton } from '../../../components/ui/IconButton';
import { Spinner } from '../../../components/ui/Spinner';
import {
  useTaskComments,
  useCreateComment,
  useDeleteComment,
} from '../../../hooks/useTaskComments';
import { useUsers } from '../../../hooks/useUsers';
import { useAuth } from '../../../hooks/useAuth';
import type { TaskComment } from '../../../types';

interface TaskDetailCommentsProps {
  taskId: string;
  projectType: string;
}

export function TaskDetailComments({ taskId, projectType }: TaskDetailCommentsProps) {
  const { data: comments, isLoading } = useTaskComments(taskId, projectType);
  const { getUserName, getUserById } = useUsers();
  const { userId } = useAuth();

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-md font-bold text-text-primary">コメント</h2>

      {isLoading ? (
        <div className="flex justify-center py-4">
          <Spinner size="md" />
        </div>
      ) : comments && comments.length > 0 ? (
        comments.map((comment) => (
          <CommentItem
            key={comment.id}
            comment={comment}
            authorName={getUserName(comment.authorId)}
            authorAvatarUrl={getUserById(comment.authorId)?.avatarUrl ?? undefined}
            authorAvatarColor={getUserById(comment.authorId)?.avatarColor}
            isOwn={comment.authorId === userId}
            taskId={taskId}
          />
        ))
      ) : (
        <p className="py-4 text-center text-sm text-text-tertiary">コメントはまだありません</p>
      )}

      {/* 入力欄 */}
      <CommentForm taskId={taskId} projectType={projectType} />
    </div>
  );
}

function CommentItem({
  comment,
  authorName,
  authorAvatarUrl,
  authorAvatarColor,
  isOwn,
  taskId,
}: {
  comment: TaskComment;
  authorName: string;
  authorAvatarUrl?: string;
  authorAvatarColor?: string | null;
  isOwn: boolean;
  taskId: string;
}) {
  const deleteComment = useDeleteComment();
  const createdAt = new Date(comment.createdAt);

  return (
    <div className="group flex gap-2">
      <Avatar
        name={authorName}
        imageUrl={authorAvatarUrl}
        colorName={authorAvatarColor}
        size="sm"
        className="h-7 w-7 shrink-0"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
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
        <p className="whitespace-pre-wrap text-sm leading-normal text-text-primary">
          {comment.content}
        </p>
      </div>
    </div>
  );
}

function CommentForm({ taskId, projectType }: { taskId: string; projectType: string }) {
  const [content, setContent] = useState('');
  const createComment = useCreateComment();

  const handleSubmit = () => {
    const trimmed = content.trim();
    if (!trimmed) return;

    createComment.mutate(
      { taskId, projectType, content: trimmed },
      { onSuccess: () => setContent('') }
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="flex gap-2">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="コメントを入力... (Cmd+Enter で送信)"
        rows={2}
        className="flex-1 resize-none rounded-md border border-border-default bg-bg-secondary px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:border-primary-default focus:outline-none"
      />
      <IconButton
        onPress={handleSubmit}
        isDisabled={!content.trim() || createComment.isPending}
        aria-label="コメントを送信"
        className="shrink-0 self-end bg-primary-default text-white hover:bg-primary-hover hover:text-white"
      >
        <Send size={16} />
      </IconButton>
    </div>
  );
}
