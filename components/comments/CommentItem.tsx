'use client';

import { useState, useRef } from 'react';
import { Box, Typography, IconButton } from '@mui/material';
import { Edit, Delete, Check, Close } from '@mui/icons-material';
import { format } from 'date-fns';
import DOMPurify from 'dompurify';
import { TaskComment, User } from '@/types';
import { CommentEditor, CommentEditorHandle } from './CommentEditor';

// HTMLコンテンツかどうかを判定（後方互換性のため）
function isHtmlContent(content: string): boolean {
  return content.startsWith('<') && content.includes('</');
}

// プレーンテキストをHTMLに変換（既存コメントの後方互換性）
function plainTextToHtml(text: string): string {
  // URLを検出してリンクに変換
  const urlRegex = /(https?:\/\/[^\s<>"{}|\\^`[\]]+)/g;
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>');

  return `<p>${escaped.replace(urlRegex, '<a href="$1" target="_blank" rel="noopener noreferrer" class="comment-link">$1</a>')}</p>`;
}

// 自分宛のメンションにハイライトクラスを追加
function highlightSelfMentions(html: string, currentUserId: string): string {
  // data-id="currentUserId" を持つメンションに追加クラスを付与
  const regex = new RegExp(
    `<span([^>]*)class="comment-mention"([^>]*)data-id="${currentUserId}"([^>]*)>`,
    'g'
  );
  const regex2 = new RegExp(
    `<span([^>]*)data-id="${currentUserId}"([^>]*)class="comment-mention"([^>]*)>`,
    'g'
  );

  return html
    .replace(regex, '<span$1class="comment-mention comment-mention-self"$2data-id="' + currentUserId + '"$3>')
    .replace(regex2, '<span$1data-id="' + currentUserId + '"$2class="comment-mention comment-mention-self"$3>');
}

interface CommentItemProps {
  comment: TaskComment;
  currentUserId: string;
  users: User[];
  projectType: string;
  taskId: string;
  onUpdate: (commentId: string, content: string, mentionedUserIds: string[]) => void;
  onDelete: (commentId: string) => void;
  isUpdating?: boolean;
  isDeleting?: boolean;
}

export function CommentItem({
  comment,
  currentUserId,
  users,
  projectType,
  taskId,
  onUpdate,
  onDelete,
  isUpdating,
  isDeleting,
}: CommentItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const editorRef = useRef<CommentEditorHandle>(null);

  const author = users?.find((u) => u.id === comment.authorId);
  const isOwner = comment.authorId === currentUserId;
  const isUnread = !comment.readBy.includes(currentUserId);

  // 表示用のHTMLコンテンツを取得（XSS対策でサニタイズ）
  const rawHtml = isHtmlContent(comment.content)
    ? comment.content
    : plainTextToHtml(comment.content);
  const sanitizedHtml = DOMPurify.sanitize(rawHtml, {
    ALLOWED_TAGS: ['p', 'br', 'a', 'span', 'img', 'strong', 'em'],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'class', 'data-id', 'src', 'alt'],
  });
  const displayHtml = highlightSelfMentions(sanitizedHtml, currentUserId);

  const handleSave = () => {
    if (!editorRef.current) return;

    const html = editorRef.current.getHTML();
    const mentionedUserIds = editorRef.current.getMentionedUserIds();

    if (!editorRef.current.isEmpty() && html !== comment.content) {
      onUpdate(comment.id, html, mentionedUserIds);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
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
        backgroundColor: isUnread
          ? 'rgba(59, 130, 246, 0.08)'
          : isOwner
            ? 'rgba(59, 130, 246, 0.05)'
            : 'transparent',
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
          <CommentEditor
            ref={editorRef}
            users={users}
            projectType={projectType}
            taskId={taskId}
            initialContent={comment.content}
            disabled={isUpdating}
          />
          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
            <IconButton size="small" onClick={handleCancel} disabled={isUpdating} aria-label="編集をキャンセル">
              <Close fontSize="small" />
            </IconButton>
            <IconButton
              size="small"
              onClick={handleSave}
              disabled={isUpdating}
              sx={{ color: 'primary.main' }}
              aria-label="コメントを保存"
            >
              <Check fontSize="small" />
            </IconButton>
          </Box>
        </Box>
      ) : (
        <Box
          sx={{
            '& .comment-mention': {
              backgroundColor: 'primary.light',
              color: 'primary.contrastText',
              borderRadius: '4px',
              px: 0.5,
              py: 0.25,
              fontWeight: 500,
            },
            '& .comment-mention-self': {
              backgroundColor: '#22c55e',
              color: '#ffffff',
            },
            '& .comment-link': {
              color: 'primary.main',
              textDecoration: 'none',
              wordBreak: 'break-all',
              '&:hover': {
                textDecoration: 'underline',
              },
            },
            '& .comment-image, & img': {
              maxWidth: '100%',
              height: 'auto',
              borderRadius: '4px',
              my: 1,
              display: 'block',
            },
            '& p': {
              margin: 0,
            },
            '& a': {
              color: 'primary.main',
              textDecoration: 'none',
              wordBreak: 'break-all',
              '&:hover': {
                textDecoration: 'underline',
              },
            },
            fontSize: '0.875rem',
            lineHeight: 1.5,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
          dangerouslySetInnerHTML={{ __html: displayHtml }}
        />
      )}
    </Box>
  );
}
