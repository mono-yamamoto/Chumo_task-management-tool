'use client';

import { FormControl, InputLabel, Select, MenuItem, OutlinedInput, Checkbox, ListItemText } from '@mui/material';
import { User } from '@/types';

interface TaskAssigneeSelectProps {
  value: string[];
  onChange: (value: string[]) => void;
  users: User[] | undefined;
  label?: string;
  fullWidth?: boolean;
}

export function TaskAssigneeSelect({
  value,
  onChange,
  users,
  label = 'アサイン（担当者）',
  fullWidth = true,
}: TaskAssigneeSelectProps) {
  return (
    <FormControl fullWidth={fullWidth}>
      <InputLabel>{label}</InputLabel>
      <Select
        multiple
        value={value}
        onChange={(e) => {
          const newValue = typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value;
          onChange(newValue);
        }}
        input={<OutlinedInput label={label} />}
        renderValue={(selected) => {
          if (selected.length === 0) return '';
          return (
            users
              ?.filter((userItem) => selected.includes(userItem.id))
              .map((userItem) => userItem.displayName)
              .join(', ') || ''
          );
        }}
      >
        {users?.map((userItem) => (
          <MenuItem key={userItem.id} value={userItem.id}>
            <Checkbox checked={value.indexOf(userItem.id) > -1} />
            <ListItemText primary={userItem.displayName} />
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}

