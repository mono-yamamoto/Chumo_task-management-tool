import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Grid,
} from '@mui/material';
import { FlowStatus, User, KubunLabel } from '@/types';
import { PROJECT_TYPES, ProjectType } from '@/constants/projectTypes';
import { FLOW_STATUS_OPTIONS, FLOW_STATUS_LABELS } from '@/constants/taskConstants';
import { TaskSearchForm } from '@/components/tasks/TaskSearchForm';

interface TaskFiltersProps {
  filterTitle: string;
  onFilterTitleChange: (value: string) => void;
  selectedProjectType: ProjectType | 'all';
  onProjectTypeChange: (value: ProjectType | 'all') => void;
  filterStatus: string;
  onFilterStatusChange: (value: FlowStatus | 'all' | 'not-completed') => void;
  filterAssignee: string;
  onFilterAssigneeChange: (value: string) => void;
  filterLabel: string;
  onFilterLabelChange: (value: string) => void;
  filterTimerActive: string;
  onFilterTimerActiveChange: (value: string) => void;
  filterItUpDateMonth: string;
  onFilterItUpDateMonthChange: (value: string) => void;
  filterReleaseDateMonth: string;
  onFilterReleaseDateMonthChange: (value: string) => void;
  allUsers?: User[];
  allLabels?: KubunLabel[];
}

export function TaskFilters({
  filterTitle,
  onFilterTitleChange,
  selectedProjectType,
  onProjectTypeChange,
  filterStatus,
  onFilterStatusChange,
  filterAssignee,
  onFilterAssigneeChange,
  filterLabel,
  onFilterLabelChange,
  filterTimerActive,
  onFilterTimerActiveChange,
  filterItUpDateMonth,
  onFilterItUpDateMonthChange,
  filterReleaseDateMonth,
  onFilterReleaseDateMonthChange,
  allUsers,
  allLabels,
}: TaskFiltersProps) {
  return (
    <Box sx={{ mb: 3 }}>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12 }}>
          <TaskSearchForm
            value={filterTitle}
            onChange={onFilterTitleChange}
            placeholder="タイトルで検索..."
            label="タイトル検索"
          />
        </Grid>
      </Grid>
      <Grid container spacing={2} sx={{ mt: 2 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <FormControl fullWidth>
            <InputLabel>プロジェクト</InputLabel>
            <Select
              value={selectedProjectType}
              onChange={(e) => onProjectTypeChange(e.target.value as ProjectType | 'all')}
              label="プロジェクト"
            >
              <MenuItem value="all">すべて</MenuItem>
              {PROJECT_TYPES.map((type) => (
                <MenuItem key={type} value={type}>
                  {type}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <FormControl fullWidth>
            <InputLabel>ステータス</InputLabel>
            <Select
              value={filterStatus}
              onChange={(e) =>
                onFilterStatusChange(e.target.value as FlowStatus | 'all' | 'not-completed')
              }
              label="ステータス"
            >
              <MenuItem value="all">すべて</MenuItem>
              <MenuItem value="not-completed">完了以外</MenuItem>
              {FLOW_STATUS_OPTIONS.map((status) => (
                <MenuItem key={status} value={status}>
                  {FLOW_STATUS_LABELS[status]}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <FormControl fullWidth>
            <InputLabel>アサイン</InputLabel>
            <Select
              value={filterAssignee}
              onChange={(e) => onFilterAssigneeChange(e.target.value)}
              label="アサイン"
            >
              <MenuItem value="all">すべて</MenuItem>
              {allUsers?.map((userItem) => (
                <MenuItem key={userItem.id} value={userItem.id}>
                  {userItem.displayName || userItem.email}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <FormControl fullWidth>
            <InputLabel>区分</InputLabel>
            <Select
              value={filterLabel}
              onChange={(e) => onFilterLabelChange(e.target.value)}
              label="区分"
            >
              <MenuItem value="all">すべて</MenuItem>
              {allLabels?.map((label) => (
                <MenuItem key={label.id} value={label.id}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box
                      sx={{
                        width: 16,
                        height: 16,
                        borderRadius: '50%',
                        backgroundColor: label.color,
                      }}
                    />
                    {label.name}
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
      </Grid>
      <Grid container spacing={2} sx={{ mt: 2 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <FormControl fullWidth>
            <InputLabel>タイマー</InputLabel>
            <Select
              value={filterTimerActive}
              onChange={(e) => onFilterTimerActiveChange(e.target.value)}
              label="タイマー"
            >
              <MenuItem value="all">すべて</MenuItem>
              <MenuItem value="active">稼働中のみ</MenuItem>
              <MenuItem value="inactive">停止中のみ</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <TextField
            fullWidth
            label="ITアップ日（月）"
            type="month"
            value={filterItUpDateMonth}
            onChange={(e) => onFilterItUpDateMonthChange(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <TextField
            fullWidth
            label="リリース日（月）"
            type="month"
            value={filterReleaseDateMonth}
            onChange={(e) => onFilterReleaseDateMonthChange(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
        </Grid>
      </Grid>
    </Box>
  );
}
