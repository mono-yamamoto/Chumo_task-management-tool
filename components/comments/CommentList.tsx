'use client';

import { useEffect } from 'react';
import { Box, Typography, CircularProgress, Divider } from '@mui/material';
import { Comment as CommentIcon } from '@mui/icons-material';
import { TaskComment, User, ProjectType } from '@/types';
import { CommentItem } from './CommentItem';
import { CommentForm } from './CommentForm';
import { useTaskCommentsManager } from '@/hooks/useTaskComments';

interface CommentListProps {
  projectType: ProjectType;
  taskId: string;
  currentUserId: string;
  users: User[] | undefined;
}

export function CommentList({ projectType, taskId, currentUserId, users }: CommentListProps) {
  const {
    comments,
    isLoading,
    unreadCount,
    createComment,
    updateComment,
    deleteComment,
    markAsRead,
  } = useTaskCommentsManager(projectType, taskId, currentUserId);

  // コンポーネントがマウントされたとき、または未読コメントがある場合に既読にする
  useEffect(() => {
    if (unreadCount > 0 && projectType && taskId && currentUserId) {
      markAsRead.mutate({
        projectType,
        taskId,
        userId: currentUserId,
      });
    }
  }, [unreadCount, projectType, taskId, currentUserId, markAsRead]);

  const handleCreateComment = (content: string) => {
    createComment.mutate({
      projectType,
      taskId,
      authorId: currentUserId,
      content,
    });
  };

  const handleUpdateComment = (commentId: string, content: string) => {
    updateComment.mutate({
      projectType,
      commentId,
      content,
      taskId,
    });
  };

  const handleDeleteComment = (commentId: string) => {
    deleteComment.mutate({
      projectType,
      commentId,
      taskId,
    });
  };

  return (
    <Box
      sx={{
        mt: 3,
        pt: 3,
        borderTop: 1,
        borderColor: 'divider',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CommentIcon fontSize="small" sx={{ color: 'text.secondary' }} />
          <Typography variant="h6" sx={{ fontWeight: 'semibold' }}>
            コメント
          </Typography>
          {comments.length > 0 && (
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              ({comments.length})
            </Typography>
          )}
        </Box>
      </Box>

      {/* コメント入力フォーム */}
      <CommentForm onSubmit={handleCreateComment} isSubmitting={createComment.isPending} />

      <Divider sx={{ my: 2 }} />

      {/* コメント一覧 */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
            <CircularProgress size={24} />
          </Box>
        ) : comments.length > 0 ? (
          comments.map((comment: TaskComment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              currentUserId={currentUserId}
              users={users}
              onUpdate={handleUpdateComment}
              onDelete={handleDeleteComment}
              isUpdating={updateComment.isPending}
              isDeleting={deleteComment.isPending}
            />
          ))
        ) : (
          <Typography
            sx={{
              color: 'text.secondary',
              py: 2,
              fontSize: '0.875rem',
              textAlign: 'center',
            }}
          >
            コメントはまだありません
          </Typography>
        )}
      </Box>
    </Box>
  );
}
