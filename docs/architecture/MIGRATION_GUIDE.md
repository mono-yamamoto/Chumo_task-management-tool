# レイヤードアーキテクチャ移行ガイド

このドキュメントでは、既存コードをレイヤードアーキテクチャに移行する具体的な手順を説明します。

## 目次

1. [移行の方針](#移行の方針)
2. [Contact API の移行例](#contact-api-の移行例)
3. [Tasks Page の移行例](#tasks-page-の移行例)
4. [移行チェックリスト](#移行チェックリスト)

## 移行の方針

### 段階的移行アプローチ

1. **Phase 1**: 新しい機能では新しいアーキテクチャを使用
2. **Phase 2**: 既存コードのリファクタリング（優先度順）
3. **Phase 3**: テストカバレッジの向上

### リファクタリングの優先順位

1. **高優先度**: 巨大なファイル（300行以上）、ビジネスロジックが複雑な箇所
2. **中優先度**: 中規模ファイル（100-300行）、バリデーションが複雑な箇所
3. **低優先度**: 小規模ファイル（100行以下）、シンプルな処理

## Contact API の移行例

### Before (476行)

```typescript
// app/api/contact/route.ts
export async function POST(request: NextRequest) {
  try {
    // 認証ロジック (50行)
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }
    const token = authHeader.split('Bearer ')[1];

    // Firebase初期化 (30行)
    if (getApps().length === 0) {
      // ...
    }

    // トークン検証 (20行)
    const auth = getAuth();
    let decodedToken;
    try {
      decodedToken = await auth.verifyIdToken(token);
    } catch {
      return NextResponse.json({ error: '無効な認証トークンです' }, { status: 401 });
    }

    // バリデーションロジック (100行以上)
    if (!type || !title) {
      return NextResponse.json({ error: 'type、titleは必須です' }, { status: 400 });
    }
    if (type === 'error' && !errorReportDetails) {
      return NextResponse.json({ error: 'エラー報告の場合、詳細情報は必須です' }, { status: 400 });
    }
    // ... 100行以上のバリデーション

    // データ永続化ロジック (200行)
    // ... Firestore保存処理

    // 外部API呼び出しロジック (100行)
    // ... GitHub issue作成処理
  } catch (error) {
    // エラーハンドリング
  }
}
```

**問題点**:
- 1つのファイルに全てのロジックが集約（476行）
- 認証・バリデーション・ビジネスロジックが混在
- 単体テストが困難
- 再利用不可能

### After (約80行)

```typescript
// app/api/contact/route.ts
import { AuthService } from '@/lib/application/services/authService';
import { ContactValidator } from '@/lib/application/validators/contactValidator';
import { CreateContactUseCase } from '@/lib/application/usecases/createContact.usecase';

export async function POST(request: NextRequest) {
  try {
    // 認証 (3行)
    const authService = new AuthService();
    const token = authService.extractToken(request.headers.get('authorization'));
    const authResult = await authService.verifyToken(token);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    // リクエストボディ取得 (10行)
    let body: any;
    try {
      body = await request.json();
    } catch (e) {
      return NextResponse.json({ error: 'リクエストボディの解析に失敗しました' }, { status: 400 });
    }

    // バリデーション (5行)
    const validator = new ContactValidator();
    const validationResult = validator.validate(body);
    if (!validationResult.isValid) {
      return NextResponse.json({ error: validationResult.errors.join(', ') }, { status: 400 });
    }

    // ユーザー情報取得 (15行)
    const userDoc = await adminDb?.collection('users').doc(authResult.userId!).get();
    // ...

    // お問い合わせ作成 (10行)
    const createContactUseCase = new CreateContactUseCase();
    const result = await createContactUseCase.execute(
      contactRequest,
      userId,
      userEmail,
      userName
    );

    return NextResponse.json(result);
  } catch (error) {
    // エラーハンドリング
  }
}
```

**改善点**:
- ファイルサイズが約80行に削減（約396行削減）
- 各レイヤーが責務を持ち、コードが読みやすい
- AuthService, ContactValidator, CreateContactUseCaseが単体テスト可能
- 各コンポーネントが再利用可能

### 移行手順

#### 1. AuthService の実装

```typescript
// lib/application/services/authService.ts
export class AuthService {
  extractToken(authHeader: string | null): string | null {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    return authHeader.split('Bearer ')[1];
  }

  async verifyToken(token: string | null): Promise<AuthResult> {
    if (!token) {
      return { success: false, error: '認証トークンが提供されていません' };
    }

    try {
      this.ensureFirebaseInitialized();
      const auth = getAuth();
      const decodedToken = await auth.verifyIdToken(token);

      return {
        success: true,
        userId: decodedToken.uid,
        email: decodedToken.email,
      };
    } catch (error) {
      return { success: false, error: 'トークンの検証に失敗しました' };
    }
  }
}
```

#### 2. ContactValidator の実装

```typescript
// lib/application/validators/contactValidator.ts
export class ContactValidator {
  validate(data: unknown): ValidationResult {
    const errors: string[] = [];

    if (!data || typeof data !== 'object') {
      return { isValid: false, errors: ['リクエストデータが不正です'] };
    }

    const request = data as Partial<CreateContactRequestDTO>;

    // バリデーションロジック
    if (!request.contactType) {
      errors.push('お問い合わせ種別を選択してください');
    }

    if (!request.title || request.title.trim() === '') {
      errors.push('タイトルを入力してください');
    }

    // ... その他のバリデーション

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}
```

#### 3. CreateContactUseCase の実装

```typescript
// lib/application/usecases/createContact.usecase.ts
export class CreateContactUseCase {
  async execute(
    request: CreateContactRequestDTO,
    userId: string,
    userEmail: string,
    userName: string
  ): Promise<CreateContactResponseDTO> {
    const db = adminDb;

    // お問い合わせデータを作成
    const contactData = {
      type: request.contactType,
      title: request.title.trim(),
      content: request.contactContent.trim(),
      userId,
      userName,
      userEmail,
      status: 'pending',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    // Firestoreに保存
    const contactRef = await db.collection('contacts').add(contactData);

    // GitHub issue作成
    await this.createGitHubIssue(contactRef.id, contactData);

    return {
      success: true,
      contactId: contactRef.id,
      message: 'お問い合わせを受け付けました',
    };
  }
}
```

#### 4. API Route の更新

```typescript
// app/api/contact/route.ts
export async function POST(request: NextRequest) {
  const authService = new AuthService();
  const validator = new ContactValidator();
  const useCase = new CreateContactUseCase();

  // 認証 → バリデーション → UseCase実行
}
```

## Tasks Page の移行例

### Before (760行)

```typescript
// app/(dashboard)/tasks/page.tsx
function TasksPageContent() {
  // 状態管理 (80行)
  const [filterStatus, setFilterStatus] = useState('not-completed');
  const [filterAssignee, setFilterAssignee] = useState<string[]>([]);
  // ... 多数の状態変数

  // データ取得 (50行)
  const tasksQuery = useTasks(selectedProjectType);
  const tasks = useMemo(() => {
    // ...
  }, [tasksQuery.data]);

  // フィルタリングロジック (100行)
  const filteredTasks = useMemo(() => {
    let result = [...tasks];

    // ステータスフィルター
    if (filterStatus === 'not-completed') {
      result = result.filter((task) => task.flowStatus !== '完了');
    }

    // アサインフィルター
    if (filterAssignee.length > 0) {
      result = result.filter((task) =>
        task.assigneeIds.some((id) => filterAssignee.includes(id))
      );
    }

    // ... 100行以上のフィルタリングロジック

    return result;
  }, [tasks, filterStatus, filterAssignee, ...]);

  // ソートロジック (100行)
  const sortedTasks = useMemo(() => {
    return [...filteredTasks].sort((a, b) => {
      // アクティブタイマー優先
      // 新規未アサイン優先
      // order順
    });
  }, [filteredTasks, ...]);

  // UI描画 (400行以上)
  return (
    <Box>
      {/* フィルターUI */}
      {/* タスク一覧 */}
      {/* 詳細ドロワー */}
    </Box>
  );
}
```

**問題点**:
- 1つのコンポーネントに全てのロジックが集約（760行）
- フィルタリング・ソートロジックがPresentation層に存在
- ビジネスロジックの単体テストが困難
- コンポーネントが巨大で保守が困難

### After (約200行)

```typescript
// app/(dashboard)/tasks/page.tsx
function TasksPageContent() {
  // データ取得
  const tasksQuery = useTasks(selectedProjectType);
  const tasks = tasksQuery.data?.pages.flatMap((page) => page.tasks) || [];

  // UseCaseを使用したフィルタリング・ソート
  const { sortedTasks, filters, setFilters } = useTasksList({
    tasks,
    activeTaskId: activeSession?.taskId,
  });

  // UI描画
  return (
    <Box>
      <TaskSearchForm filters={filters} onFiltersChange={setFilters} />
      <TaskListTable tasks={sortedTasks} />
      <TaskDetailDrawer />
    </Box>
  );
}
```

**改善点**:
- ファイルサイズが約200行に削減（約560行削減）
- ビジネスロジックが `ListTasksUseCase` に分離
- `useTasksList` フックで再利用可能
- コンポーネントが簡潔で読みやすい

### 移行手順

#### 1. ListTasksUseCase の実装

```typescript
// lib/application/usecases/listTasks.usecase.ts
export class ListTasksUseCase {
  execute(params: {
    tasks: Task[];
    filters: TaskFiltersDTO;
    activeTaskId?: string;
    mountTime: number;
  }): Task[] {
    let filtered = this.applyFilters(params.tasks, params.filters);
    let sorted = this.applySorting(filtered, {
      activeTaskId: params.activeTaskId,
      mountTime: params.mountTime,
    });
    return sorted;
  }

  private applyFilters(tasks: Task[], filters: TaskFiltersDTO): Task[] {
    // フィルタリングロジック
  }

  private applySorting(tasks: Task[], options: SortOptions): Task[] {
    // ソートロジック
  }
}
```

#### 2. useTasksList フックの実装

```typescript
// hooks/useTasksList.ts
export function useTasksList(params: {
  tasks: Task[];
  activeTaskId?: string;
}) {
  const [filters, setFilters] = useState<TaskFiltersDTO>({
    status: 'not-completed',
  });

  const useCase = useMemo(() => new ListTasksUseCase(), []);

  const sortedTasks = useMemo(() => {
    return useCase.execute({
      tasks: params.tasks,
      filters,
      activeTaskId: params.activeTaskId,
      mountTime: Date.now(),
    });
  }, [params.tasks, filters, params.activeTaskId, useCase]);

  return { sortedTasks, filters, setFilters };
}
```

#### 3. Page コンポーネントの更新

```typescript
// app/(dashboard)/tasks/page.tsx
function TasksPageContent() {
  const tasksQuery = useTasks(selectedProjectType);
  const tasks = tasksQuery.data?.pages.flatMap((page) => page.tasks) || [];

  const { sortedTasks, filters, setFilters } = useTasksList({
    tasks,
    activeTaskId: activeSession?.taskId,
  });

  return (
    <Box>
      <TaskSearchForm filters={filters} onFiltersChange={setFilters} />
      <TaskListTable tasks={sortedTasks} />
    </Box>
  );
}
```

## 移行チェックリスト

### ファイル移行時のチェックリスト

- [ ] 既存ファイルをバックアップ（`.backup.ts`として保存）
- [ ] UseCase/Service/Validatorを実装
- [ ] DTOを定義
- [ ] 新しいアーキテクチャでファイルを書き直し
- [ ] 型チェック: `npm run build`
- [ ] リント: `npm run lint`
- [ ] 動作確認（開発環境で実際に動かす）
- [ ] テストを追加（可能であれば）
- [ ] 既存ファイルを置き換え
- [ ] コミット

### リファクタリング優先度

#### 最優先（Phase 2-1）

- [ ] `app/api/contact/route.ts` (476行 → 約80行)
- [ ] `app/(dashboard)/tasks/page.tsx` (760行 → 約200行)

#### 高優先度（Phase 2-2）

- [ ] 他の巨大なAPI Route（300行以上）
- [ ] 他の巨大なページコンポーネント（500行以上）

#### 中優先度（Phase 2-3）

- [ ] 中規模API Route（100-300行）
- [ ] 中規模ページコンポーネント（200-500行）

#### 低優先度（Phase 3）

- [ ] 小規模ファイル（100行以下）

## まとめ

### 移行のメリット

1. **保守性**: 各レイヤーの責務が明確で、変更の影響範囲が限定される
2. **テスタビリティ**: ビジネスロジックの単体テストが容易
3. **再利用性**: UseCase/Service/Validatorは複数箇所で再利用可能
4. **可読性**: コードが簡潔になり、新規メンバーのオンボーディングが容易

### 移行時の注意点

1. **段階的に移行**: 一度に全てを変更せず、1ファイルずつ移行
2. **テストを重視**: 移行後は必ず動作確認とテストを実施
3. **バックアップ**: 既存ファイルは必ずバックアップを取る
4. **レビュー**: チームメンバーにレビューしてもらう

新しい機能を追加する際は、このパターンに従って実装してください。
既存コードも段階的にこのパターンに移行していきます。
