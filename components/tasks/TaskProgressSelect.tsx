'use client';

import { FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import { ProgressStatus } from '@/types';
import { PROGRESS_STATUS_OPTIONS } from '@/constants/taskConstants';

interface TaskProgressSelectProps {
  value: ProgressStatus | null;
  onChange: (value: ProgressStatus | null) => void;
  label?: string;
  fullWidth?: boolean;
  disabled?: boolean;
}

export function TaskProgressSelect({
  value,
  onChange,
  label = '進捗',
  fullWidth = true,
  disabled = false,
}: TaskProgressSelectProps) {
  return (
    <FormControl fullWidth={fullWidth} disabled={disabled}>
      <InputLabel>{label}</InputLabel>
      <Select
        value={value || ''}
        onChange={(e) => onChange((e.target.value as ProgressStatus) || null)}
        label={label}
      >
        {PROGRESS_STATUS_OPTIONS.map((status) => (
          <MenuItem key={status} value={status}>
            {status}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}
