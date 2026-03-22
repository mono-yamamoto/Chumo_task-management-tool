import { type ReactNode, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { Task } from '../../../types';
import { DrawerHeader } from './DrawerHeader';
import { DrawerActionBar } from './DrawerActionBar';
import { DrawerTabBar } from './DrawerTabBar';
import { TaskDetailTab } from './TaskDetailTab';
import { CommentTab } from './CommentTab';

interface TaskDrawerProps {
  /** Task を渡すと isOpen / title / デフォルト detailContent が自動設定される */
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
  /** 詳細タブのパディングを無効にする（コンテンツ側でpaddingを管理する場合） */
  detailPadding?: boolean;
}

export function TaskDrawer({
  task,
  isOpen: isOpenProp,
  title: titleProp,
  onClose,
  detailTabLabel = 'タスク詳細',
  detailContent,
  detailPadding = true,
}: TaskDrawerProps) {
  const isOpen = isOpenProp ?? task != null;
  const title = titleProp ?? task?.title ?? '';

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
            <DrawerHeader title={title} onClose={onClose} />
            <DrawerActionBar />
            <DrawerTabBar
              detailTabLabel={detailTabLabel}
              detailContent={detailContent ?? (task ? <TaskDetailTab task={task} /> : null)}
              commentContent={<CommentTab />}
              detailPadding={detailPadding}
            />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
