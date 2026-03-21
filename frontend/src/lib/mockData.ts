import type { Task, User, Label, TaskSession, ReportEntry, Contact } from '../types';

// ダミーユーザー
export const MOCK_USERS: User[] = [
  {
    id: 'user-1',
    email: 'tanaka@example.com',
    displayName: '田中太郎',
    role: 'admin',
    isAllowed: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: 'user-2',
    email: 'sato@example.com',
    displayName: '佐藤花子',
    role: 'member',
    isAllowed: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: 'user-3',
    email: 'suzuki@example.com',
    displayName: '鈴木一郎',
    role: 'member',
    isAllowed: true,
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date('2024-02-01'),
  },
  {
    id: 'user-4',
    email: 'takahashi@example.com',
    displayName: '高橋美咲',
    role: 'member',
    isAllowed: true,
    createdAt: new Date('2024-03-01'),
    updatedAt: new Date('2024-03-01'),
  },
  {
    id: 'user-5',
    email: 'ito@example.com',
    displayName: '伊藤健太',
    role: 'member',
    isAllowed: true,
    createdAt: new Date('2024-03-01'),
    updatedAt: new Date('2024-03-01'),
  },
  {
    id: 'user-6',
    email: 'watanabe@example.com',
    displayName: '渡辺雄大',
    role: 'member',
    isAllowed: true,
    createdAt: new Date('2024-04-01'),
    updatedAt: new Date('2024-04-01'),
  },
];

// ダミー区分ラベル
export const MOCK_LABELS: Label[] = [
  {
    id: 'label-kobetsu',
    name: '個別',
    color: '#6b7280',
    projectId: null,
    ownerId: 'user-1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: 'label-unyo',
    name: '運用',
    color: '#6b7280',
    projectId: null,
    ownerId: 'user-1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
];

// 現在ログイン中のユーザー（モック）
export const MOCK_CURRENT_USER = MOCK_USERS[0]!;

const today = new Date();
const daysFromNow = (days: number) => {
  const d = new Date(today);
  d.setDate(d.getDate() + days);
  return d;
};

// ダミータスク — 各FlowStatus × 各背景色パターン網羅
export const MOCK_TASKS: Task[] = [
  // ===== 期限超過（error）=====
  {
    id: 'task-1',
    projectType: 'REG2017',
    title: 'REG2017-2266【飯田】火災_SEO記事コンテンツ（リライト）',
    flowStatus: 'ディレクション',
    progressStatus: '待ち',
    assigneeIds: ['user-1', 'user-2', 'user-3'],
    itUpDate: daysFromNow(-3),
    releaseDate: daysFromNow(-1),
    kubunLabelId: 'label-unyo',
    order: 1,
    createdBy: 'user-1',
    createdAt: new Date('2025-12-01'),
    updatedAt: new Date('2026-01-15'),
  },
  {
    id: 'task-2',
    projectType: 'REG2017',
    title: 'REG2017-2301【佐藤】火災_LP改修（A/Bテスト対応）',
    flowStatus: 'コーディング',
    progressStatus: 'コーディング',
    assigneeIds: ['user-2'],
    itUpDate: daysFromNow(-1),
    releaseDate: daysFromNow(5),
    kubunLabelId: 'label-kobetsu',
    order: 2,
    createdBy: 'user-2',
    createdAt: new Date('2025-12-10'),
    updatedAt: new Date('2026-01-20'),
  },
  // ===== 期限間近（warning）=====
  {
    id: 'task-3',
    projectType: 'BRGREG',
    title: 'BRGREG-450【田中】地震_見積書フォーム改修',
    flowStatus: 'ディレクション',
    progressStatus: '仕様確認',
    assigneeIds: ['user-1', 'user-4'],
    itUpDate: daysFromNow(3),
    releaseDate: daysFromNow(7),
    kubunLabelId: 'label-kobetsu',
    order: 3,
    createdBy: 'user-1',
    createdAt: new Date('2025-12-15'),
    updatedAt: new Date('2026-01-25'),
  },
  {
    id: 'task-4',
    projectType: 'MONO',
    title: 'MONO-431 火災保険追いつきメール対応',
    flowStatus: 'コーディング',
    progressStatus: 'CO',
    assigneeIds: ['user-1', 'user-3'],
    itUpDate: daysFromNow(5),
    releaseDate: daysFromNow(10),
    kubunLabelId: 'label-unyo',
    order: 4,
    createdBy: 'user-3',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-02-01'),
  },
  // ===== 通常 =====
  {
    id: 'task-5',
    projectType: 'REG2017',
    title: 'REG2017-2290【鈴木】火災_マイページリニューアル',
    flowStatus: '未着手',
    progressStatus: '未着手',
    assigneeIds: ['user-1'],
    itUpDate: daysFromNow(20),
    releaseDate: daysFromNow(25),
    kubunLabelId: 'label-kobetsu',
    order: 5,
    createdBy: 'user-3',
    createdAt: new Date('2026-01-10'),
    updatedAt: new Date('2026-02-01'),
  },
  {
    id: 'task-6',
    projectType: 'BRGREG',
    title: 'BRGREG-462【高橋】地震_デザインシステム更新',
    flowStatus: 'デザイン',
    progressStatus: 'デザイン',
    assigneeIds: ['user-1', 'user-4', 'user-5'],
    itUpDate: daysFromNow(14),
    releaseDate: daysFromNow(21),
    kubunLabelId: 'label-kobetsu',
    order: 6,
    createdBy: 'user-4',
    createdAt: new Date('2026-01-20'),
    updatedAt: new Date('2026-02-05'),
  },
  {
    id: 'task-7',
    projectType: 'MONO',
    title: 'MONO-445 管理画面ダッシュボード改善',
    flowStatus: '待ち',
    progressStatus: '調査',
    assigneeIds: ['user-1', 'user-2'],
    itUpDate: null,
    releaseDate: null,
    kubunLabelId: 'label-unyo',
    order: 7,
    createdBy: 'user-1',
    createdAt: new Date('2026-01-25'),
    updatedAt: new Date('2026-02-10'),
  },
  // ===== 完了段階の進捗（背景色適用外）=====
  {
    id: 'task-8',
    projectType: 'REG2017',
    title: 'REG2017-2250【伊藤】火災_お問い合わせフォーム修正',
    flowStatus: 'コーディング',
    progressStatus: 'IT連絡済み',
    assigneeIds: ['user-1', 'user-5'],
    itUpDate: daysFromNow(-5), // 超過しているが進捗が完了段階なのでnormal
    releaseDate: daysFromNow(2),
    kubunLabelId: 'label-kobetsu',
    order: 8,
    createdBy: 'user-5',
    createdAt: new Date('2025-11-15'),
    updatedAt: new Date('2026-02-01'),
  },
  // ===== 完了タスク =====
  {
    id: 'task-9',
    projectType: 'REG2017',
    title: 'REG2017-2200【渡辺】火災_年末年始バナー対応',
    flowStatus: '完了',
    progressStatus: 'SENJU登録',
    assigneeIds: ['user-1', 'user-6'],
    itUpDate: daysFromNow(-10),
    releaseDate: daysFromNow(-7),
    kubunLabelId: 'label-unyo',
    order: 9,
    createdBy: 'user-6',
    createdAt: new Date('2025-11-01'),
    updatedAt: new Date('2026-01-05'),
    completedAt: new Date('2026-01-05'),
  },
  // ===== 追加タスク（ディレクション・待ちバリエーション）=====
  {
    id: 'task-10',
    projectType: 'DMREG2',
    title: 'DMREG2-180【田中】ダイレクトメール配信基盤構築',
    flowStatus: 'ディレクション',
    progressStatus: '見積',
    assigneeIds: ['user-1'],
    itUpDate: daysFromNow(30),
    releaseDate: null,
    kubunLabelId: 'label-kobetsu',
    order: 10,
    createdBy: 'user-1',
    createdAt: new Date('2026-02-01'),
    updatedAt: new Date('2026-02-15'),
  },
  {
    id: 'task-11',
    projectType: 'PRREG',
    title: 'PRREG-092【佐藤】PR_キャンペーンページ制作',
    flowStatus: '待ち',
    progressStatus: '待ち',
    assigneeIds: ['user-1', 'user-2', 'user-4', 'user-5', 'user-6', 'user-3'],
    itUpDate: daysFromNow(10),
    releaseDate: daysFromNow(15),
    kubunLabelId: 'label-unyo',
    order: 11,
    createdBy: 'user-2',
    createdAt: new Date('2026-02-05'),
    updatedAt: new Date('2026-02-20'),
  },
  {
    id: 'task-12',
    projectType: 'DES_FIRE',
    title: 'DES_FIRE-033【鈴木】デザインシステムコンポーネント追加',
    flowStatus: 'デザイン',
    progressStatus: 'デザイン',
    assigneeIds: ['user-1', 'user-3'],
    itUpDate: daysFromNow(6),
    releaseDate: daysFromNow(12),
    kubunLabelId: 'label-kobetsu',
    order: 12,
    createdBy: 'user-3',
    createdAt: new Date('2026-02-10'),
    updatedAt: new Date('2026-02-25'),
  },
  // ===== タスク一覧専用（ダッシュボードには出ない）=====
  // 未アサイン＋作成3日前 → info 対象
  {
    id: 'task-13',
    projectType: 'REG2017',
    title: 'REG2017-2310【未アサイン】火災_新規LP制作依頼',
    flowStatus: '未着手',
    progressStatus: '未着手',
    assigneeIds: [],
    itUpDate: daysFromNow(14),
    releaseDate: daysFromNow(21),
    kubunLabelId: 'label-kobetsu',
    order: 13,
    createdBy: 'user-2',
    createdAt: daysFromNow(-3),
    updatedAt: daysFromNow(-3),
  },
  // 未アサイン＋作成1日前 → info 対象
  {
    id: 'task-14',
    projectType: 'BRGREG',
    title: 'BRGREG-470【未アサイン】地震_緊急メンテナンスページ作成',
    flowStatus: '未着手',
    progressStatus: null,
    assigneeIds: [],
    itUpDate: null,
    releaseDate: null,
    kubunLabelId: 'label-unyo',
    order: 14,
    createdBy: 'user-3',
    createdAt: daysFromNow(-1),
    updatedAt: daysFromNow(-1),
  },
  // 他ユーザーのみアサイン（currentUser含まない）→ ダッシュボードには出ない
  {
    id: 'task-15',
    projectType: 'MONO',
    title: 'MONO-460 管理画面レポート出力バッチ改修',
    flowStatus: 'コーディング',
    progressStatus: 'コーディング',
    assigneeIds: ['user-3', 'user-4'],
    itUpDate: daysFromNow(8),
    releaseDate: daysFromNow(12),
    kubunLabelId: 'label-kobetsu',
    order: 15,
    createdBy: 'user-3',
    createdAt: new Date('2026-02-20'),
    updatedAt: new Date('2026-03-01'),
  },
];

// ダミーセッション
export const MOCK_SESSIONS: TaskSession[] = [
  {
    id: 'session-1',
    taskId: 'task-1',
    userId: 'user-1',
    startedAt: new Date('2026-02-13T14:00:00'),
    endedAt: new Date('2026-02-13T14:39:53'),
    durationSec: 2393,
  },
  {
    id: 'session-2',
    taskId: 'task-1',
    userId: 'user-2',
    startedAt: new Date('2026-02-12T10:00:00'),
    endedAt: new Date('2026-02-12T11:25:00'),
    durationSec: 5100,
  },
  {
    id: 'session-3',
    taskId: 'task-2',
    userId: 'user-2',
    startedAt: new Date('2026-02-11T09:30:00'),
    endedAt: new Date('2026-02-11T11:40:00'),
    durationSec: 7800,
  },
];

// ダミーレポートデータ（2026年1月分）
export const MOCK_REPORT_ENTRIES: ReportEntry[] = [
  {
    id: 'report-1',
    taskId: 'task-1',
    title: 'REG2017-2263 【伊藤】火災保険_FAQ 2件修正',
    type: 'normal',
    totalDurationSec: 9258, // 2時間34分18秒
    sessions: [
      {
        id: 'rs-1',
        taskId: 'task-1',
        userId: 'user-5',
        startedAt: new Date('2026-01-15T09:12:30'),
        endedAt: new Date('2026-01-15T11:46:48'),
        durationSec: 9258,
      },
    ],
    date: new Date('2026-01-15'),
  },
  {
    id: 'report-2',
    taskId: 'task-2',
    title: 'REG2017-2264 【伊藤】GOOD DRIVE 契約者のキャッシュバック率_数値更新',
    type: 'normal',
    totalDurationSec: 5437, // 1時間30分37秒
    sessions: [
      {
        id: 'rs-2',
        taskId: 'task-2',
        userId: 'user-5',
        startedAt: new Date('2026-01-16T10:00:00'),
        endedAt: new Date('2026-01-16T11:30:37'),
        durationSec: 5437,
      },
    ],
    date: new Date('2026-01-16'),
  },
  {
    id: 'report-3',
    taskId: 'task-3',
    title: 'REG2017-2251 【伊藤】総合トップ_コエキチ数値更新（FY25_2Q）',
    type: 'normal',
    totalDurationSec: 387, // 6分27秒
    sessions: [
      {
        id: 'rs-3',
        taskId: 'task-3',
        userId: 'user-5',
        startedAt: new Date('2026-01-17T14:00:00'),
        endedAt: new Date('2026-01-17T14:06:27'),
        durationSec: 387,
      },
    ],
    date: new Date('2026-01-17'),
  },
  {
    id: 'report-4',
    taskId: 'task-4',
    title: 'REG2017-2257 【伊藤】火災「一緒に見積サポート」FAQの作成依頼',
    type: 'normal',
    totalDurationSec: 14669, // 4時間4分29秒
    sessions: [
      {
        id: 'rs-4a',
        taskId: 'task-4',
        userId: 'user-5',
        startedAt: new Date('2026-01-20T09:00:00'),
        endedAt: new Date('2026-01-20T11:30:00'),
        durationSec: 9000,
      },
      {
        id: 'rs-4b',
        taskId: 'task-4',
        userId: 'user-5',
        startedAt: new Date('2026-01-20T13:00:00'),
        endedAt: new Date('2026-01-20T14:34:29'),
        durationSec: 5669,
      },
    ],
    date: new Date('2026-01-20'),
  },
  {
    id: 'report-5',
    taskId: 'task-5',
    title: 'REG2017-2266 【飯田】火災_SEO記事コンテンツ（新規2本）',
    type: 'normal',
    totalDurationSec: 32679, // 9時間4分39秒
    sessions: [
      {
        id: 'rs-5',
        taskId: 'task-5',
        userId: 'user-3',
        startedAt: new Date('2026-01-21T09:00:00'),
        endedAt: new Date('2026-01-21T18:04:39'),
        durationSec: 32679,
      },
    ],
    date: new Date('2026-01-21'),
  },
  {
    id: 'report-6',
    taskId: 'task-6',
    title: 'REG2017-2252 【梅村】等級訂正ガイドページの制作',
    type: 'normal',
    totalDurationSec: 21792, // 6時間3分12秒
    over3Reason: 'デザインしながらコーディングしたため',
    sessions: [
      {
        id: 'rs-6',
        taskId: 'task-6',
        userId: 'user-4',
        startedAt: new Date('2026-01-22T09:12:30'),
        endedAt: new Date('2026-01-22T15:15:42'),
        durationSec: 21792,
      },
    ],
    date: new Date('2026-01-22'),
  },
  {
    id: 'report-7',
    taskId: 'task-7',
    title: 'REG2017-2267 【加倉井】sオブジェクト削除_後続',
    type: 'normal',
    totalDurationSec: 4525, // 1時間15分25秒
    sessions: [
      {
        id: 'rs-7',
        taskId: 'task-7',
        userId: 'user-6',
        startedAt: new Date('2026-01-23T10:00:00'),
        endedAt: new Date('2026-01-23T11:15:25'),
        durationSec: 4525,
      },
    ],
    date: new Date('2026-01-23'),
  },
  {
    id: 'report-8',
    taskId: 'task-8',
    title: 'REG2017-2269 【加倉井】SFGLキャンペーンバナー第3弾切替',
    type: 'normal',
    totalDurationSec: 6112, // 1時間41分52秒
    sessions: [
      {
        id: 'rs-8',
        taskId: 'task-8',
        userId: 'user-6',
        startedAt: new Date('2026-01-24T13:00:00'),
        endedAt: new Date('2026-01-24T14:41:52'),
        durationSec: 6112,
      },
    ],
    date: new Date('2026-01-24'),
  },
];

// ダミーお問い合わせデータ
export const MOCK_CONTACTS: Contact[] = [
  {
    id: 'contact-1',
    type: 'error',
    title: 'ダッシュボードの読み込みが完了しない',
    content:
      'ダッシュボードを開いた後、しばらくローディングが表示に留まり、データの表示がされません。コンソールにエラーが表示されます。',
    userId: 'user-2',
    userName: '佐藤花子',
    userEmail: 'sato@example.com',
    errorReportDetails: {
      issue:
        'ダッシュボードを開いた後、しばらくローディングが表示に留まり、データの表示がされません。',
      reproductionSteps:
        '1. ログイン後ダッシュボードに遷移\n2. 10秒以上待機\n3. データが表示されずスピナーが回り続ける',
      environment: {
        device: 'PC',
        os: 'Mac',
        browser: 'Chrome',
        browserVersion: '120.0.6099.71',
      },
    },
    status: 'pending',
    createdAt: new Date('2026-03-15T10:30:00'),
    updatedAt: new Date('2026-03-15T10:30:00'),
  },
  {
    id: 'contact-2',
    type: 'feature',
    title: 'タスクの一括更新機能がほしい',
    content:
      '複数のタスクを選択してステータスやアサイン先を一括で更新できる機能があると、月末の棚卸し作業が大幅に効率化されます。',
    userId: 'user-3',
    userName: '鈴木一郎',
    userEmail: 'suzuki@example.com',
    status: 'pending',
    createdAt: new Date('2026-03-14T15:00:00'),
    updatedAt: new Date('2026-03-14T15:00:00'),
  },
  {
    id: 'contact-3',
    type: 'other',
    title: '操作マニュアルの更新依頼',
    content:
      '先月のUIリニューアル後について、操作マニュアルに記載がない機能も見つけたのでお問い合わせしたいです。',
    userId: 'user-4',
    userName: '高橋美咲',
    userEmail: 'takahashi@example.com',
    status: 'pending',
    createdAt: new Date('2026-03-12T09:15:00'),
    updatedAt: new Date('2026-03-12T09:15:00'),
  },
  {
    id: 'contact-4',
    type: 'error',
    title: 'レポートCSV出力で文字化けが発生',
    content: 'レポートをCSVエクスポートした際、Excel で開くと日本語が文字化けします。',
    userId: 'user-5',
    userName: '伊藤健太',
    userEmail: 'ito@example.com',
    errorReportDetails: {
      issue: 'レポートのCSVエクスポートでExcel展開時に日本語文字化け',
      reproductionSteps:
        '1. レポートページで期間を設定\n2. CSVエクスポートをクリック\n3. Excelで開く',
      environment: {
        device: 'PC',
        os: 'Windows',
        browser: 'Chrome',
        browserVersion: '120.0.6099.71',
      },
    },
    status: 'resolved',
    createdAt: new Date('2026-03-10T11:00:00'),
    updatedAt: new Date('2026-03-11T14:00:00'),
  },
  {
    id: 'contact-5',
    type: 'feature',
    title: 'ダークモード対応の要望',
    content: '長時間作業していると目が疲れるので、ダークモードに対応してほしいです。',
    userId: 'user-6',
    userName: '渡辺雄大',
    userEmail: 'watanabe@example.com',
    status: 'resolved',
    createdAt: new Date('2026-03-05T16:30:00'),
    updatedAt: new Date('2026-03-08T10:00:00'),
  },
];

/** ステータスでフィルタしたお問い合わせを取得 */
export function getContactsByStatus(status: 'pending' | 'resolved'): Contact[] {
  return MOCK_CONTACTS.filter((c) => c.status === status);
}

/** 全お問い合わせを取得 */
export function getAllContacts(): Contact[] {
  return MOCK_CONTACTS;
}

/** ユーザーIDからユーザーを検索するヘルパー */
export function getUserById(userId: string): User | undefined {
  return MOCK_USERS.find((u) => u.id === userId);
}

/** ラベルIDからラベルを検索するヘルパー */
export function getLabelById(labelId: string): Label | undefined {
  return MOCK_LABELS.find((l) => l.id === labelId);
}

/** アサイニーIDの配列からUserの配列を解決する */
export function resolveAssignees(assigneeIds: string[]): User[] {
  return assigneeIds
    .map((id) => getUserById(id))
    .filter((u): u is NonNullable<typeof u> => u != null);
}

/** 現在のユーザーのタスク（マイタスク）を取得 */
export function getMyTasks(): Task[] {
  return MOCK_TASKS.filter((t) => t.assigneeIds.includes(MOCK_CURRENT_USER.id));
}

/** 全タスクを取得（タスク一覧ページ用） */
export function getAllTasks(): Task[] {
  return MOCK_TASKS;
}

/** レポートエントリを取得 */
export function getReportEntries(type?: 'normal' | 'brg'): ReportEntry[] {
  if (!type) return MOCK_REPORT_ENTRIES;
  return MOCK_REPORT_ENTRIES.filter((r) => r.type === type);
}
