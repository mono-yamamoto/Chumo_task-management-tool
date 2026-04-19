import { useCallback, useEffect, useRef, useState } from 'react';

interface UseAssigneePopoverArgs {
  initialIds: string[];
  onCommit: (ids: string[]) => void;
}

function sameIdSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const setB = new Set(b);
  for (const id of a) {
    if (!setB.has(id)) return false;
  }
  return true;
}

export function useAssigneePopover({ initialIds, onCommit }: UseAssigneePopoverArgs) {
  const [isOpen, setIsOpen] = useState(false);
  const [draftIds, setDraftIds] = useState<string[]>(initialIds);
  const popoverRef = useRef<HTMLDivElement>(null);

  const initialIdsRef = useRef(initialIds);
  const onCommitRef = useRef(onCommit);
  const draftIdsRef = useRef(draftIds);

  useEffect(() => {
    initialIdsRef.current = initialIds;
    onCommitRef.current = onCommit;
    draftIdsRef.current = draftIds;
  });

  // 閉じている間にサーバーから新しい値が来たらドラフトを同期する。
  // 開いている間はユーザー操作中なので上書きしない。
  useEffect(() => {
    if (!isOpen) setDraftIds(initialIds);
  }, [initialIds, isOpen]);

  const close = useCallback(() => {
    setIsOpen(false);
    const current = draftIdsRef.current;
    if (!sameIdSet(current, initialIdsRef.current)) {
      onCommitRef.current(current);
    }
  }, []);

  const open = useCallback(() => {
    setDraftIds(initialIdsRef.current);
    setIsOpen(true);
  }, []);

  const toggle = useCallback(() => {
    if (isOpen) close();
    else open();
  }, [isOpen, open, close]);

  const toggleId = useCallback((userId: string) => {
    setDraftIds((current) =>
      current.includes(userId) ? current.filter((id) => id !== userId) : [...current, userId]
    );
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const handleMouseDown = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        close();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      // モーダル側のEscape処理よりも先にこのポップオーバーを閉じ、外に伝播させない。
      e.stopPropagation();
      e.preventDefault();
      close();
    };
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('keydown', handleKeyDown, true);
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [isOpen, close]);

  return {
    isOpen,
    draftIds,
    popoverRef,
    toggle,
    toggleId,
    close,
  } as const;
}
