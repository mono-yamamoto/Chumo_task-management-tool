# レイヤードアーキテクチャ設計書

このドキュメントでは、プロジェクトで採用しているレイヤードアーキテクチャの設計を説明します。

## 目次

1. [概要](#概要)
2. [ディレクトリ構造](#ディレクトリ構造)
3. [各レイヤーの責務](#各レイヤーの責務)
4. [実装パターン](#実装パターン)
5. [使用例](#使用例)
6. [段階的移行ガイド](#段階的移行ガイド)

**関連ドキュメント**: 既存コードの移行手順については [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) を参照してください。

## 概要

レイヤードアーキテクチャは、関心の分離を実現し、保守性・テスタビリティ・拡張性を向上させるアーキテクチャパターンです。

### アーキテクチャの利点

- **保守性向上**: 各レイヤーの責務が明確で、変更の影響範囲が限定される
- **テスタビリティ向上**: ビジネスロジックがApplication Layerに集約され、単体テストが容易
- **拡張性向上**: インターフェースを介した疎結合により、実装の差し替えが容易
- **可読性向上**: コードの見通しが良く、新規メンバーのオンボーディングが容易

### レイヤー構成

```plaintext
┌─────────────────────────────────────────┐
│       Presentation Layer (UI)           │  ← ページ、コンポーネント
│  - DTOs (Data Transfer Objects)         │
│  - Mappers (DTO ⇔ Domain Model)         │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│      Application Layer (UseCase)        │  ← ビジネスロジック
│  - UseCases (ビジネスロジック)          │
│  - Services (共通サービス)              │
│  - Validators (バリデーション)          │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│         Domain Layer (Core)             │  ← ドメインモデル
│  - Models (エンティティ)                │
│  - Repository Interfaces (抽象)         │
└─────────────────────────────────────────┘
                  ↑
┌─────────────────────────────────────────┐
│    Infrastructure Layer (Data)          │  ← データアクセス
│  - Repository Implementations (具象)    │
│  - Mappers (Firestore ⇔ Domain Model)   │
│  - External APIs                        │
└─────────────────────────────────────────┘
```

## ディレクトリ構造

```plaintext
lib/
├── domain/                    # Domain Layer
│   ├── models/               # ドメインモデル (将来types/から移行)
│   └── repositories/         # Repository Interface (抽象)
├── application/               # Application Layer
│   ├── usecases/             # UseCase (ビジネスロジック)
│   │   ├── listTasks.usecase.ts
│   │   └── createContact.usecase.ts
│   ├── services/             # Application Service
│   │   └── authService.ts
│   └── validators/           # バリデーション
│       └── contactValidator.ts
├── infrastructure/            # Infrastructure Layer (既存)
│   └── firestore/
│       ├── mappers/          # Data Mapper
│       └── repositories/     # Repository Implementation
└── presentation/              # Presentation Layer
    ├── dtos/                 # Data Transfer Objects
    │   ├── task.dto.ts
    │   └── contact.dto.ts
    └── mappers/              # DTO ⇔ Domain Model変換
        └── taskMapper.ts
```

## 各レイヤーの責務

### 1. Presentation Layer (プレゼンテーション層)

**責務**: ユーザーインターフェースとデータの表示形式を管理

**含まれるもの**:
- ページコンポーネント (`app/`)
- UIコンポーネント (`components/`)
- DTOs (Data Transfer Objects)
- カスタムフック (`hooks/`)

**ルール**:
- ビジネスロジックを含まない
- UseCaseやServiceを呼び出してデータを取得・更新
- DTOを使用してデータを受け渡し

### 2. Application Layer (アプリケーション層)

**責務**: ビジネスロジックの実装と調整

**含まれるもの**:
- **UseCases**: 具体的なビジネスロジック（例: タスク一覧取得、お問い合わせ作成）
- **Services**: 複数のUseCaseで共有されるロジック（例: 認証、通知）
- **Validators**: バリデーションロジック

**ルール**:
- ドメインモデルを使用してビジネスロジックを実装
- インフラ層の詳細には依存しない（Repositoryインターフェースに依存）
- プレゼンテーション層の詳細には依存しない

### 3. Domain Layer (ドメイン層)

**責務**: ビジネスの核心的な概念とルールを定義

**含まれるもの**:
- エンティティ (`types/` から将来的に移行)
- Repository Interface（抽象）

**ルール**:
- 他のレイヤーに依存しない
- ビジネスルールとドメイン知識を表現

### 4. Infrastructure Layer (インフラストラクチャ層)

**責務**: 外部システムとの連携とデータ永続化

**含まれるもの**:
- Repository Implementation（具象）
- Data Mapper (Firestore ⇔ Domain Model)
- 外部API連携
- Firebase設定

**ルール**:
- Domain LayerのRepositoryインターフェースを実装
- データベースや外部APIの詳細を隠蔽

## 実装パターン

### Pattern 1: UseCase の実装

```typescript
// lib/application/usecases/listTasks.usecase.ts
export class ListTasksUseCase {
  execute(params: {
    tasks: Task[];
    filters: TaskFiltersDTO;
  }): Task[] {
    // ビジネスロジックをここに実装
    let filtered = this.applyFilters(params.tasks, params.filters);
    let sorted = this.applySorting(filtered);
    return sorted;
  }

  private applyFilters(tasks: Task[], filters: TaskFiltersDTO): Task[] {
    // フィルタリングロジック
  }

  private applySorting(tasks: Task[]): Task[] {
    // ソートロジック
  }
}
```

### Pattern 2: Service の実装

```typescript
// lib/application/services/authService.ts
export class AuthService {
  async verifyToken(token: string): Promise<AuthResult> {
    // 認証ロジック
  }

  extractToken(authHeader: string): string | null {
    // トークン抽出ロジック
  }
}
```

### Pattern 3: Validator の実装

```typescript
// lib/application/validators/contactValidator.ts
export class ContactValidator {
  validate(data: unknown): ValidationResult {
    const errors: string[] = [];

    // バリデーションロジック
    if (!data.title) {
      errors.push('タイトルを入力してください');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}
```

## 使用例

### 例1: カスタムフックでUseCaseを使用

```typescript
// hooks/useTasksList.ts
import { ListTasksUseCase } from '@/lib/application/usecases/listTasks.usecase';

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

```typescript
// app/(dashboard)/tasks/page.tsx
function TasksPage() {
  const tasksQuery = useTasks(selectedProjectType);
  const tasks = tasksQuery.data?.pages.flatMap((page) => page.tasks) || [];

  // UseCaseを使用したフィルタリング・ソート
  const { sortedTasks, filters, setFilters } = useTasksList({
    tasks,
    activeTaskId: activeSession?.taskId,
  });

  // フィルター変更
  const handleFilterChange = (newFilters: TaskFiltersDTO) => {
    setFilters(newFilters);
  };

  return <TaskListTable tasks={sortedTasks} />;
}
```

### 例2: API RouteでValidator + Serviceを使用

**Before (476行)**:
```typescript
// app/api/contact/route.ts
export async function POST(request: NextRequest) {
  // 認証ロジック (50行)
  // バリデーションロジック (100行)
  // データ永続化ロジック (200行)
  // 外部API呼び出しロジック (100行)
}
```

**After (50行以下)**:
```typescript
// app/api/contact/route.ts
import { AuthService } from '@/lib/application/services/authService';
import { ContactValidator } from '@/lib/application/validators/contactValidator';

export async function POST(request: NextRequest) {
  const authService = new AuthService();
  const validator = new ContactValidator();

  // 認証
  const token = authService.extractToken(request.headers.get('authorization'));
  const authResult = await authService.verifyToken(token);
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: 401 });
  }

  // バリデーション
  const data = await request.json();
  const validationResult = validator.validate(data);
  if (!validationResult.isValid) {
    return NextResponse.json(
      { error: validationResult.errors.join(', ') },
      { status: 400 }
    );
  }

  // ビジネスロジック実行
  // ...
}
```

## 段階的移行ガイド

### Phase 1: 新規機能で新しいパターンを適用 ✅

**完了**: 基盤構造を実装済み
- Application Layer (UseCases, Services, Validators)
- Presentation Layer (DTOs, Mappers)
- 使用例 (useTasksList)

**次のステップ**: 新しい機能追加時に新しいパターンを使用

### Phase 2: 既存コードのリファクタリング (今後)

#### 優先度1: `app/(dashboard)/tasks/page.tsx` (760行)

**リファクタリング内容**:
1. フィルタリングロジックを `ListTasksUseCase` に移行
2. `useTasksList` フックを使用
3. ページコンポーネントを200行以下に削減

**期待効果**:
- 560行削減
- ビジネスロジックの再利用可能化
- 単体テストの追加が容易

#### 優先度2: `app/api/contact/route.ts` (476行)

**リファクタリング内容**:
1. 認証ロジックを `AuthService` に移行
2. バリデーションロジックを `ContactValidator` に移行
3. お問い合わせ作成ロジックを `CreateContactUseCase` に移行
4. API Routeを50行以下に削減

**期待効果**:
- 426行削減
- ロジックの再利用可能化
- バリデーションの一元管理

### Phase 3: テストカバレッジの向上 (今後)

- UseCase層に単体テストを追加
- Validator層に単体テストを追加
- ビジネスロジックの品質を保証

## まとめ

このアーキテクチャにより、以下を実現します:

1. **関心の分離**: 各レイヤーが明確な責務を持つ
2. **保守性**: 変更の影響範囲が限定され、保守が容易
3. **テスタビリティ**: ビジネスロジックの単体テストが容易
4. **拡張性**: 新機能追加が既存コードに影響を与えにくい

新しい機能を追加する際は、このパターンに従って実装してください。
既存コードも段階的にこのパターンに移行していきます。
