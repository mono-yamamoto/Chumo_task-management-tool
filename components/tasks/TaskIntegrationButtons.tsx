'use client';

import { Button } from '@mui/material';
import { FolderOpen, LocalFireDepartment } from '@mui/icons-material';
import { Button as CustomButton } from '@/components/ui/button';

interface TaskIntegrationButtonsProps {
  googleDriveUrl?: string | null;
  fireIssueUrl?: string | null;
  onDriveCreate: () => void;
  onFireCreate: () => void;
  isCreatingDrive?: boolean;
  isCreatingFire?: boolean;
  fullWidth?: boolean;
}

export function TaskIntegrationButtons({
  googleDriveUrl,
  fireIssueUrl,
  onDriveCreate,
  onFireCreate,
  isCreatingDrive = false,
  isCreatingFire = false,
  fullWidth = true,
}: TaskIntegrationButtonsProps) {
  return (
    <>
      {googleDriveUrl ? (
        <Button
          fullWidth={fullWidth}
          variant="contained"
          color="primary"
          onClick={() => window.open(googleDriveUrl!, '_blank')}
          sx={{ flex: 1 }}
        >
          <FolderOpen fontSize="small" sx={{ mr: 1 }} />
          Driveを開く
        </Button>
      ) : (
        <CustomButton
          fullWidth={fullWidth}
          variant="outline"
          onClick={onDriveCreate}
          disabled={isCreatingDrive}
          sx={{ flex: 1 }}
        >
          <FolderOpen fontSize="small" sx={{ mr: 1 }} />
          Drive作成
        </CustomButton>
      )}
      {fireIssueUrl ? (
        <Button
          fullWidth={fullWidth}
          variant="contained"
          color="primary"
          onClick={() => window.open(fireIssueUrl!, '_blank')}
          sx={{ flex: 1 }}
        >
          <LocalFireDepartment fontSize="small" sx={{ mr: 1 }} />
          Issueを開く
        </Button>
      ) : (
        <CustomButton
          fullWidth={fullWidth}
          variant="outline"
          onClick={onFireCreate}
          disabled={isCreatingFire}
          sx={{ flex: 1 }}
        >
          <LocalFireDepartment fontSize="small" sx={{ mr: 1 }} />
          Issue作成
        </CustomButton>
      )}
    </>
  );
}

