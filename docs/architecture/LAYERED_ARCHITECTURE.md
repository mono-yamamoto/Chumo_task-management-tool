# レイヤードアーキテクチャガイド

このドキュメントは、プロジェクトに導入されたレイヤードアーキテクチャの使用方法を説明します。

## 概要

レイヤードアーキテクチャは、関心の分離を促進し、コードの保守性・テスタビリティ・拡張性を向上させる設計パターンです。

## ディレクトリ構造

```
lib/
├── domain/              # Domain Layer
│   ├── models/         # ドメインモデル (types/から移行予定)
│   └── repositories/   # Repository Interface (抽象)
├── application/         # Application Layer (新規)
│   ├── usecases/       # UseCase (ビジネスロジック)
│   ├── services/       # Application Service
│   └── validators/     # バリデーション
├── infrastructure/      # Infrastructure Layer (既存のfirestore/を移行予定)
│   ├── firestore/
│   │   ├── mappers/
│   │   └── repositories/ # Repository実装 (具象)
│   ├── firebase/
│   └── http/
└── presentation/        # Presentation Layer (新規)
    ├── dtos/           # Data Transfer Objects
    └── mappers/        # DTO ⇔ Domain Model変換
```

## レイヤーの責務

### 1. Presentation Layer (lib/presentation/)

**責務**: ユーザーインターフェースとの橋渡し

- **DTOs** (`lib/presentation/dtos/`): レイヤー間のデータ転送オブジェクト
- **Mappers** (`lib/presentation/mappers/`): DTOとドメインモデル間の変換

**使用例**:
```typescript
import { taskToDTO, dtoToTask } from '@/lib/presentation/mappers/taskMapper';
import { TaskDTO } from '@/lib/presentation/dtos/task.dto';

// Domain Model → DTO
const taskDTO: TaskDTO = taskToDTO(task);

// DTO → Domain Model
const task: Task = dtoToTask(taskDTO);
```

### 2. Application Layer (lib/application/)

**責務**: ビジネスロジックの実装

#### UseCases (`lib/application/usecases/`)

ビジネスロジックをカプセル化する場所。

**使用例: ListTasksUseCase**
```typescript
import { ListTasksUseCase } from '@/lib/application/usecases/listTasks.usecase';

const listTasksUseCase = new ListTasksUseCase();

const result = listTasksUseCase.execute({
  tasks: allTasks,
  filters: {
    status: 'not-completed',
    assigneeIds: [userId],
    title: searchQuery,
  },
  activeTaskId: activeSession?.taskId,
  mountTime: Date.now(),
});

// result.tasks には、フィルタリング・ソート済みのタスクリスト
```

#### Services (`lib/application/services/`)

横断的な機能を提供するサービス。

**使用例: AuthService**
```typescript
import { AuthService } from '@/lib/application/services/authService';

const authService = new AuthService();

// トークンを抽出
const token = authService.extractToken(request.headers.get('authorization'));

// トークンを検証
const authResult = await authService.verifyToken(token);
// authResult.userId でユーザーIDを取得
```

#### Validators (`lib/application/validators/`)

バリデーションロジックを集約。

**使用例: ContactValidator**
```typescript
import { ContactValidator } from '@/lib/application/validators/contactValidator';

const validator = new ContactValidator();
const body = await request.json();

// バリデーション実行
const validationResult = validator.validate(body);

if (!validationResult.isValid) {
  return NextResponse.json(
    { error: validationResult.errors.join(', ') },
    { status: 400 }
  );
}

// 型安全なデータを取得
const contactData = validator.parse(body);
```

### 3. Domain Layer (lib/domain/)

**責務**: ドメインモデルとビジネスルールの定義

- **Models**: エンティティと値オブジェクト (現在は `types/` に存在)
- **Repositories**: リポジトリのインターフェース定義

*現在、既存の `types/` ディレクトリがドメインモデルの役割を果たしています。*

### 4. Infrastructure Layer (lib/firestore/, lib/firebase/)

**責務**: 外部システムとの統合

- **Repositories**: Firestoreへのデータアクセス実装
- **Mappers**: Firestoreドキュメントとドメインモデルの変換

*既存の `lib/firestore/` がインフラストラクチャ層の役割を果たしています。*

## 依存関係のルール

レイヤー間の依存は以下の方向のみ許可されます:

```
Presentation → Application → Domain ← Infrastructure
```

- Presentation層はApplication層に依存できる
- Application層はDomain層に依存できる
- Infrastructure層はDomain層に依存できる
- **逆方向の依存は禁止** (Domain層はApplication層に依存してはならない、など)

## 実装パターン

### パターン1: カスタムフックでUseCaseを使用

**Before** (760行のコンポーネント):
```typescript
// app/(dashboard)/tasks/page.tsx
function TasksPageContent() {
  // 126-207行: フィルタリングロジック
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      // 複雑なフィルタリングロジック...
    });
  }, [tasks, filterStatus, filterAssignee, ...]);

  // 210-235行: ソートロジック
  const sortedTasks = useMemo(() => {
    return [...filteredTasks].sort((a, b) => {
      // 複雑なソートロジック...
    });
  }, [filteredTasks, mountTime]);

  // 残り500行...
}
```

**After** (UseCaseを使用):
```typescript
// hooks/useTasksList.ts
export function useTasksList(params) {
  const listTasksUseCase = new ListTasksUseCase();
  const result = listTasksUseCase.execute(params);
  return result;
}

// app/(dashboard)/tasks/page.tsx
function TasksPageContent() {
  const { sortedTasks, setFilters } = useTasksList({
    tasks: allTasks,
    activeTaskId: activeSession?.taskId,
  });

  // 200行以下に簡潔化
}
```

### パターン2: API RouteでValidator + UseCaseを使用

**Before** (476行のAPI Route):
```typescript
// app/api/contact/route.ts
export async function POST(request: NextRequest) {
  // 19-57行: 認証ロジック
  const authHeader = request.headers.get('authorization');
  // トークン検証...

  // 88-143行: バリデーションロジック
  if (!type || !title) { return NextResponse.json(...); }
  if (type === 'error' && !errorReportDetails) { return NextResponse.json(...); }
  // ...100行以上のバリデーション

  // 237-385行: Firestore書き込みロジック
  // 387-452行: GitHub Issue作成ロジック
}
```

**After** (Validator + UseCase):
```typescript
// app/api/contact/route.ts
export async function POST(request: NextRequest) {
  const authService = new AuthService();
  const validator = new ContactValidator();
  const createContactUseCase = new CreateContactUseCase();

  // 認証
  const token = authService.extractToken(request.headers.get('authorization'));
  if (!token) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
  }

  const authResult = await authService.verifyToken(token);

  // バリデーション
  const body = await request.json();
  const validationResult = validator.validate(body);
  if (!validationResult.isValid) {
    return NextResponse.json(
      { error: validationResult.errors.join(', ') },
      { status: 400 }
    );
  }

  // ビジネスロジック実行
  const contactData = validator.parse(body);
  const result = await createContactUseCase.execute({
    ...contactData,
    userId: authResult.userId,
    userEmail: authResult.email || '',
    userName: 'User Name', // usersコレクションから取得
  });

  return NextResponse.json(result);
}

// 50行以下に簡潔化
```

## 移行ガイドライン

### 既存コードの段階的移行

**Phase 1**: 新規機能で新しいパターンを適用
- 次に追加する機能でUseCase/Validatorパターンを試す
- 効果を検証してから既存コードに適用

**Phase 2**: 複雑なページから順次リファクタリング
1. `app/(dashboard)/tasks/page.tsx` のリファクタリング
2. `app/api/contact/route.ts` のリファクタリング
3. 他のページへ展開

**Phase 3**: テストカバレッジの向上
- UseCase層に単体テストを追加
- ビジネスロジックの品質を保証

### リファクタリングのベストプラクティス

1. **小さく始める**: 1つのファイルから始める
2. **テストを書く**: UseCaseは単体テストが書きやすい
3. **既存の動作を維持**: リファクタリングは動作を変えない
4. **段階的にコミット**: 各ステップごとにコミット

## メリット

### 1. 保守性の向上
- 関心の分離により、各層の責務が明確
- コードの見通しが良くなり、変更箇所が特定しやすい

### 2. テスタビリティの向上
- UseCaseは外部依存が少なく、単体テストが容易
- Validatorは純粋関数に近く、テストが簡単

### 3. 再利用性の向上
- ビジネスロジックが複数の場所で再利用可能
- バリデーションロジックを一元管理

### 4. 拡張性の向上
- 新しい機能追加時、既存コードへの影響が最小限
- レイヤーごとに独立して拡張可能

## サンプルコード

実装済みのサンプルコードは以下を参照してください:

- `lib/application/usecases/listTasks.usecase.ts` - タスク一覧UseCase
- `lib/application/validators/contactValidator.ts` - コンタクトValidator
- `lib/application/services/authService.ts` - 認証Service
- `lib/presentation/dtos/task.dto.ts` - タスクDTO定義
- `lib/presentation/mappers/taskMapper.ts` - DTO変換
- `hooks/useTasksList.ts` - UseCaseを使用したカスタムフック

## 参考資料

- [レイヤードアーキテクチャの基礎](https://zenn.dev/naokky/articles/202512-architecture-layered)
- Clean Architecture by Robert C. Martin
- Domain-Driven Design by Eric Evans
