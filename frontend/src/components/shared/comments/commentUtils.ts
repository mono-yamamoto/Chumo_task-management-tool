import DOMPurify from 'dompurify';

/** HTMLコンテンツかどうかを判定（後方互換性のため） */
export function isHtmlContent(content: string): boolean {
  return content.startsWith('<') && content.includes('</');
}

/** プレーンテキストをHTMLに変換（既存コメントの後方互換性） */
export function plainTextToHtml(text: string): string {
  const urlRegex = /(https?:\/\/[^\s<>"{}|\\^`[\]]+)/g;
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>');

  return `<p>${escaped.replace(
    urlRegex,
    '<a href="$1" target="_blank" rel="noopener noreferrer" class="comment-link">$1</a>'
  )}</p>`;
}

/** DOMPurify でサニタイズ */
export function sanitizeCommentHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'br', 'a', 'span', 'strong', 'em'],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'class', 'data-id'],
  });
}

/** 自分宛のメンションにハイライトクラスを追加 */
export function highlightSelfMentions(html: string, currentUserId: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  doc.querySelectorAll<HTMLSpanElement>('span.comment-mention[data-id]').forEach((el) => {
    if (el.getAttribute('data-id') === currentUserId) {
      el.classList.add('comment-mention-self');
    }
  });
  return doc.body.innerHTML;
}

/** コメントコンテンツをレンダリング用HTMLに変換 */
export function prepareCommentHtml(content: string, currentUserId: string): string {
  const rawHtml = isHtmlContent(content) ? content : plainTextToHtml(content);
  const sanitized = sanitizeCommentHtml(rawHtml);
  return highlightSelfMentions(sanitized, currentUserId);
}
