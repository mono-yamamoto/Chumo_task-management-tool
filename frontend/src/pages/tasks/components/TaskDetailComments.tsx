import { Spinner } from '../../../components/ui/Spinner';
import { useTaskComments } from '../../../hooks/useTaskComments';
import { useUsers } from '../../../hooks/useUsers';
import { useAuth } from '../../../hooks/useAuth';
import { CommentItem } from '../../../components/shared/comments/CommentItem';
import { CommentForm } from '../../../components/shared/comments/CommentForm';

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
            currentUserId={userId ?? ''}
            taskId={taskId}
            compact
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
