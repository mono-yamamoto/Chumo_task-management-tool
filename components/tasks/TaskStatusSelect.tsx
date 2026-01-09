'use client';

import { FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import { FlowStatus } from '@/types';
import { FLOW_STATUS_OPTIONS } from '@/constants/taskConstants';

interface TaskStatusSelectProps {
  value: FlowStatus;
  onChange: (value: FlowStatus) => void;
  label?: string;
  fullWidth?: boolean;
  disabled?: boolean;
}

export function TaskStatusSelect({
  value,
  onChange,
  label = 'ステータス',
  fullWidth = true,
  disabled = false,
}: TaskStatusSelectProps) {
  return (
    <FormControl fullWidth={fullWidth} disabled={disabled}>
      <InputLabel>{label}</InputLabel>
      <Select value={value} onChange={(e) => onChange(e.target.value as FlowStatus)} label={label}>
        {FLOW_STATUS_OPTIONS.map((status) => (
          <MenuItem key={status} value={status}>
            {status}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}
