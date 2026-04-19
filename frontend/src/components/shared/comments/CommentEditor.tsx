/* eslint-disable react/prop-types */
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from 'react';
import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Mention from '@tiptap/extension-mention';
import Placeholder from '@tiptap/extension-placeholder';
import { ReactRenderer } from '@tiptap/react';
import type { SuggestionProps, SuggestionKeyDownProps } from '@tiptap/suggestion';
import { MentionList } from './MentionList';
import type { User } from '../../../types';

export interface CommentEditorProps {
  users: User[];
  placeholder?: string;
  disabled?: boolean;
  initialContent?: string;
  onSubmit?: (html: string, mentionedUserIds: string[]) => void;
  onIsEmptyChange?: (isEmpty: boolean) => void;
}

export interface CommentEditorHandle {
  getHTML: () => string;
  getMentionedUserIds: () => string[];
  clear: () => void;
  focus: () => void;
  isEmpty: () => boolean;
}

export const CommentEditor = forwardRef<CommentEditorHandle, CommentEditorProps>(
  (
    {
      users,
      placeholder = 'コメントを入力...',
      disabled = false,
      initialContent,
      onSubmit,
      onIsEmptyChange,
    },
    ref
  ) => {
    const mentionedUserIdsRef = useRef<Set<string>>(new Set());
    const usersRef = useRef<User[]>(users);

    useEffect(() => {
      usersRef.current = users;
    }, [users]);

    const getSuggestionItems = useCallback(({ query }: { query: string }) => {
      const q = query.toLowerCase();
      return usersRef.current.filter(
        (user) => user.displayName.toLowerCase().includes(q) || user.email.toLowerCase().includes(q)
      );
    }, []);

    const editor = useEditor({
      immediatelyRender: false,
      content: initialContent || '',
      extensions: [
        StarterKit.configure({
          heading: false,
          blockquote: false,
          codeBlock: false,
          horizontalRule: false,
          bulletList: false,
          orderedList: false,
          listItem: false,
        }),
        Placeholder.configure({
          placeholder,
        }),
        Link.configure({
          openOnClick: false,
          autolink: true,
          linkOnPaste: true,
          HTMLAttributes: {
            class: 'comment-link',
            target: '_blank',
            rel: 'noopener noreferrer',
          },
        }),
        Mention.configure({
          HTMLAttributes: {
            class: 'comment-mention',
          },
          suggestion: {
            char: '@',
            items: getSuggestionItems,
            render: () => {
              let component: ReactRenderer<
                { onKeyDown: (props: SuggestionKeyDownProps) => boolean },
                React.ComponentPropsWithoutRef<typeof MentionList>
              > | null = null;
              let popup: HTMLDivElement | null = null;
              let selectedIndex = 0;

              return {
                onStart: (props: SuggestionProps<User>) => {
                  selectedIndex = 0;
                  popup = document.createElement('div');
                  popup.style.position = 'fixed';
                  popup.style.zIndex = '9999';

                  const rect = props.clientRect?.();
                  if (rect) {
                    popup.style.left = `${rect.left}px`;
                    popup.style.top = `${rect.bottom + 4}px`;
                  }

                  document.body.appendChild(popup);

                  component = new ReactRenderer(MentionList, {
                    props: {
                      items: props.items,
                      command: props.command,
                      selectedIndex,
                    },
                    editor: props.editor,
                  });

                  if (popup && component.element) {
                    popup.appendChild(component.element);
                  }
                },

                onUpdate: (props: SuggestionProps<User>) => {
                  selectedIndex =
                    props.items.length === 0 ? 0 : Math.min(selectedIndex, props.items.length - 1);

                  if (component) {
                    component.updateProps({
                      items: props.items,
                      command: props.command,
                      selectedIndex,
                    });
                  }

                  if (popup) {
                    const rect = props.clientRect?.();
                    if (rect) {
                      popup.style.left = `${rect.left}px`;
                      popup.style.top = `${rect.bottom + 4}px`;
                    }
                  }
                },

                onKeyDown: (props: SuggestionKeyDownProps) => {
                  if (props.event.key === 'Escape') {
                    popup?.remove();
                    popup = null;
                    component?.destroy();
                    component = null;
                    return true;
                  }

                  if (props.event.key === 'ArrowUp') {
                    selectedIndex = Math.max(0, selectedIndex - 1);
                    component?.updateProps({ selectedIndex });
                    return true;
                  }

                  if (props.event.key === 'ArrowDown') {
                    const items = (component?.props as { items?: User[] })?.items || [];
                    selectedIndex =
                      items.length === 0 ? 0 : Math.min(items.length - 1, selectedIndex + 1);
                    component?.updateProps({ selectedIndex });
                    return true;
                  }

                  return component?.ref?.onKeyDown(props) || false;
                },

                onExit: () => {
                  popup?.remove();
                  popup = null;
                  component?.destroy();
                  component = null;
                },
              };
            },
          },
        }),
      ],
      editable: !disabled,
      editorProps: {
        attributes: {
          class: 'comment-editor-content',
          'data-placeholder': placeholder,
        },
        handleKeyDown: (_view, event) => {
          if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
            event.preventDefault();
            if (onSubmit && editor && !isEditorEmpty(editor)) {
              const html = editor.getHTML();
              onSubmit(html, Array.from(mentionedUserIdsRef.current));
            }
            return true;
          }
          return false;
        },
      },
      onUpdate: ({ editor: updatedEditor }) => {
        const ids = mentionedUserIdsRef.current;
        ids.clear();
        updatedEditor.state.doc.descendants((node) => {
          if (node.type.name === 'mention' && node.attrs.id) {
            ids.add(node.attrs.id as string);
          }
        });
        onIsEmptyChange?.(isEditorEmpty(updatedEditor));
      },
    });

    useImperativeHandle(ref, () => ({
      getHTML: () => editor?.getHTML() || '',
      getMentionedUserIds: () => Array.from(mentionedUserIdsRef.current),
      clear: () => {
        editor?.commands.clearContent();
        mentionedUserIdsRef.current.clear();
      },
      focus: () => editor?.commands.focus(),
      isEmpty: () => {
        if (!editor) return true;
        return isEditorEmpty(editor);
      },
    }));

    useEffect(() => {
      if (editor) {
        editor.setEditable(!disabled);
      }
    }, [editor, disabled]);

    return (
      <div className="rounded-md border border-border-default bg-bg-secondary px-3 py-2 text-sm text-text-primary focus-within:border-primary-default focus-within:ring-1 focus-within:ring-primary-default">
        <EditorContent editor={editor} />
      </div>
    );
  }
);

CommentEditor.displayName = 'CommentEditor';

function isEditorEmpty(editor: Editor): boolean {
  if (editor.state.doc.textContent.trim().length > 0) return false;
  let hasMention = false;
  editor.state.doc.descendants((node) => {
    if (node.type.name === 'mention') hasMention = true;
  });
  return !hasMention;
}
