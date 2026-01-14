import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  TextField,
} from '@mui/material';
import { Button as CustomButton } from '@/components/ui/button';
import { Task } from '@/types';

interface TaskDeleteDialogProps {
  open: boolean;
  onClose: () => void;
  onDelete: () => void;
  deleteTaskId: string | null;
  deleteConfirmTitle: string;
  setDeleteConfirmTitle: (value: string) => void;
  tasks: Task[];
}

export function TaskDeleteDialog({
  open,
  onClose,
  onDelete,
  deleteTaskId,
  deleteConfirmTitle,
  setDeleteConfirmTitle,
  tasks,
}: TaskDeleteDialogProps) {
  const taskToDelete = tasks?.find((t: Task) => t.id === deleteTaskId);

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>タスクを削除</DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ mb: 2 }}>
          この操作は取り消せません。タスクを削除するには、タイトルを正確に入力してください。
        </DialogContentText>
        <TextField
          autoFocus
          fullWidth
          label="タイトルを入力"
          value={deleteConfirmTitle}
          onChange={(e) => setDeleteConfirmTitle(e.target.value)}
          placeholder={taskToDelete?.title || ''}
          variant="outlined"
        />
      </DialogContent>
      <DialogActions>
        <CustomButton onClick={onClose}>キャンセル</CustomButton>
        <CustomButton
          variant="destructive"
          onClick={onDelete}
          disabled={deleteConfirmTitle !== taskToDelete?.title}
        >
          削除
        </CustomButton>
      </DialogActions>
    </Dialog>
  );
}
