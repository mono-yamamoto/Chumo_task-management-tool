import { Send } from 'lucide-react';
import { Avatar } from '../../../components/ui/Avatar';
import { Button } from '../../../components/ui/Button';

const MOCK_COMMENTS = [
  {
    id: 'c1',
    name: '梅村',
    date: '2026/01/30 14:32',
    content: 'デザイン確認完了しました。コーディング着手してOKです。',
  },
  {
    id: 'c2',
    name: '光田',
    date: '2026/01/30 15:10',
    content: '了解です！チェックシートも作成しておきます。',
  },
];

export function TaskDetailComments() {
  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-md font-bold text-text-primary">コメント</h2>

      {/* コメント一覧 */}
      {MOCK_COMMENTS.map((comment) => (
        <div key={comment.id} className="flex gap-2">
          <Avatar name={comment.name} size="sm" className="h-7 w-7 shrink-0" />
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-text-primary">{comment.name}</span>
              <span className="text-xs text-text-tertiary">{comment.date}</span>
            </div>
            <p className="whitespace-pre-wrap text-sm leading-normal text-text-primary">
              {comment.content}
            </p>
          </div>
        </div>
      ))}

      {/* 入力欄 */}
      <div className="flex h-10 items-center justify-between rounded-md border border-border-default bg-bg-secondary px-3 py-2">
        <span className="text-sm text-text-tertiary">コメントを入力...</span>
        <Button
          variant="primary"
          size="sm"
          onPress={() => {}} // TODO: コメント送信処理
          className="text-xs"
        >
          <Send size={14} />
          送信
        </Button>
      </div>
    </div>
  );
}
