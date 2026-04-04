import { useState } from 'react';
import { Send, Trash2 } from 'lucide-react';
import { Avatar } from '../../ui/Avatar';
import { Spinner } from '../../ui/Spinner';
import {
  useTaskComments,
  useCreateComment,
  useDeleteComment,
} from '../../../hooks/useTaskComments';
import { useUsers } from '../../../hooks/useUsers';
import { useAuth } from '../../../hooks/useAuth';
import type { TaskComment } from '../../../types';

interface CommentTabProps {
  taskId: string | null;
  projectType: string | null;
}

export function CommentTab({ taskId, projectType }: CommentTabProps) {
  const { data: comments, isLoading } = useTaskComments(taskId, projectType);
  const { getUserName, getUserById } = useUsers();
  const { userId } = useAuth();

  if (!taskId || !projectType) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-sm text-text-tertiary">タスクを選択してください</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="md" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* コメント一覧 */}
      <div className="flex-1 overflow-y-auto space-y-4">
        {comments && comments.length > 0 ? (
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
          <p className="py-8 text-center text-sm text-text-tertiary">コメントはまだありません</p>
        )}
      </div>

      {/* 投稿フォーム */}
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
    <div className="group flex gap-3">
      <Avatar
        name={authorName}
        imageUrl={authorAvatarUrl}
        colorName={authorAvatarColor}
        size="sm"
        className="mt-0.5 shrink-0"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-text-primary">{authorName}</span>
          <span className="text-xs text-text-tertiary">
            {createdAt.toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })}{' '}
            {createdAt.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
          </span>
          {isOwn && (
            <button
              type="button"
              onClick={() => deleteComment.mutate({ commentId: comment.id, taskId })}
              className="ml-auto hidden rounded p-1 text-text-tertiary hover:bg-error-bg hover:text-error-text group-hover:block"
              aria-label="コメントを削除"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
        <p className="mt-1 text-sm leading-relaxed text-text-secondary whitespace-pre-wrap">
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
    <div className="border-t border-border-default pt-3">
      <div className="flex gap-2">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="コメントを入力... (Cmd+Enter で送信)"
          rows={2}
          className="flex-1 resize-none rounded-md border border-border-default bg-bg-secondary px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:border-primary-default focus:outline-none"
        />
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!content.trim() || createComment.isPending}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary-default text-white transition-colors hover:bg-primary-hover disabled:opacity-40"
          aria-label="コメントを送信"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
