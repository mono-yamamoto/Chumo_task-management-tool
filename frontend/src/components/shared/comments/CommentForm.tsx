import { useRef, useState } from 'react';
import { Send } from 'lucide-react';
import { IconButton } from '../../ui/IconButton';
import { useCreateComment } from '../../../hooks/useTaskComments';
import { useUsers } from '../../../hooks/useUsers';
import { CommentEditor, type CommentEditorHandle } from './CommentEditor';

interface CommentFormProps {
  taskId: string;
  projectType: string;
  className?: string;
}

export function CommentForm({ taskId, projectType, className }: CommentFormProps) {
  const editorRef = useRef<CommentEditorHandle>(null);
  const createComment = useCreateComment();
  const { data: users = [] } = useUsers();
  const [isEmpty, setIsEmpty] = useState(true);

  const handleSubmit = (html: string, mentionedUserIds: string[]) => {
    if (createComment.isPending || editorRef.current?.isEmpty()) return;

    createComment.mutate(
      { taskId, projectType, content: html, mentionedUserIds },
      {
        onSuccess: () => {
          editorRef.current?.clear();
          setIsEmpty(true);
        },
      }
    );
  };

  const handleSendClick = () => {
    if (!editorRef.current || editorRef.current.isEmpty()) return;
    const html = editorRef.current.getHTML();
    const mentionedUserIds = editorRef.current.getMentionedUserIds();
    handleSubmit(html, mentionedUserIds);
  };

  return (
    <div className={className}>
      <div className="flex gap-2">
        <div className="flex-1">
          <CommentEditor
            ref={editorRef}
            users={users}
            placeholder="コメントを入力... (Cmd+Enter で送信)"
            onSubmit={handleSubmit}
            onIsEmptyChange={setIsEmpty}
          />
        </div>
        <IconButton
          onPress={handleSendClick}
          isDisabled={isEmpty || createComment.isPending}
          aria-label="コメントを送信"
          className="shrink-0 self-end bg-primary-default text-white hover:bg-primary-hover hover:text-white"
        >
          <Send size={16} />
        </IconButton>
      </div>
    </div>
  );
}
