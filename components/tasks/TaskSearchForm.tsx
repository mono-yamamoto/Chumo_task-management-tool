'use client';

import { TextField } from '@mui/material';
import { Search } from '@mui/icons-material';
import { InputAdornment } from '@mui/material';

interface TaskSearchFormProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  fullWidth?: boolean;
}

/**
 * タスクタイトル検索用の共通フォームコンポーネント
 * 他の場所でも再利用可能な設計
 */
export function TaskSearchForm({
  value,
  onChange,
  placeholder = 'タイトルで検索...',
  label = 'タイトル検索',
  fullWidth = true,
}: TaskSearchFormProps) {
  return (
    <TextField
      fullWidth={fullWidth}
      label={label}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      variant="outlined"
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            <Search />
          </InputAdornment>
        ),
      }}
    />
  );
}
