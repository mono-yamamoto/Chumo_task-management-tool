'use client';

import { useState } from 'react';
import { Box, TextField, CircularProgress } from '@mui/material';
import { Send } from '@mui/icons-material';
import { Button } from '@/components/ui/button';

interface CommentFormProps {
  onSubmit: (content: string) => void;
  isSubmitting?: boolean;
  placeholder?: string;
}

export function CommentForm({
  onSubmit,
  isSubmitting = false,
  placeholder = 'コメントを入力...',
}: CommentFormProps) {
  const [content, setContent] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (content.trim() && !isSubmitting) {
      onSubmit(content.trim());
      setContent('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Ctrl+Enter または Cmd+Enter で送信
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      if (content.trim() && !isSubmitting) {
        onSubmit(content.trim());
        setContent('');
      }
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', gap: 1 }}>
      <TextField
        fullWidth
        multiline
        rows={2}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        inputProps={{ 'aria-label': 'コメントを入力' }}
        size="small"
        disabled={isSubmitting}
        sx={{ flex: 1 }}
      />
      <Button
        type="submit"
        variant="default"
        size="sm"
        disabled={!content.trim() || isSubmitting}
        aria-label="コメントを送信"
        sx={{
          minWidth: 'auto',
          px: 2,
          alignSelf: 'flex-end',
        }}
      >
        {isSubmitting ? <CircularProgress size={16} color="inherit" /> : <Send fontSize="small" />}
      </Button>
    </Box>
  );
}
