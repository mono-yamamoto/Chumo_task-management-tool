# lib/ ディレクトリ構造

このディレクトリには、レイヤードアーキテクチャに基づいたビジネスロジックとインフラストラクチャコードが含まれています。

## ディレクトリ構造

```
lib/
├── application/               # Application Layer
│   ├── usecases/             # UseCase (ビジネスロジック)
│   │   ├── listTasks.usecase.ts       # タスク一覧取得UseCase
│   │   └── createContact.usecase.ts   # お問い合わせ作成UseCase
│   ├── services/             # Application Service
│   │   └── authService.ts             # 認証サービス
│   └── validators/           # バリデーション
│       └── contactValidator.ts        # お問い合わせバリデーター
├── presentation/              # Presentation Layer
│   ├── dtos/                 # Data Transfer Objects
│   │   ├── task.dto.ts               # タスクDTO
│   │   └── contact.dto.ts            # お問い合わせDTO
│   └── mappers/              # DTO ⇔ Domain Model変換
│       └── taskMapper.ts             # タスクマッパー
├── infrastructure/            # Infrastructure Layer (既存)
│   └── firestore/
│       ├── mappers/          # Data Mapper
│       └── repositories/     # Repository Implementation
├── firebase/                  # Firebase設定
├── http/                      # HTTP通信
└── queryKeys.ts              # React Query keys
```

## レイヤーの説明

### Application Layer

**責務**: ビジネスロジックの実装と調整

- **UseCases**: 具体的なビジネスロジック（例: タスク一覧取得、お問い合わせ作成）
- **Services**: 複数のUseCaseで共有されるロジック（例: 認証、通知）
- **Validators**: バリデーションロジック

### Presentation Layer

**責務**: ユーザーインターフェースとデータの表示形式を管理

- **DTOs**: レイヤー間のデータ受け渡し定義
- **Mappers**: DTO ⇔ Domain Model変換

### Infrastructure Layer

**責務**: 外部システムとの連携とデータ永続化

- **Repository Implementation**: データアクセスの具象実装
- **Data Mapper**: Firestore ⇔ Domain Model変換

## 使用方法

### UseCase の使用例

```typescript
// カスタムフック内でUseCaseを使用
import { ListTasksUseCase } from '@/lib/application/usecases/listTasks.usecase';

export function useTasksList(params: { tasks: Task[]; activeTaskId?: string }) {
  const useCase = useMemo(() => new ListTasksUseCase(), []);

  const sortedTasks = useMemo(() => {
    return useCase.execute({
      tasks: params.tasks,
      filters: { status: 'not-completed' },
      activeTaskId: params.activeTaskId,
      mountTime: Date.now(),
    });
  }, [params.tasks, params.activeTaskId, useCase]);

  return { sortedTasks };
}
```

### Service + Validator の使用例

```typescript
// API Route内でServiceとValidatorを使用
import { AuthService } from '@/lib/application/services/authService';
import { ContactValidator } from '@/lib/application/validators/contactValidator';

export async function POST(request: NextRequest) {
  const authService = new AuthService();
  const validator = new ContactValidator();

  // 認証
  const token = authService.extractToken(request.headers.get('authorization'));
  const authResult = await authService.verifyToken(token);

  // バリデーション
  const validationResult = validator.validate(await request.json());
  if (!validationResult.isValid) {
    return NextResponse.json({ error: validationResult.errors }, { status: 400 });
  }

  // ビジネスロジック実行
  // ...
}
```

## 詳細ドキュメント

- [レイヤードアーキテクチャ設計書](../docs/architecture/LAYERED_ARCHITECTURE.md)
- [移行ガイド](../docs/architecture/MIGRATION_GUIDE.md)
