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

// 正規表現用にIDをエスケープ
function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// HTML属性用にIDをエスケープ
function escapeHtmlAttribute(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** 自分宛のメンションにハイライトクラスを追加 */
export function highlightSelfMentions(html: string, currentUserId: string): string {
  const escapedId = escapeRegExp(currentUserId);
  const safeId = escapeHtmlAttribute(currentUserId);

  const regex = new RegExp(
    `<span([^>]*)class="comment-mention"([^>]*)data-id="${escapedId}"([^>]*)>`,
    'g'
  );
  const regex2 = new RegExp(
    `<span([^>]*)data-id="${escapedId}"([^>]*)class="comment-mention"([^>]*)>`,
    'g'
  );

  return html
    .replace(
      regex,
      '<span$1class="comment-mention comment-mention-self"$2data-id="' + safeId + '"$3>'
    )
    .replace(
      regex2,
      '<span$1data-id="' + safeId + '"$2class="comment-mention comment-mention-self"$3>'
    );
}

/** コメントコンテンツをレンダリング用HTMLに変換 */
export function prepareCommentHtml(content: string, currentUserId: string): string {
  const rawHtml = isHtmlContent(content) ? content : plainTextToHtml(content);
  const sanitized = sanitizeCommentHtml(rawHtml);
  return highlightSelfMentions(sanitized, currentUserId);
}
