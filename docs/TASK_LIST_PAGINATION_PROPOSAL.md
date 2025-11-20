# タスク一覧のページネーション実装提案

## 現状の問題点

現在のタスク一覧実装では、以下の問題があります：

1. **全件取得**: `useTasks`フックで`getDocs`を使用し、すべてのタスクを一度に取得している
2. **ページネーションなし**: 無限スクロールやページネーションの実装がない
3. **クライアント側フィルタリング**: 全件取得後にクライアント側でフィルタリングしている

### 影響

- **パフォーマンス**: タスク数が増えると初回読み込みが遅くなる
- **メモリ使用量**: すべてのタスクデータをメモリに保持する必要がある
- **ネットワーク転送量**: 不要なデータも含めて全件取得している

## 実装提案

### オプション1: Firestoreのクエリ制限を使用（推奨）

Firestoreの`limit`と`startAfter`を使用したページネーション実装。

#### メリット
- サーバー側でフィルタリングできるため、転送データ量が削減される
- 初回読み込みが高速
- Firestoreのインデックスを活用できる

#### 実装方針

```typescript
// hooks/useTasks.ts の修正例
export function useTasks(
  projectType: ProjectType | 'all' = 'all',
  options?: {
    limit?: number;        // 初期読み込み件数（デフォルト: 50）
    loadMore?: number;     // 追加読み込み件数（デフォルト: 20）
    statusFilter?: FlowStatus | 'all' | 'not-completed';
    // その他のフィルタ条件
  }
) {
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(true);

  return useInfiniteQuery({
    queryKey: ['tasks', projectType, options],
    queryFn: async ({ pageParam }) => {
      // Firestoreクエリを構築
      let query: Query = collection(db, 'projects', projectType, 'tasks');

      // ステータスフィルタを適用
      if (options?.statusFilter === 'not-completed') {
        query = query.where('flowStatus', '!=', '完了');
      } else if (options?.statusFilter && options.statusFilter !== 'all') {
        query = query.where('flowStatus', '==', options.statusFilter);
      }

      // ソートとリミット
      query = query
        .orderBy('createdAt', 'desc')
        .limit(options?.limit || 50);

      // ページネーション
      if (pageParam) {
        query = query.startAfter(pageParam);
      }

      const snapshot = await getDocs(query);
      const tasks = snapshot.docs.map(doc => transformTaskData(doc, projectType));

      return {
        tasks,
        lastDoc: snapshot.docs[snapshot.docs.length - 1] || null,
        hasMore: snapshot.docs.length === (options?.limit || 50),
      };
    },
    getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.lastDoc : undefined,
    initialPageParam: null,
  });
}
```

#### 必要なFirestoreインデックス

```json
{
  "indexes": [
    {
      "collectionGroup": "tasks",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "flowStatus",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "createdAt",
          "order": "DESCENDING"
        }
      ]
    }
  ]
}
```

### オプション2: クライアント側の仮想スクロール

全件取得は維持しつつ、表示を仮想スクロールで最適化。

#### メリット
- 実装が比較的簡単
- 既存のコードを大きく変更しない

#### デメリット
- 全件取得の問題は解決しない
- メモリ使用量は変わらない

### 推奨設定値

- **初期読み込み件数**: 50件
- **追加読み込み件数**: 20件

これらの値は、一般的なタスク管理ツールの実装を参考にしています。

## 実装優先度

1. **高**: タスク数が100件を超える場合
2. **中**: タスク数が50-100件の場合
3. **低**: タスク数が50件未満の場合

現在のタスク数に応じて、実装の優先度を判断してください。

