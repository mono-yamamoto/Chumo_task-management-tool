'use client';

import {
  Box,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Button,
  OutlinedInput,
  Checkbox,
  ListItemText,
  CircularProgress,
  Drawer,
} from '@mui/material';
import {
  Close,
  Delete,
  PlayArrow,
  Stop,
  FolderOpen,
  LocalFireDepartment,
  BugReport,
} from '@mui/icons-material';
import { Button as CustomButton } from '@/components/ui/button';
import { FLOW_STATUS_OPTIONS } from '@/constants/taskConstants';
import { Task, FlowStatus, User, Label } from '@/types';
import Link from 'next/link';
import { format } from 'date-fns';
import { generateBacklogUrlFromTitle, parseBacklogClipboard } from '@/utils/backlog';

interface TaskDetailDrawerProps {
  open: boolean;
  onClose: () => void;
  selectedTask: Task | null;
  taskFormData: Partial<Task> | null;

  onTaskFormDataChange: (data: Partial<Task>) => void;
  onSave: () => void;

  onDelete: (taskId: string, projectId: string) => void;
  isSaving: boolean;
  taskLabels: Label[];
  allUsers: User[] | undefined;
  activeSession: { projectType: string; taskId: string; sessionId: string } | null;

  onStartTimer: (projectId: string, taskId: string) => void;
  onStopTimer: () => void;
  isStartingTimer: boolean;
  isStoppingTimer: boolean;

  onDriveCreate: (projectId: string, taskId: string) => void;
  isCreatingDrive: boolean;

  onFireCreate: (projectId: string, taskId: string) => void;
  isCreatingFire: boolean;
  taskSessions: any[];

  formatDuration: (

    durationSec: number | undefined | null,

    startedAt?: Date,

    endedAt?: Date | null
  ) => string;
}

export function TaskDetailDrawer({
  open,
  onClose,
  selectedTask,
  taskFormData,
  onTaskFormDataChange,
  onSave,
  onDelete,
  isSaving,
  taskLabels,
  allUsers,
  activeSession,
  onStartTimer,
  onStopTimer,
  isStartingTimer,
  isStoppingTimer,
  onDriveCreate,
  isCreatingDrive,
  onFireCreate,
  isCreatingFire,
  taskSessions,

  formatDuration: _formatDuration, // 未使用だがpropsとして必要
}: TaskDetailDrawerProps) {
  // taskFormDataがnullの場合はローディング状態を表示
  if (!selectedTask) return null;

  const formData = taskFormData || {
    title: selectedTask.title || '',
    description: selectedTask.description || '',
    flowStatus: selectedTask.flowStatus || '未着手',
    kubunLabelId: selectedTask.kubunLabelId || '',
    assigneeIds: selectedTask.assigneeIds || [],
    itUpDate: selectedTask.itUpDate || null,
    releaseDate: selectedTask.releaseDate || null,
    dueDate: selectedTask.dueDate || null,
    backlogUrl: selectedTask.backlogUrl || null,
  };

  // バックログURLを取得（優先順位: backlogUrl > external.url > タイトルから生成）
  const backlogUrl =
    formData.backlogUrl ||
    selectedTask.backlogUrl ||
    selectedTask.external?.url ||
    generateBacklogUrlFromTitle(formData.title || selectedTask.title);

  // タイトルフィールドに貼り付け時のハンドラー
  const handleTitlePaste = async (e: React.ClipboardEvent<HTMLInputElement>) => {
    const clipboardText = e.clipboardData.getData('text');
    const parsed = parseBacklogClipboard(clipboardText);

    if (parsed) {
      e.preventDefault();
      // タイトルとURLを自動的に反映
      onTaskFormDataChange({
        ...formData,
        title: parsed.title,
        backlogUrl: parsed.url,
      });
    }
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: { xs: '100%', sm: 500 },
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          p: 3,
          pt: 4,
          overflowY: 'auto',
        },
      }}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            mb: 3,
            flexShrink: 0,
          }}
        >
          <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
            タスク詳細
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <CustomButton onClick={onSave} size="sm" disabled={isSaving}>
              {isSaving ? '保存中...' : '保存'}
            </CustomButton>
            <CustomButton
              variant="destructive"
              size="sm"
              onClick={() => {
                const { projectType } = (selectedTask as any);
                onDelete(selectedTask.id, projectType);
              }}
            >
              <Delete fontSize="small" sx={{ mr: 0.5 }} />
              削除
            </CustomButton>
            <IconButton onClick={onClose} size="small">
              <Close />
            </IconButton>
          </Box>
        </Box>

        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            pr: 1,
            pb: 2,
          }}
        >
          <TextField
            fullWidth
            label="タイトル"
            value={formData.title || ''}
            onChange={(e) => onTaskFormDataChange({ ...formData, title: e.target.value })}
            onPaste={handleTitlePaste}
          />

          <TextField
            fullWidth
            label="説明"
            value={formData.description || ''}
            onChange={(e) => onTaskFormDataChange({ ...formData, description: e.target.value })}
            multiline
            rows={4}
          />

          <FormControl fullWidth>
            <InputLabel>ステータス</InputLabel>
            <Select
              value={formData.flowStatus || '未着手'}
              onChange={(e) => {
                onTaskFormDataChange({ ...formData, flowStatus: e.target.value as FlowStatus });
              }}
              label="ステータス"
            >
              {FLOW_STATUS_OPTIONS.map((status) => (
                <MenuItem key={status} value={status}>
                  {status}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel>区分</InputLabel>
            <Select
              value={formData.kubunLabelId || ''}
              onChange={(e) => {
                onTaskFormDataChange({ ...formData, kubunLabelId: e.target.value });
              }}
              label="区分"
              disabled={taskLabels.length === 0}
            >
              {taskLabels.length === 0 ? (
                <MenuItem value="" disabled>
                  区分ラベルが設定されていません
                </MenuItem>
              ) : (
                taskLabels.map((label) => (
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
                ))
              )}
            </Select>
          </FormControl>

          <TextField
            fullWidth
            label="ITアップ日"
            type="date"
            value={formData.itUpDate ? format(formData.itUpDate, 'yyyy-MM-dd') : ''}
            onChange={(e) =>
              onTaskFormDataChange({
                ...formData,
                itUpDate: e.target.value ? new Date(e.target.value) : null,
              })
            }
            InputLabelProps={{ shrink: true }}
          />

          <TextField
            fullWidth
            label="リリース日"
            type="date"
            value={formData.releaseDate ? format(formData.releaseDate, 'yyyy-MM-dd') : ''}
            onChange={(e) =>
              onTaskFormDataChange({
                ...formData,
                releaseDate: e.target.value ? new Date(e.target.value) : null,
              })
            }
            InputLabelProps={{ shrink: true }}
          />

          <FormControl fullWidth>
            <InputLabel>アサイン</InputLabel>
            <Select
              multiple
              value={formData.assigneeIds || selectedTask.assigneeIds || []}
              onChange={(e) => {
                const value =
                  typeof e.target.value === 'string' ? [e.target.value] : e.target.value;
                onTaskFormDataChange({ ...formData, assigneeIds: value });
              }}
              input={<OutlinedInput label="アサイン" />}
              renderValue={(selected) => {
                if (!selected || selected.length === 0) return '-';
                return selected
                  .map((id) => allUsers?.find((u) => u.id === id)?.displayName)
                  .filter(Boolean)
                  .join(', ');
              }}
            >
              {allUsers?.map((user) => (
                <MenuItem key={user.id} value={user.id}>
                  <Checkbox
                    checked={(formData.assigneeIds || selectedTask.assigneeIds || []).includes(
                      user.id
                    )}
                  />
                  <ListItemText primary={user.displayName || user.email} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: 1,
              mt: 2,
            }}
          >
            {(() => {
              const kobetsuLabelId = taskLabels.find((label) => label.name === '個別')?.id;
              const isKobetsu = selectedTask.kubunLabelId === kobetsuLabelId;

              if (isKobetsu) {
                return null;
              }

              return (
                <Box sx={{ display: 'flex', gap: 1 }}>
                  {activeSession?.taskId === selectedTask.id ? (
                    <Button
                      fullWidth
                      variant="contained"
                      color="error"
                      onClick={onStopTimer}
                      disabled={isStoppingTimer}
                      sx={{
                        animation: isStoppingTimer ? 'none' : 'pulse 2s ease-in-out infinite',
                        '@keyframes pulse': {
                          '0%, 100%': {
                            opacity: 1,
                          },
                          '50%': {
                            opacity: 0.8,
                          },
                        },
                      }}
                    >
                      {isStoppingTimer ? (
                        <>
                          <CircularProgress size={16} sx={{ color: 'inherit', mr: 1 }} />
                          停止中...
                        </>
                      ) : (
                        <>
                          <Stop fontSize="small" sx={{ mr: 1 }} />
                          タイマー停止
                        </>
                      )}
                    </Button>
                  ) : (
                    <CustomButton
                      fullWidth
                      variant="outline"
                      onClick={() => {
                        const { projectType } = (selectedTask as any);
                        onStartTimer(projectType, selectedTask.id);
                      }}
                      disabled={!!activeSession || isStartingTimer}
                    >
                      {isStartingTimer ? (
                        <>
                          <CircularProgress size={16} sx={{ color: 'inherit', mr: 1 }} />
                          開始中...
                        </>
                      ) : (
                        <>
                          <PlayArrow fontSize="small" sx={{ mr: 1 }} />
                          タイマー開始
                        </>
                      )}
                    </CustomButton>
                  )}
                </Box>
              );
            })()}
            <Box sx={{ display: 'flex', gap: 1 }}>
              {selectedTask.googleDriveUrl ? (
                <Button
                  fullWidth
                  variant="contained"
                  color="primary"
                  onClick={() => window.open(selectedTask.googleDriveUrl!, '_blank')}
                  sx={{ flex: 1 }}
                >
                  <FolderOpen fontSize="small" sx={{ mr: 1 }} />
                  Driveを開く
                </Button>
              ) : (
                <CustomButton
                  fullWidth
                  variant="outline"
                  onClick={() => {
                    const { projectType } = (selectedTask as any);
                    onDriveCreate(projectType, selectedTask.id);
                  }}
                  disabled={isCreatingDrive}
                  sx={{ flex: 1 }}
                >
                  <FolderOpen fontSize="small" sx={{ mr: 1 }} />
                  Drive作成
                </CustomButton>
              )}
              {selectedTask.fireIssueUrl ? (
                <Button
                  fullWidth
                  variant="contained"
                  color="primary"
                  onClick={() => window.open(selectedTask.fireIssueUrl!, '_blank')}
                  sx={{ flex: 1 }}
                >
                  <LocalFireDepartment fontSize="small" sx={{ mr: 1 }} />
                  Issueを開く
                </Button>
              ) : (
                <CustomButton
                  fullWidth
                  variant="outline"
                  onClick={() => {
                    const { projectType } = (selectedTask as any);
                    onFireCreate(projectType, selectedTask.id);
                  }}
                  disabled={isCreatingFire}
                  sx={{ flex: 1 }}
                >
                  <LocalFireDepartment fontSize="small" sx={{ mr: 1 }} />
                  Issue作成
                </CustomButton>
              )}
            </Box>
            {backlogUrl && (
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  fullWidth
                  variant="contained"
                  color="primary"
                  onClick={() => window.open(backlogUrl, '_blank')}
                >
                  <BugReport fontSize="small" sx={{ mr: 1 }} />
                  Backlogを開く
                </Button>
              </Box>
            )}
          </Box>

          <Box sx={{ mt: 2 }}>
            <Link href={`/tasks/${selectedTask.id}`} style={{ textDecoration: 'none' }}>
              <CustomButton fullWidth variant="outline">
                詳細ページを開く
              </CustomButton>
            </Link>
          </Box>

          {/* セッション履歴 */}
          <Box
            sx={{
              mt: 3,
              pt: 3,
              borderTop: 1,
              borderColor: 'divider',
            }}
          >
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                mb: 2,
              }}
            >
              <Typography variant="h6" sx={{ fontWeight: 'semibold' }}>
                セッション履歴
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {taskSessions && taskSessions.length > 0 ? (
                taskSessions.map((session: any) => {
                  const sessionUser = allUsers?.find((u) => u.id === session.userId);
                  return (
                    <Box
                      key={session.id}
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        borderBottom: 1,
                        borderColor: 'divider',
                        pb: 1,
                      }}
                    >
                      <Box
                        sx={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 0.5,
                          flex: 1,
                        }}
                      >
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                          {sessionUser?.displayName || '不明なユーザー'}
                        </Typography>
                        <Typography variant="body2">
                          {format(session.startedAt, 'yyyy-MM-dd HH:mm:ss')}
                          {' - '}
                          {session.endedAt
                            ? format(session.endedAt, 'yyyy-MM-dd HH:mm:ss')
                            : '実行中'}
                        </Typography>
                      </Box>
                      <Typography
                        sx={{
                          fontWeight: 'medium',
                          minWidth: '80px',
                          textAlign: 'right',
                          fontSize: '0.875rem',
                        }}
                      >
                        {session.endedAt
                          ? _formatDuration(session.durationSec, session.startedAt, session.endedAt)
                          : '-'}
                      </Typography>
                    </Box>
                  );
                })
              ) : (
                <Typography sx={{ color: 'text.secondary', py: 2, fontSize: '0.875rem' }}>
                  セッション履歴がありません
                </Typography>
              )}
            </Box>
          </Box>
        </Box>
      </Box>
    </Drawer>
  );
}
