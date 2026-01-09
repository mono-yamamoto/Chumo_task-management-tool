'use client';

import { FormControl, InputLabel, Select, MenuItem, TextField, Grid, Box } from '@mui/material';
import { Button as CustomButton } from '@/components/ui/button';
import { Priority } from '@/types';
import { PROJECT_TYPES, ProjectType } from '@/constants/projectTypes';
import { PRIORITY_OPTIONS, PRIORITY_LABELS } from '@/constants/taskConstants';
import { useTaskForm, TaskFormData } from '@/hooks/useTaskForm';
import { TaskStatusSelect } from './TaskStatusSelect';
import { TaskLabelSelect } from './TaskLabelSelect';
import { TaskAssigneeSelect } from './TaskAssigneeSelect';
import { TaskDateField } from './TaskDateField';
import { useKubunLabels } from '@/hooks/useKubunLabels';
import { useUsers } from '@/hooks/useUsers';

interface TaskFormProps {
  initialData?: Partial<import('@/types').Task> | null;
  onSubmit: (formData: TaskFormData) => void;
  onCancel?: () => void;
  submitLabel?: string;
  cancelLabel?: string;
  isSubmitting?: boolean;
  showProjectType?: boolean;
}

export function TaskForm({
  initialData,
  onSubmit,
  onCancel,
  submitLabel = '保存',
  cancelLabel = 'キャンセル',
  isSubmitting = false,
  showProjectType = true,
}: TaskFormProps) {
  const { formData, updateField, validate } = useTaskForm(initialData);
  const { data: labels, isLoading: labelsLoading } = useKubunLabels();
  const { data: allUsers } = useUsers();

  const handleSubmit = () => {
    const validation = validate();
    if (!validation.isValid) {
      alert(validation.errors.join('\n'));
      return;
    }
    onSubmit(formData);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {showProjectType && (
        <FormControl fullWidth required>
          <InputLabel>プロジェクト</InputLabel>
          <Select
            value={formData.projectType || ''}
            onChange={(e) => updateField('projectType', e.target.value as ProjectType | '')}
            label="プロジェクト"
          >
            <MenuItem value="">
              <em>選択してください</em>
            </MenuItem>
            {PROJECT_TYPES.map((type) => (
              <MenuItem key={type} value={type}>
                {type}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      )}

      <TextField
        fullWidth
        required
        label="タイトル"
        value={formData.title}
        onChange={(e) => updateField('title', e.target.value)}
        variant="outlined"
        error={!formData.title.trim() && formData.title !== ''}
        helperText={
          !formData.title.trim() && formData.title !== '' ? 'タイトルを入力してください' : ''
        }
      />

      <TextField
        fullWidth
        label="説明"
        value={formData.description || ''}
        onChange={(e) => updateField('description', e.target.value)}
        variant="outlined"
        multiline
        rows={4}
      />

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <TaskStatusSelect
            value={formData.flowStatus}
            onChange={(value) => updateField('flowStatus', value)}
          />
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <TaskLabelSelect
            value={formData.kubunLabelId}
            onChange={(value) => updateField('kubunLabelId', value)}
            labels={labels}
            isLoading={labelsLoading}
            required
          />
        </Grid>

        <Grid size={{ xs: 12 }}>
          <TaskAssigneeSelect
            value={formData.assigneeIds}
            onChange={(value) => updateField('assigneeIds', value)}
            users={allUsers}
          />
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <TaskDateField
            label="ITアップ日"
            value={formData.itUpDate}
            onChange={(value) => updateField('itUpDate', value)}
          />
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <TaskDateField
            label="リリース日"
            value={formData.releaseDate}
            onChange={(value) => updateField('releaseDate', value)}
          />
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <TaskDateField
            label="期日"
            value={formData.dueDate}
            onChange={(value) => updateField('dueDate', value)}
          />
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <FormControl fullWidth>
            <InputLabel>優先度</InputLabel>
            <Select
              value={formData.priority || ''}
              onChange={(e) =>
                updateField('priority', e.target.value ? (e.target.value as Priority) : null)
              }
              label="優先度"
            >
              <MenuItem value="">
                <em>選択しない</em>
              </MenuItem>
              {PRIORITY_OPTIONS.map((p) => (
                <MenuItem key={p} value={p}>
                  {PRIORITY_LABELS[p]}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
      </Grid>

      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
        {onCancel && (
          <CustomButton onClick={onCancel} variant="outline">
            {cancelLabel}
          </CustomButton>
        )}
        <CustomButton
          onClick={handleSubmit}
          disabled={
            isSubmitting ||
            !formData.projectType ||
            !formData.title.trim() ||
            !formData.kubunLabelId ||
            labelsLoading
          }
        >
          {isSubmitting ? '保存中...' : submitLabel}
        </CustomButton>
      </Box>
    </Box>
  );
}
