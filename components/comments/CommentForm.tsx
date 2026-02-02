'use client';

import { useRef } from 'react';
import { Box, CircularProgress } from '@mui/material';
import { Send } from '@mui/icons-material';
import { Button } from '@/components/ui/button';
import { CommentEditor, CommentEditorHandle } from './CommentEditor';
import { User } from '@/types';

interface CommentFormProps {
  users: User[];
  projectType: string;
  taskId: string;
  onSubmit: (content: string, mentionedUserIds: string[]) => void;
  isSubmitting?: boolean;
  placeholder?: string;
}

export function CommentForm({
  users,
  projectType,
  taskId,
  onSubmit,
  isSubmitting = false,
  placeholder = 'コメントを入力...',
}: CommentFormProps) {
  const editorRef = useRef<CommentEditorHandle>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitComment();
  };

  const submitComment = () => {
    if (!editorRef.current || editorRef.current.isEmpty() || isSubmitting) {
      return;
    }

    const html = editorRef.current.getHTML();
    const mentionedUserIds = editorRef.current.getMentionedUserIds();

    onSubmit(html, mentionedUserIds);
    editorRef.current.clear();
  };

  const handleEditorSubmit = (html: string, mentionedUserIds: string[]) => {
    if (isSubmitting) return;
    onSubmit(html, mentionedUserIds);
    editorRef.current?.clear();
  };

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}
    >
      <CommentEditor
        ref={editorRef}
        users={users}
        projectType={projectType}
        taskId={taskId}
        placeholder={placeholder}
        disabled={isSubmitting}
        onSubmit={handleEditorSubmit}
      />
      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          type="submit"
          variant="default"
          size="sm"
          disabled={isSubmitting}
          aria-label="コメントを送信"
          sx={{
            minWidth: 'auto',
            px: 2,
          }}
        >
          {isSubmitting ? (
            <CircularProgress size={16} color="inherit" />
          ) : (
            <Send fontSize="small" />
          )}
        </Button>
      </Box>
    </Box>
  );
}
