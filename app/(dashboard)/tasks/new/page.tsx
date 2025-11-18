'use client';

import { useState } from 'react';
import { FlowStatus, Priority } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import { useKubunLabels } from '@/hooks/useKubunLabels';
import { useUsers } from '@/hooks/useUsers';
import { useCreateTask } from '@/hooks/useTasks';
import { useRouter } from 'next/navigation';
import { PROJECT_TYPES, ProjectType } from '@/constants/projectTypes';
import {
  FLOW_STATUS_OPTIONS,
  PRIORITY_OPTIONS,
  PRIORITY_LABELS,
} from '@/constants/taskConstants';
import { Button } from '@/components/ui/button';
import {
  Box,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Card,
  CardContent,
  Grid,
  OutlinedInput,
  FormHelperText,
  Checkbox,
  ListItemText,
} from '@mui/material';

export default function NewTaskPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [projectType, setProjectType] = useState<ProjectType | ''>('');
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [flowStatus, setFlowStatus] = useState<FlowStatus>('未着手');
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [itUpDate, setItUpDate] = useState<string>('');
  const [releaseDate, setReleaseDate] = useState<string>('');
  const [dueDate, setDueDate] = useState<string>('');
  const [kubunLabelId, setKubunLabelId] = useState<string>('');
  const [priority, setPriority] = useState<Priority | ''>('');

  // 区分ラベルは全プロジェクト共通
  const { data: labels, isLoading: labelsLoading } = useKubunLabels();

  // すべてのユーザーを取得（アサイン表示用）
  const { data: allUsers } = useUsers();

  const createTask = useCreateTask();

  const handleSubmit = () => {
    if (!user || !projectType || !title.trim()) {
      alert('必須項目が入力されていません');
      return;
    }
    if (!kubunLabelId) {
      alert('区分を選択してください');
      return;
    }

    createTask.mutate(
      {
        projectType: projectType as ProjectType,
        taskData: {
          projectType: projectType as ProjectType,
          title: title.trim(),
          description: description.trim() || '',
          flowStatus,
          assigneeIds,
          itUpDate: itUpDate ? new Date(itUpDate) : null,
          releaseDate: releaseDate ? new Date(releaseDate) : null,
          dueDate: dueDate ? new Date(dueDate) : null,
          kubunLabelId,
          priority: priority ? (priority as Priority) : null,
          order: Date.now(),
          createdBy: user.id,
        },
      },
      {
        onSuccess: () => {
          // タスク一覧に遷移（「すべて」が選択された状態）
          router.push('/tasks');
        },
        onError: (error: Error) => {
          console.error('Error creating task:', error);
          console.error('Error details:', {
            user: !!user,
            userId: user?.id,
            projectType,
            projectTypeValid: PROJECT_TYPES.includes(projectType as ProjectType),
            title,
            kubunLabelId,
            error: error.message,
            stack: error.stack,
          });

          alert(`タスクの作成に失敗しました: ${error.message}`);
        },
      }
    );
  };

  return (
    <Box>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 3,
        }}
      >
        <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
          新規タスク作成
        </Typography>
        <Button onClick={() => router.push('/tasks')} variant="outline">
          キャンセル
        </Button>
      </Box>

      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <FormControl fullWidth required>
              <InputLabel>プロジェクト</InputLabel>
              <Select
                value={projectType}
                onChange={(e) => {
                  setProjectType(e.target.value as ProjectType);
                }}
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

            <TextField
              fullWidth
              required
              label="タイトル"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              variant="outlined"
              error={!title.trim() && title !== ''}
              helperText={!title.trim() && title !== '' ? 'タイトルを入力してください' : ''}
            />

            <TextField
              fullWidth
              label="説明"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              variant="outlined"
              multiline
              rows={4}
            />

            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 6 }}>
                <FormControl fullWidth required>
                  <InputLabel>ステータス</InputLabel>
                  <Select
                    value={flowStatus}
                    onChange={(e) => setFlowStatus(e.target.value as FlowStatus)}
                    label="ステータス"
                  >
                {FLOW_STATUS_OPTIONS.map((status) => (
                  <MenuItem key={status} value={status}>
                    {status}
                  </MenuItem>
                ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid size={{ xs: 12, md: 6 }}>
                <FormControl fullWidth required>
                  <InputLabel>区分</InputLabel>
                  <Select
                    value={kubunLabelId}
                    onChange={(e) => setKubunLabelId(e.target.value)}
                    label="区分"
                    disabled={labelsLoading}
                  >
                    <MenuItem value="">
                      <em>選択してください</em>
                    </MenuItem>
                    {labels?.map((label) => (
                      <MenuItem key={label.id} value={label.id}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box
                            sx={{
                              width: 12,
                              height: 12,
                              borderRadius: '50%',
                              backgroundColor: label.color,
                            }}
                          />
                          {label.name}
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                  {labels?.length === 0 && !labelsLoading && (
                    <Box sx={{ mt: 1 }}>
                      <FormHelperText error>
                        区分ラベルが設定されていません。管理者に連絡してください。
                      </FormHelperText>
                    </Box>
                  )}
                </FormControl>
              </Grid>

              <Grid size={{ xs: 12 }}>
                <FormControl fullWidth>
                  <InputLabel>アサイン（担当者）</InputLabel>
                  <Select
                    multiple
                    value={assigneeIds}
                    onChange={(e) => {
                      const value =
                        typeof e.target.value === 'string'
                          ? e.target.value.split(',')
                          : e.target.value;
                      setAssigneeIds(value);
                    }}
                    input={<OutlinedInput label="アサイン（担当者）" />}
                    renderValue={(selected) => {
                      if (selected.length === 0) return '';
                      return (
                        allUsers
                          ?.filter((userItem) => selected.includes(userItem.id))
                          .map((userItem) => userItem.displayName)
                          .join(', ') || ''
                      );
                    }}
                  >
                    {allUsers?.map((userItem) => (
                      <MenuItem key={userItem.id} value={userItem.id}>
                        <Checkbox checked={assigneeIds.indexOf(userItem.id) > -1} />
                        <ListItemText primary={userItem.displayName} />
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  fullWidth
                  label="ITアップ日"
                  type="date"
                  value={itUpDate}
                  onChange={(e) => setItUpDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  variant="outlined"
                />
              </Grid>

              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  fullWidth
                  label="リリース日"
                  type="date"
                  value={releaseDate}
                  onChange={(e) => setReleaseDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  variant="outlined"
                />
              </Grid>

              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  fullWidth
                  label="期日"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  variant="outlined"
                />
              </Grid>

              <Grid size={{ xs: 12, md: 6 }}>
                <FormControl fullWidth>
                  <InputLabel>優先度</InputLabel>
                  <Select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as Priority | '')}
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
              <Button onClick={() => router.push('/tasks')} variant="outline">
                キャンセル
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={
                  createTask.isPending ||
                  !projectType ||
                  !title.trim() ||
                  !kubunLabelId ||
                  labelsLoading
                }
              >
                {createTask.isPending ? '作成中...' : '作成'}
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
