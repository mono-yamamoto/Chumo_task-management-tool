'use client';

import { FormControl, InputLabel, Select, MenuItem, Box, FormHelperText } from '@mui/material';
import { Label } from '@/types';

interface TaskLabelSelectProps {
  value: string;
  onChange: (value: string) => void;
  labels: Label[] | undefined;
  isLoading?: boolean;
  label?: string;
  fullWidth?: boolean;
  required?: boolean;
  disabled?: boolean;
}

export function TaskLabelSelect({
  value,
  onChange,
  labels,
  isLoading = false,
  label = '区分',
  fullWidth = true,
  required = false,
  disabled = false,
}: TaskLabelSelectProps) {
  return (
    <FormControl fullWidth={fullWidth} required={required} disabled={disabled || isLoading}>
      <InputLabel>{label}</InputLabel>
      <Select value={value} onChange={(e) => onChange(e.target.value)} label={label}>
        <MenuItem value="">
          <em>選択してください</em>
        </MenuItem>
        {labels?.map((labelItem) => (
          <MenuItem key={labelItem.id} value={labelItem.id}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box
                sx={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  backgroundColor: labelItem.color,
                }}
              />
              {labelItem.name}
            </Box>
          </MenuItem>
        ))}
      </Select>
      {labels?.length === 0 && !isLoading && (
        <Box sx={{ mt: 1 }}>
          <FormHelperText error>
            区分ラベルが設定されていません。管理者に連絡してください。
          </FormHelperText>
        </Box>
      )}
    </FormControl>
  );
}

