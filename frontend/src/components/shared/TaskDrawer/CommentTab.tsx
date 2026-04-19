import { Spinner } from '../../ui/Spinner';
import { useTaskComments } from '../../../hooks/useTaskComments';
import { useUsers } from '../../../hooks/useUsers';
import { useAuth } from '../../../hooks/useAuth';
import { CommentItem } from '../comments/CommentItem';
import { CommentForm } from '../comments/CommentForm';

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
              currentUserId={userId ?? ''}
              taskId={taskId}
            />
          ))
        ) : (
          <p className="py-8 text-center text-sm text-text-tertiary">コメントはまだありません</p>
        )}
      </div>

      {/* 投稿フォーム */}
      <CommentForm
        taskId={taskId}
        projectType={projectType}
        className="border-t border-border-default pt-3"
      />
    </div>
  );
}
