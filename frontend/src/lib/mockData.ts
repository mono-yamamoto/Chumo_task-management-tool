import type { Task, User, Label, TaskSession } from '../types';

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

/** ユーザーIDからユーザーを検索するヘルパー */
export function getUserById(userId: string): User | undefined {
  return MOCK_USERS.find((u) => u.id === userId);
}

/** ラベルIDからラベルを検索するヘルパー */
export function getLabelById(labelId: string): Label | undefined {
  return MOCK_LABELS.find((l) => l.id === labelId);
}

/** 現在のユーザーのタスク（マイタスク）を取得 */
export function getMyTasks(): Task[] {
  return MOCK_TASKS.filter((t) => t.assigneeIds.includes(MOCK_CURRENT_USER.id));
}
