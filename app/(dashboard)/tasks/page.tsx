'use client';

import { Suspense } from 'react';
import { useTaskListPageManager } from '@/hooks';
import { Button as CustomButton } from '@/components/ui/button';
import { Box, Typography, CircularProgress, ToggleButtonGroup, ToggleButton, Tooltip } from '@mui/material';
import TableRowsIcon from '@mui/icons-material/TableRows';
import ViewKanbanIcon from '@mui/icons-material/ViewKanban';
import Link from 'next/link';
import { TaskDetailDrawer } from '@/components/Drawer/TaskDetailDrawer';
import { TaskListTable } from '@/components/tasks/TaskListTable';
import { TaskPersonalView } from '@/components/tasks/TaskPersonalView';
import { TaskFilters } from '@/components/tasks/TaskFilters';
import { TaskDeleteDialog } from '@/components/tasks/TaskDeleteDialog';

function TasksPageContent() {
  const manager = useTaskListPageManager();

  if (manager.isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', gap: 2 }}>
      <Box sx={{ flex: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
              タスク一覧
            </Typography>
            <ToggleButtonGroup value={manager.viewMode} exclusive onChange={manager.handleViewModeChange} size="small">
              <ToggleButton value="table" aria-label="テーブル表示">
                <Tooltip title="テーブル表示">
                  <TableRowsIcon />
                </Tooltip>
              </ToggleButton>
              <ToggleButton value="personal" aria-label="個人別表示">
                <Tooltip title="個人別表示">
                  <ViewKanbanIcon />
                </Tooltip>
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <CustomButton variant="outline" onClick={manager.filterHandlers.handleResetFilters}>
              フィルタリセット
            </CustomButton>
            <Link href="/tasks/new" style={{ textDecoration: 'none' }}>
              <CustomButton>新規作成</CustomButton>
            </Link>
          </Box>
        </Box>

        <TaskFilters
          filterTitle={manager.filters.filterTitle}
          onFilterTitleChange={manager.filterHandlers.handleFilterTitleChange}
          selectedProjectType={manager.selectedProjectType}
          onProjectTypeChange={manager.handleProjectTypeChange}
          filterStatus={manager.filters.filterStatus}
          onFilterStatusChange={manager.filterHandlers.handleFilterStatusChange}
          filterAssignee={manager.filters.filterAssignee}
          onFilterAssigneeChange={manager.filterHandlers.handleFilterAssigneeChange}
          filterLabel={manager.filters.filterLabel}
          onFilterLabelChange={manager.filterHandlers.handleFilterLabelChange}
          filterTimerActive={manager.filters.filterTimerActive}
          onFilterTimerActiveChange={manager.filterHandlers.handleFilterTimerActiveChange}
          filterItUpDateMonth={manager.filters.filterItUpDateMonth}
          onFilterItUpDateMonthChange={manager.filterHandlers.handleFilterItUpDateMonthChange}
          filterReleaseDateMonth={manager.filters.filterReleaseDateMonth}
          onFilterReleaseDateMonthChange={manager.filterHandlers.handleFilterReleaseDateMonthChange}
          allUsers={manager.allUsers}
          allLabels={manager.allLabels}
        />

        {manager.viewMode === 'table' ? (
          <>
            <TaskListTable
              tasks={manager.pagination.paginatedTasks || []}
              onTaskSelect={manager.detail.handleTaskSelect}
              selectedProjectType={manager.selectedProjectType}
              allUsers={manager.allUsers}
              allLabels={manager.allLabels}
              activeSession={manager.actions.activeSession}
              onStartTimer={manager.actions.handleStartTimer}
              onStopTimer={manager.actions.handleStopTimer}
              isStoppingTimer={manager.actions.isStoppingTimer}
              kobetsuLabelId={manager.kobetsuLabelId}
              currentUserId={manager.user?.id || null}
              emptyMessage={manager.emptyMessage}
            />

            <Box
              sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 2, gap: 2, flexWrap: 'wrap' }}
            >
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {manager.pagination.rangeLabel}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CustomButton variant="outline" onClick={manager.pagination.handlePrevPage} disabled={!manager.pagination.canGoPrev}>
                  前へ
                </CustomButton>
                <Typography variant="body2" sx={{ minWidth: 80, textAlign: 'center' }}>
                  ページ {manager.pagination.currentPage}
                </Typography>
                <CustomButton variant="outline" onClick={manager.pagination.handleNextPage} disabled={!manager.pagination.canGoNext || manager.isFetchingNextPage}>
                  {manager.isFetchingNextPage ? <CircularProgress size={14} sx={{ color: 'inherit' }} /> : '次へ'}
                </CustomButton>
              </Box>
            </Box>
          </>
        ) : (
          <>
            <TaskPersonalView
              tasks={manager.sortedTasks || []}
              onTaskSelect={manager.detail.handleTaskSelect}
              selectedProjectType={manager.selectedProjectType}
              allUsers={manager.allUsers}
              allLabels={manager.allLabels}
              currentUserId={manager.user?.id || null}
              emptyMessage={manager.emptyMessage}
            />
            {manager.hasNextPage && (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                <CustomButton variant="outline" onClick={manager.pagination.handleNextPage} disabled={manager.isFetchingNextPage}>
                  {manager.isFetchingNextPage ? <CircularProgress size={14} sx={{ color: 'inherit' }} /> : 'さらに読み込む'}
                </CustomButton>
              </Box>
            )}
          </>
        )}
      </Box>

      <TaskDetailDrawer
        open={!!manager.detail.selectedTaskId && !manager.drawer.isSavingOnClose}
        onClose={manager.drawer.handleDrawerClose}
        selectedTask={manager.detail.selectedTask}
        taskFormData={manager.detail.taskFormData}
        onTaskFormDataChange={manager.detail.setTaskFormData}
        onDelete={manager.deleteDialog.handleDeleteClick}
        isSaving={manager.drawer.isSavingOnClose}
        taskLabels={manager.taskLabels}
        allUsers={manager.allUsers}
        activeSession={manager.actions.activeSession}
        onStartTimer={manager.actions.handleStartTimer}
        onStopTimer={manager.actions.handleStopTimer}
        isStoppingTimer={manager.actions.isStoppingTimer}
        onDriveCreate={manager.actions.handleDriveCreate}
        isCreatingDrive={manager.actions.isCreatingDrive}
        onFireCreate={manager.actions.handleFireCreate}
        isCreatingFire={manager.actions.isCreatingFire}
        onChatThreadCreate={manager.actions.handleChatThreadCreate}
        isCreatingChatThread={manager.actions.isCreatingChatThread}
        taskSessions={manager.taskSessions}
        currentUserId={manager.user?.id || null}
        formatDuration={manager.actions.formatDuration}
      />

      <TaskDeleteDialog
        open={manager.deleteDialog.open}
        onClose={manager.deleteDialog.handleClose}
        onDelete={manager.deleteDialog.handleDelete}
        deleteTaskId={manager.deleteDialog.deleteTaskId}
        deleteConfirmTitle={manager.deleteDialog.confirmTitle}
        setDeleteConfirmTitle={manager.deleteDialog.setConfirmTitle}
        tasks={manager.tasks}
      />
    </Box>
  );
}

export default function TasksPage() {
  return (
    <Suspense
      fallback={
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      }
    >
      <TasksPageContent />
    </Suspense>
  );
}
