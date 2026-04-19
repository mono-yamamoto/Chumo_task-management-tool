/**
 * D&D 並び替え時の新しい order 値を計算する（Fractional Indexing）
 *
 * React Aria の onReorder が返す dropPosition ('before' | 'after') に対応。
 * items は order 昇順でソート済みであること。
 */
export function calculateNewOrder(
  sortedItems: { id: string; order: number }[],
  draggedId: string,
  targetId: string,
  dropPosition: 'before' | 'after'
): number {
  // ドラッグ対象を除いたリストで計算
  const filtered = sortedItems.filter((item) => item.id !== draggedId);
  const targetIndex = filtered.findIndex((item) => item.id === targetId);

  if (targetIndex === -1) {
    // ターゲットが見つからない場合はフォールバック
    const dragged = sortedItems.find((item) => item.id === draggedId);
    return dragged?.order ?? 0;
  }

  if (dropPosition === 'before') {
    const prev = filtered[targetIndex - 1];
    const target = filtered[targetIndex]!;
    if (!prev) {
      // 先頭に配置
      return target.order - 1;
    }
    return (prev.order + target.order) / 2;
  }

  // dropPosition === 'after'
  const target = filtered[targetIndex]!;
  const next = filtered[targetIndex + 1];
  if (!next) {
    // 末尾に配置
    return target.order + 1;
  }
  return (target.order + next.order) / 2;
}
