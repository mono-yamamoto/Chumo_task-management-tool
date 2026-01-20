/* eslint-disable react/prop-types */
'use client';

import { useCallback, useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { Box, Paper, List, ListItemButton, ListItemText, CircularProgress, IconButton, Tooltip } from '@mui/material';
import { Image as ImageIcon } from '@mui/icons-material';
import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Mention from '@tiptap/extension-mention';
import Image from '@tiptap/extension-image';
import { ReactRenderer } from '@tiptap/react';
import { SuggestionProps, SuggestionKeyDownProps } from '@tiptap/suggestion';
import { User } from '@/types';
import { uploadCommentImage } from '@/lib/firebase/storage';

// メンションリストコンポーネント
interface MentionListProps {
  items: User[];
  command: (props: { id: string; label: string }) => void;
  selectedIndex: number;
}

const MentionList = forwardRef<
  { onKeyDown: (props: SuggestionKeyDownProps) => boolean },
  MentionListProps
>(({ items, command, selectedIndex }, ref) => {
  const listRef = useRef<HTMLUListElement>(null);

  const selectItem = useCallback(
    (index: number) => {
      const item = items[index];
      if (item) {
        command({ id: item.id, label: item.displayName });
      }
    },
    [items, command]
  );

  // 選択されたアイテムが見えるようにスクロール
  useEffect(() => {
    if (listRef.current) {
      const selectedElement = listRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }: SuggestionKeyDownProps) => {
      if (event.key === 'ArrowUp') {
        return true;
      }
      if (event.key === 'ArrowDown') {
        return true;
      }
      if (event.key === 'Enter') {
        selectItem(selectedIndex);
        return true;
      }
      return false;
    },
  }));

  if (items.length === 0) {
    return null;
  }

  return (
    <Paper
      elevation={8}
      sx={{
        position: 'absolute',
        zIndex: 1000,
        maxHeight: 200,
        overflow: 'auto',
        minWidth: 200,
      }}
    >
      <List dense ref={listRef}>
        {items.map((item, index) => (
          <ListItemButton
            key={item.id}
            selected={index === selectedIndex}
            onClick={() => selectItem(index)}
            sx={{ py: 0.5 }}
          >
            <ListItemText
              primary={item.displayName}
              primaryTypographyProps={{ variant: 'body2' }}
            />
          </ListItemButton>
        ))}
      </List>
    </Paper>
  );
});

MentionList.displayName = 'MentionList';

// エディタコンポーネントのProps
export interface CommentEditorProps {
  users: User[];
  projectType: string;
  taskId: string;
  placeholder?: string;
  disabled?: boolean;
  initialContent?: string;
  onSubmit?: (html: string, mentionedUserIds: string[]) => void;
  onChange?: (html: string, mentionedUserIds: string[]) => void;
}

// エディタの公開メソッド
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
      projectType,
      taskId,
      placeholder = 'コメントを入力...',
      disabled = false,
      initialContent,
      onSubmit,
      onChange,
    },
    ref
  ) => {
    const mentionedUserIdsRef = useRef<Set<string>>(new Set());
    const usersRef = useRef<User[]>(users);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isUploading, setIsUploading] = useState(false);

    // usersが更新されたらrefも更新
    useEffect(() => {
      usersRef.current = users;
    }, [users]);

    // 画像をアップロードしてエディタに挿入
    const handleImageUpload = useCallback(
      async (file: File, editorInstance: Editor) => {
        if (!file.type.startsWith('image/')) {
          return;
        }

        setIsUploading(true);
        try {
          const url = await uploadCommentImage(file, projectType, taskId);
          editorInstance.chain().focus().setImage({ src: url }).run();
        } catch (error) {
          console.error('Failed to upload image:', error);
        } finally {
          setIsUploading(false);
        }
      },
      [projectType, taskId]
    );

    // メンションのサジェスト設定（refを使って最新のusersを参照）
    // 名前とメールアドレスの両方で検索可能
    const getSuggestionItems = useCallback(({ query }: { query: string }) => {
      const q = query.toLowerCase();
      return usersRef.current.filter(
        (user) =>
          user.displayName.toLowerCase().includes(q) || user.email.toLowerCase().includes(q)
      );
    }, []);

    const editor = useEditor({
      immediatelyRender: false, // SSR対応
      content: initialContent || '',
      extensions: [
        StarterKit.configure({
          // コメント用なので最小限の機能に制限
          heading: false,
          blockquote: false,
          codeBlock: false,
          horizontalRule: false,
          bulletList: false,
          orderedList: false,
          listItem: false,
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
        Image.configure({
          HTMLAttributes: {
            class: 'comment-image',
          },
          allowBase64: false,
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
                MentionListProps
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
                    component?.destroy();
                    return true;
                  }

                  if (props.event.key === 'ArrowUp') {
                    selectedIndex = Math.max(0, selectedIndex - 1);
                    component?.updateProps({ selectedIndex });
                    return true;
                  }

                  if (props.event.key === 'ArrowDown') {
                    const items = component?.props?.items || [];
                    selectedIndex = Math.min(items.length - 1, selectedIndex + 1);
                    component?.updateProps({ selectedIndex });
                    return true;
                  }

                  return component?.ref?.onKeyDown(props) || false;
                },

                onExit: () => {
                  popup?.remove();
                  component?.destroy();
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
        handleKeyDown: (view, event) => {
          // Ctrl+Enter または Cmd+Enter で送信
          if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
            event.preventDefault();
            if (onSubmit && !isEditorEmpty(view.state.doc)) {
              const html = editor?.getHTML() || '';
              onSubmit(html, Array.from(mentionedUserIdsRef.current));
            }
            return true;
          }
          return false;
        },
        handlePaste: (view, event) => {
          const items = event.clipboardData?.items;
          if (!items || !editor) return false;

          for (const item of items) {
            if (item.type.startsWith('image/')) {
              event.preventDefault();
              const file = item.getAsFile();
              if (file) {
                handleImageUpload(file, editor);
              }
              return true;
            }
          }
          return false;
        },
        handleDrop: (view, event) => {
          const files = event.dataTransfer?.files;
          if (!files || files.length === 0 || !editor) return false;

          for (const file of files) {
            if (file.type.startsWith('image/')) {
              event.preventDefault();
              handleImageUpload(file, editor);
              return true;
            }
          }
          return false;
        },
      },
      onUpdate: ({ editor: updatedEditor }) => {
        // メンションされたユーザーIDを抽出
        const newMentionedIds = new Set<string>();
        updatedEditor.state.doc.descendants((node) => {
          if (node.type.name === 'mention' && node.attrs.id) {
            newMentionedIds.add(node.attrs.id);
          }
        });
        mentionedUserIdsRef.current = newMentionedIds;

        if (onChange) {
          onChange(updatedEditor.getHTML(), Array.from(newMentionedIds));
        }
      },
    });

    // ファイル選択ダイアログからの画像アップロード
    const handleFileSelect = useCallback(
      (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file && editor) {
          handleImageUpload(file, editor);
        }
        // 同じファイルを再選択できるようにリセット
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      },
      [editor, handleImageUpload]
    );

    // 画像添付ボタンクリック
    const handleAttachClick = useCallback(() => {
      fileInputRef.current?.click();
    }, []);

    // エディタが空かどうかチェック
    const isEditorEmpty = (doc: Editor['state']['doc']) => {
      return doc.textContent.trim().length === 0;
    };

    // refを通じて公開するメソッド
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
        // 画像がある場合は空ではない
        let hasImage = false;
        editor.state.doc.descendants((node) => {
          if (node.type.name === 'image') {
            hasImage = true;
          }
        });
        if (hasImage) return false;
        return isEditorEmpty(editor.state.doc);
      },
    }));

    // disabledが変わったときにeditableを更新
    useEffect(() => {
      if (editor) {
        editor.setEditable(!disabled);
      }
    }, [editor, disabled]);

    return (
      <Box sx={{ position: 'relative' }}>
        {/* 隠しファイル入力 */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />

        <Box
          sx={{
            '& .comment-editor-content': {
              outline: 'none',
              minHeight: '60px',
              fontSize: '0.875rem',
              lineHeight: 1.5,
              '&:empty::before': {
                content: 'attr(data-placeholder)',
                color: 'text.secondary',
                pointerEvents: 'none',
              },
            },
            '& .comment-mention': {
              backgroundColor: 'primary.light',
              color: 'primary.contrastText',
              borderRadius: '4px',
              px: 0.5,
              py: 0.25,
              fontWeight: 500,
            },
            '& .comment-link': {
              color: 'primary.main',
              textDecoration: 'none',
              '&:hover': {
                textDecoration: 'underline',
              },
            },
            '& .comment-image': {
              maxWidth: '100%',
              height: 'auto',
              borderRadius: '4px',
              my: 1,
            },
            '& p': {
              margin: 0,
            },
            border: '1px solid',
            borderColor: disabled ? 'action.disabled' : 'divider',
            borderRadius: 1,
            borderBottomLeftRadius: 0,
            borderBottomRightRadius: 0,
            p: 1.5,
            backgroundColor: disabled ? 'action.disabledBackground' : 'background.paper',
            '&:focus-within': {
              borderColor: 'primary.main',
              boxShadow: (theme) => `0 0 0 1px ${theme.palette.primary.main}`,
            },
          }}
        >
          <EditorContent editor={editor} />
          {isUploading && (
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(255, 255, 255, 0.7)',
                borderRadius: 1,
              }}
            >
              <CircularProgress size={24} />
            </Box>
          )}
        </Box>

        {/* ツールバー */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            px: 1,
            py: 0.5,
            border: '1px solid',
            borderTop: 'none',
            borderColor: disabled ? 'action.disabled' : 'divider',
            borderBottomLeftRadius: 4,
            borderBottomRightRadius: 4,
            backgroundColor: disabled ? 'action.disabledBackground' : 'grey.50',
          }}
        >
          <Tooltip title="画像を添付">
            <span>
              <IconButton
                size="small"
                onClick={handleAttachClick}
                disabled={disabled || isUploading}
                sx={{ p: 0.5 }}
              >
                <ImageIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        </Box>
      </Box>
    );
  }
);

CommentEditor.displayName = 'CommentEditor';
