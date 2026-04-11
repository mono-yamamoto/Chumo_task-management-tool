import { type ReactNode, useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { Task } from '../../../types';
import { useTask } from '../../../hooks/useTask';
import { useDeleteTask } from '../../../hooks/useTaskMutations';
import { Spinner } from '../../ui/Spinner';
import { Modal } from '../../ui/Modal';
import { Button } from '../../ui/Button';
import { DrawerHeader } from './DrawerHeader';
import { DrawerActionBar } from './DrawerActionBar';
import { DrawerTabBar } from './DrawerTabBar';
import { TaskDetailTab } from './TaskDetailTab';
import { CommentTab } from './CommentTab';

interface TaskDrawerProps {
  /** taskId を渡すと API から取得して表示 */
  taskId?: string | null;
  /** 直接 task オブジェクトを渡す場合（後方互換） */
  task?: Task | null;
  /** task を使わず直接制御する場合 */
  isOpen?: boolean;
  /** task を使わず直接制御する場合のタイトル */
  title?: string;
  onClose: () => void;
  /** タブのラベル（デフォルト: "タスク詳細"） */
  detailTabLabel?: string;
  /** 詳細タブの中身を差し替える場合に指定 */
  detailContent?: ReactNode;
  /** 詳細タブのパディングを無効にする */
  detailPadding?: boolean;
}

export function TaskDrawer({
  taskId,
  task: taskProp,
  isOpen: isOpenProp,
  title: titleProp,
  onClose,
  detailTabLabel = 'タスク詳細',
  detailContent,
  detailPadding = true,
}: TaskDrawerProps) {
  // taskId が渡された場合は API から取得
  const { data: fetchedTask, isLoading } = useTask(taskId ?? null);
  const task = fetchedTask ?? taskProp ?? null;

  const isOpen = isOpenProp ?? (taskId != null || taskProp != null);
  const title = titleProp ?? task?.title ?? '';

  // 削除関連
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const deleteTask = useDeleteTask();

  const handleDeleteRequest = useCallback(() => {
    setShowDeleteConfirm(true);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!task) return;
    await deleteTask.mutateAsync(task.id);
    setShowDeleteConfirm(false);
    onClose();
  }, [task, deleteTask, onClose]);

  // ESCキーで閉じる
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showDeleteConfirm) {
          setShowDeleteConfirm(false);
        } else {
          onClose();
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, showDeleteConfirm]);

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <>
            {/* オーバーレイ */}
            <motion.div
              className="fixed inset-0 z-40 bg-black/30"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
            />

            {/* ドロワー */}
            <motion.div
              className="fixed right-0 top-0 z-50 flex h-full w-[480px] flex-col bg-bg-primary shadow-xl border-l border-border-default"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              role="dialog"
              aria-modal="true"
              aria-label={detailTabLabel}
            >
              {isLoading ? (
                <div className="flex flex-1 items-center justify-center">
                  <Spinner size="lg" />
                </div>
              ) : task ? (
                <>
                  <DrawerHeader
                    title={title}
                    taskId={task.id}
                    onClose={onClose}
                    onDelete={handleDeleteRequest}
                    isDeleting={deleteTask.isPending}
                  />
                  <DrawerActionBar task={task} />
                  <DrawerTabBar
                    taskId={task.id}
                    detailTabLabel={detailTabLabel}
                    detailContent={detailContent ?? <TaskDetailTab task={task} />}
                    commentContent={<CommentTab taskId={task.id} projectType={task.projectType} />}
                    detailPadding={detailPadding}
                  />
                </>
              ) : detailContent ? (
                <>
                  <DrawerHeader title={title} onClose={onClose} />
                  <DrawerTabBar
                    detailTabLabel={detailTabLabel}
                    detailContent={detailContent}
                    detailPadding={detailPadding}
                  />
                </>
              ) : (
                <div className="flex flex-1 items-center justify-center text-text-tertiary">
                  タスクが見つかりません
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* 削除確認ダイアログ */}
      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="タスクの削除"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="outline" size="sm" onPress={() => setShowDeleteConfirm(false)}>
              キャンセル
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onPress={handleDeleteConfirm}
              isDisabled={deleteTask.isPending}
            >
              {deleteTask.isPending ? '削除中...' : '削除する'}
            </Button>
          </div>
        }
      >
        <p className="text-sm text-text-secondary">
          「{task?.title}」を削除しますか？この操作は取り消せません。
        </p>
      </Modal>
    </>
  );
}
