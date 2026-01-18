'use client';

import { useState } from 'react';
import { Box, Typography, IconButton, TextField, Link } from '@mui/material';
import { Edit, Delete, Check, Close } from '@mui/icons-material';
import { format } from 'date-fns';
import { TaskComment, User } from '@/types';

// URLを検出する正規表現
const URL_REGEX = /(https?:\/\/[^\s<>"{}|\\^`[\]]+)/g;

// テキスト内のURLをリンクに変換する関数
function renderContentWithLinks(content: string): React.ReactNode {
  const parts = content.split(URL_REGEX);

  return parts.map((part, index) => {
    if (URL_REGEX.test(part)) {
      // URLの場合はリンクとして表示
      return (
        <Link
          key={index}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          sx={{
            color: 'primary.main',
            wordBreak: 'break-all',
            '&:hover': { textDecoration: 'underline' },
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {part}
        </Link>
      );
    }
    // 通常のテキスト
    return part;
  });
}

interface CommentItemProps {
  comment: TaskComment;
  currentUserId: string;
  users: User[] | undefined;
  onUpdate: (commentId: string, content: string) => void;
  onDelete: (commentId: string) => void;
  isUpdating?: boolean;
  isDeleting?: boolean;
}

export function CommentItem({
  comment,
  currentUserId,
  users,
  onUpdate,
  onDelete,
  isUpdating,
  isDeleting,
}: CommentItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);

  const author = users?.find((u) => u.id === comment.authorId);
  const isOwner = comment.authorId === currentUserId;
  const isUnread = !comment.readBy.includes(currentUserId);

  const handleSave = () => {
    if (editContent.trim() && editContent !== comment.content) {
      onUpdate(comment.id, editContent.trim());
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditContent(comment.content);
    setIsEditing(false);
  };

  const handleDelete = () => {
    if (window.confirm('このコメントを削除しますか？')) {
      onDelete(comment.id);
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 0.5,
        p: 1.5,
        borderRadius: 1,
        backgroundColor: isUnread ? 'rgba(59, 130, 246, 0.08)' : 'transparent',
        borderLeft: isUnread ? '3px solid #3b82f6' : '3px solid transparent',
        transition: 'background-color 0.2s',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
            {author?.displayName || '不明なユーザー'}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {format(comment.createdAt, 'yyyy/MM/dd HH:mm')}
          </Typography>
          {comment.createdAt.getTime() !== comment.updatedAt.getTime() && (
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              (編集済み)
            </Typography>
          )}
        </Box>
        {isOwner && !isEditing && (
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <IconButton
              size="small"
              onClick={() => setIsEditing(true)}
              disabled={isUpdating || isDeleting}
              sx={{ padding: 0.5 }}
            >
              <Edit fontSize="small" sx={{ fontSize: 16 }} />
            </IconButton>
            <IconButton
              size="small"
              onClick={handleDelete}
              disabled={isUpdating || isDeleting}
              sx={{ padding: 0.5, color: 'error.main' }}
            >
              <Delete fontSize="small" sx={{ fontSize: 16 }} />
            </IconButton>
          </Box>
        )}
      </Box>

      {isEditing ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <TextField
            fullWidth
            multiline
            rows={2}
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            size="small"
            autoFocus
          />
          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
            <IconButton size="small" onClick={handleCancel} disabled={isUpdating}>
              <Close fontSize="small" />
            </IconButton>
            <IconButton
              size="small"
              onClick={handleSave}
              disabled={isUpdating || !editContent.trim()}
              sx={{ color: 'primary.main' }}
            >
              <Check fontSize="small" />
            </IconButton>
          </Box>
        </Box>
      ) : (
        <Typography
          variant="body2"
          component="div"
          sx={{
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {renderContentWithLinks(comment.content)}
        </Typography>
      )}
    </Box>
  );
}
