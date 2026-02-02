'use client';

import { useEffect, useRef } from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';
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
  // マウント時に一度だけ既読処理を実行するためのフラグ
  const hasMarkedAsRead = useRef(false);

  const {
    comments,
    isLoading,
    unreadCount,
    createComment,
    updateComment,
    deleteComment,
    markAsRead,
  } = useTaskCommentsManager(projectType, taskId, currentUserId);

  // コンポーネントがマウントされたとき、未読コメントがあれば一度だけ既読にする
  useEffect(() => {
    if (unreadCount > 0 && projectType && taskId && currentUserId && !hasMarkedAsRead.current) {
      hasMarkedAsRead.current = true;
      markAsRead.mutate({
        projectType,
        taskId,
        userId: currentUserId,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unreadCount, projectType, taskId, currentUserId]);

  const handleCreateComment = (content: string, mentionedUserIds: string[]) => {
    createComment.mutate({
      projectType,
      taskId,
      authorId: currentUserId,
      content,
      mentionedUserIds,
    });
  };

  const handleUpdateComment = (commentId: string, content: string, mentionedUserIds: string[]) => {
    updateComment.mutate({
      projectType,
      commentId,
      content,
      mentionedUserIds,
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
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
      }}
    >
      {/* コメント一覧 */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column-reverse',
          gap: 1,
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          pr: 1,
        }}
      >
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
            <CircularProgress size={24} />
          </Box>
        ) : comments.length > 0 ? (
          [...comments]
            .reverse()
            .map((comment: TaskComment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                currentUserId={currentUserId}
                users={users ?? []}
                projectType={projectType}
                taskId={taskId}
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

      {/* コメント入力フォーム */}
      <Box sx={{ flexShrink: 0, mt: 2 }}>
        <CommentForm
          users={users ?? []}
          projectType={projectType}
          taskId={taskId}
          onSubmit={handleCreateComment}
          isSubmitting={createComment.isPending}
        />
      </Box>
    </Box>
  );
}
