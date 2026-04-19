import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from 'react';
import type { SuggestionKeyDownProps } from '@tiptap/suggestion';
import type { User } from '../../../types';

interface MentionListProps {
  items: User[];
  command: (props: { id: string; label: string }) => void;
  selectedIndex: number;
}

export const MentionList = forwardRef<
  { onKeyDown: (props: SuggestionKeyDownProps) => boolean },
  MentionListProps
>(({ items, command, selectedIndex }, ref) => {
  const listRef = useRef<HTMLDivElement>(null);

  const selectItem = useCallback(
    (index: number) => {
      const item = items[index];
      if (item) {
        command({ id: item.id, label: item.displayName });
      }
    },
    [items, command]
  );

  useEffect(() => {
    if (listRef.current) {
      const selectedElement = listRef.current.children[selectedIndex] as HTMLElement | undefined;
      selectedElement?.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }: SuggestionKeyDownProps) => {
      if (event.key === 'Enter') {
        selectItem(selectedIndex);
        return true;
      }
      return false;
    },
  }));

  if (items.length === 0) return null;

  return (
    <div
      ref={listRef}
      className="max-h-48 min-w-48 overflow-y-auto rounded-lg border border-border-default bg-bg-primary shadow-lg"
      role="listbox"
    >
      {items.map((item, index) => (
        <button
          key={item.id}
          type="button"
          role="option"
          aria-selected={index === selectedIndex}
          onClick={() => selectItem(index)}
          className={`w-full px-3 py-1.5 text-left text-sm ${
            index === selectedIndex
              ? 'bg-primary-bg text-primary-default'
              : 'text-text-primary hover:bg-bg-secondary'
          }`}
        >
          {item.displayName}
        </button>
      ))}
    </div>
  );
});

MentionList.displayName = 'MentionList';
