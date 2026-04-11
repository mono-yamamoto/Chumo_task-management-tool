import { useMemo } from 'react';
import { prepareCommentHtml } from './commentUtils';

interface CommentContentProps {
  content: string;
  currentUserId: string;
}

/**
 * コメントのHTMLコンテンツを安全にレンダリングするコンポーネント。
 * DOMPurify でサニタイズ済みのHTMLのみを描画する。
 */
export function CommentContent({ content, currentUserId }: CommentContentProps) {
  const html = useMemo(() => prepareCommentHtml(content, currentUserId), [content, currentUserId]);

  return (
    <div
      className="comment-html-content mt-1 text-sm leading-relaxed text-text-primary break-words"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
