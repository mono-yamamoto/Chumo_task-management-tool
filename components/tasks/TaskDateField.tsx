'use client';

import { TextField } from '@mui/material';
import { format } from 'date-fns';

interface TaskDateFieldProps {
  label: string;
  value: Date | null;
  onChange: (value: Date | null) => void;
  disabled?: boolean;
  fullWidth?: boolean;
}

export function TaskDateField({
  label,
  value,
  onChange,
  disabled = false,
  fullWidth = true,
}: TaskDateFieldProps) {
  const dateValue = value ? format(value, 'yyyy-MM-dd') : '';

  return (
    <TextField
      fullWidth={fullWidth}
      label={label}
      type="date"
      value={dateValue}
      onChange={(e) => {
        onChange(e.target.value ? new Date(e.target.value) : null);
      }}
      InputLabelProps={{ shrink: true }}
      disabled={disabled}
      variant="outlined"
    />
  );
}

