import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { Task } from '../../../types';
import { DrawerHeader } from './DrawerHeader';
import { DrawerActionBar } from './DrawerActionBar';
import { DrawerTabBar } from './DrawerTabBar';
import { TaskDetailTab } from './TaskDetailTab';
import { CommentTab } from './CommentTab';

interface TaskDrawerProps {
  task: Task | null;
  onClose: () => void;
}

export function TaskDrawer({ task, onClose }: TaskDrawerProps) {
  const isOpen = task != null;

  // ESCキーで閉じる
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {task && (
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
            aria-label="タスク詳細"
          >
            <DrawerHeader title={task.title} onClose={onClose} />
            <DrawerActionBar />
            <DrawerTabBar
              detailContent={<TaskDetailTab task={task} />}
              commentContent={<CommentTab />}
            />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
