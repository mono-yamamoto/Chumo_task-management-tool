import { useState, useEffect, useRef, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Plus, Check } from 'lucide-react';
import { Button } from '../ui/Button';
import { IconButton } from '../ui/IconButton';
import { Select } from '../ui/Select';
import { Avatar } from '../ui/Avatar';
import { useCreateTask } from '../../hooks/useTaskMutations';
import { useLabels } from '../../hooks/useLabels';
import { useUsers } from '../../hooks/useUsers';
import { FLOW_STATUS_OPTIONS } from '../../lib/constants';
import { INPUT_CLASS, TEXTAREA_CLASS } from '../../lib/formStyles';
import {
  generateBacklogUrlFromTitle,
  parseBacklogClipboard,
  extractProjectTypeFromTitle,
} from '../../lib/backlog';
import { PROJECT_TYPES } from '../../types';
import type { ProjectType, FlowStatus } from '../../types';

interface TaskCreateDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  defaultProjectType?: string;
}

const PROJECT_TYPE_OPTIONS = PROJECT_TYPES.map((pt) => ({ value: pt, label: pt }));

export function TaskCreateDrawer({ isOpen, onClose, defaultProjectType }: TaskCreateDrawerProps) {
  const createTask = useCreateTask();
  const { data: labels = [] } = useLabels();
  const { data: users = [] } = useUsers();

  const [projectType, setProjectType] = useState<string>(defaultProjectType ?? '');
  const [title, setTitle] = useState('');
  const [kubunLabelId, setKubunLabelId] = useState('');
  const [flowStatus, setFlowStatus] = useState<string>('未着手');
  const [description, setDescription] = useState('');
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [backlogUrl, setBacklogUrl] = useState('');
  const [itUpDate, setItUpDate] = useState('');
  const [releaseDate, setReleaseDate] = useState('');
  const [showAssigneePopover, setShowAssigneePopover] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showAssigneePopover) return;
    const handleClick = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setShowAssigneePopover(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showAssigneePopover]);

  const resetForm = () => {
    setProjectType(defaultProjectType ?? '');
    setTitle('');
    setKubunLabelId('');
    setFlowStatus('未着手');
    setDescription('');
    setAssigneeIds([]);
    setBacklogUrl('');
    setItUpDate('');
    setReleaseDate('');
    setShowAssigneePopover(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const canSubmit = projectType !== '' && title.trim() !== '' && kubunLabelId !== '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    try {
      await createTask.mutateAsync({
        projectType: projectType as ProjectType,
        title: title.trim(),
        kubunLabelId,
        flowStatus: flowStatus as FlowStatus,
        description: description.trim() || undefined,
        assigneeIds,
        backlogUrl: backlogUrl.trim() || null,
        itUpDate: itUpDate ? new Date(itUpDate) : null,
        releaseDate: releaseDate ? new Date(releaseDate) : null,
        progressStatus: null,
        order: 0,
      });
      resetForm();
      onClose();
    } catch {
      // mutation onError で処理
    }
  };

  const toggleAssignee = (userId: string) => {
    setAssigneeIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const kubunOptions = useMemo(() => labels.map((l) => ({ value: l.id, label: l.name })), [labels]);

  const selectedAssignees = useMemo(
    () =>
      assigneeIds
        .map((id) => users.find((u) => u.id === id))
        .filter((u): u is NonNullable<typeof u> => u != null),
    [assigneeIds, users]
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-black/30"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
          />

          <motion.div
            className="fixed right-0 top-0 z-50 flex h-full w-[480px] flex-col bg-bg-primary shadow-xl border-l border-border-default"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            role="dialog"
            aria-modal="true"
            aria-label="新規タスク作成"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-border-default">
              <h2 className="text-lg font-bold leading-normal text-text-primary">新規タスク作成</h2>
              <IconButton
                onPress={handleClose}
                aria-label="閉じる"
                size="sm"
                className="text-text-tertiary hover:text-text-primary"
              >
                <X size={20} />
              </IconButton>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* プロジェクト */}
              <FieldLabel label="プロジェクト" required>
                <Select
                  options={PROJECT_TYPE_OPTIONS}
                  value={projectType}
                  placeholder="選択してください"
                  onChange={setProjectType}
                />
              </FieldLabel>

              {/* タイトル */}
              <FieldLabel label="タイトル" required htmlFor="task-title">
                <input
                  id="task-title"
                  type="text"
                  value={title}
                  onChange={(e) => {
                    const newTitle = e.target.value;
                    setTitle(newTitle);
                    const generatedUrl = generateBacklogUrlFromTitle(newTitle);
                    if (generatedUrl) {
                      setBacklogUrl(generatedUrl);
                    }
                    if (!projectType) {
                      const extracted = extractProjectTypeFromTitle(newTitle);
                      if (extracted) {
                        setProjectType(extracted);
                      }
                    }
                  }}
                  onPaste={(e) => {
                    const clipboardText = e.clipboardData.getData('text');
                    const parsed = parseBacklogClipboard(clipboardText);
                    if (parsed) {
                      e.preventDefault();
                      setTitle(parsed.title);
                      setBacklogUrl(parsed.url);
                      if (!projectType) {
                        const extracted = extractProjectTypeFromTitle(parsed.title);
                        if (extracted) {
                          setProjectType(extracted);
                        }
                      }
                    }
                  }}
                  placeholder="タスクのタイトルを入力"
                  className={INPUT_CLASS}
                />
              </FieldLabel>

              {/* 区分 */}
              <FieldLabel label="区分" required>
                <Select
                  options={kubunOptions}
                  value={kubunLabelId}
                  placeholder="選択してください"
                  onChange={setKubunLabelId}
                />
              </FieldLabel>

              {/* ステータス */}
              <FieldLabel label="ステータス">
                <Select
                  options={FLOW_STATUS_OPTIONS}
                  value={flowStatus}
                  placeholder="選択"
                  onChange={setFlowStatus}
                />
              </FieldLabel>

              {/* 説明 */}
              <FieldLabel label="説明" htmlFor="task-description">
                <textarea
                  id="task-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="タスクの説明を入力"
                  rows={4}
                  className={TEXTAREA_CLASS}
                />
              </FieldLabel>

              {/* アサイン */}
              <FieldLabel label="アサイン">
                <div className="relative flex items-center gap-2">
                  {selectedAssignees.map((user) => (
                    <Avatar
                      key={user.id}
                      name={user.displayName}
                      imageUrl={user.avatarUrl ?? undefined}
                      colorName={user.avatarColor}
                      size="md"
                    />
                  ))}
                  <div ref={popoverRef}>
                    <IconButton
                      aria-label="アサインを追加"
                      size="sm"
                      className="rounded-full border border-border-default text-text-tertiary"
                      onPress={() => setShowAssigneePopover((prev) => !prev)}
                    >
                      <Plus size={16} />
                    </IconButton>
                    {showAssigneePopover && (
                      <div className="absolute left-0 top-full z-10 mt-1 max-h-60 w-56 overflow-y-auto rounded-md border border-border-default bg-bg-primary p-1 shadow-lg">
                        {users.map((user) => {
                          const isAssigned = assigneeIds.includes(user.id);
                          return (
                            <button
                              key={user.id}
                              type="button"
                              className="flex w-full items-center gap-2 rounded px-2.5 py-1.5 text-sm text-text-primary hover:bg-bg-secondary"
                              onClick={() => toggleAssignee(user.id)}
                            >
                              {isAssigned ? (
                                <Check size={14} className="shrink-0 text-primary-default" />
                              ) : (
                                <span className="w-3.5 shrink-0" />
                              )}
                              <Avatar name={user.displayName} size="sm" className="h-5 w-5" />
                              <span className="truncate">{user.displayName}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </FieldLabel>

              {/* バックログURL */}
              <FieldLabel label="バックログURL" htmlFor="task-backlog-url">
                <input
                  id="task-backlog-url"
                  type="text"
                  value={backlogUrl}
                  onChange={(e) => setBacklogUrl(e.target.value)}
                  placeholder="https://ss-pj.jp/backlog/view/REG2017-2229"
                  className={INPUT_CLASS}
                />
                <span className="text-xs text-text-tertiary">
                  タイトルにチケット番号を入力すると自動生成されます
                </span>
              </FieldLabel>

              {/* 日付 */}
              <div className="grid grid-cols-2 gap-4">
                <FieldLabel label="ITアップ日" htmlFor="task-itup-date">
                  <input
                    id="task-itup-date"
                    type="date"
                    value={itUpDate}
                    onChange={(e) => setItUpDate(e.target.value)}
                    className={INPUT_CLASS}
                  />
                </FieldLabel>
                <FieldLabel label="リリース日" htmlFor="task-release-date">
                  <input
                    id="task-release-date"
                    type="date"
                    value={releaseDate}
                    onChange={(e) => setReleaseDate(e.target.value)}
                    className={INPUT_CLASS}
                  />
                </FieldLabel>
              </div>

              {/* 送信ボタン */}
              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full"
                isDisabled={!canSubmit || createTask.isPending}
              >
                {createTask.isPending ? '作成中...' : 'タスクを作成'}
              </Button>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function FieldLabel({
  label,
  required,
  htmlFor,
  children,
}: {
  label: string;
  required?: boolean;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium text-text-secondary">
        {label}
        {required && <span className="ml-1 text-error-text">*</span>}
      </label>
      {children}
    </div>
  );
}
