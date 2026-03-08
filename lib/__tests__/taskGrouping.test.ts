import { describe, it, expect } from 'vitest';
import { groupTasksByAssignee, UNASSIGNED_ID } from '../taskGrouping';
import { Task, User } from '@/types';

function createTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    projectType: 'REG2017',
    title: 'テストタスク',
    flowStatus: '未着手',
    assigneeIds: [],
    itUpDate: null,
    releaseDate: null,
    kubunLabelId: 'label-1',
    order: 0,
    createdBy: 'user-1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
}

function createUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    email: 'test@example.com',
    displayName: 'テストユーザー',
    role: 'member',
    isAllowed: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('groupTasksByAssignee', () => {
  it('空のタスクリストで空配列を返す', () => {
    const result = groupTasksByAssignee([], []);
    expect(result).toEqual([]);
  });

  it('未割り当てタスクを「未割り当て」セクションにまとめる', () => {
    const tasks = [
      createTask({ id: 'task-1', assigneeIds: [] }),
      createTask({ id: 'task-2', assigneeIds: [] }),
    ];
    const result = groupTasksByAssignee(tasks, []);

    expect(result).toHaveLength(1);
    expect(result[0].assigneeId).toBe(UNASSIGNED_ID);
    expect(result[0].assigneeName).toBe('未割り当て');
    expect(result[0].totalCount).toBe(2);
  });

  it('担当者別にタスクをグルーピングする', () => {
    const users = [
      createUser({ id: 'user-1', displayName: 'Alice' }),
      createUser({ id: 'user-2', displayName: 'Bob' }),
    ];
    const tasks = [
      createTask({ id: 'task-1', assigneeIds: ['user-1'] }),
      createTask({ id: 'task-2', assigneeIds: ['user-2'] }),
      createTask({ id: 'task-3', assigneeIds: ['user-1'] }),
    ];

    const result = groupTasksByAssignee(tasks, users);
    expect(result).toHaveLength(2);

    const alice = result.find((s) => s.assigneeId === 'user-1');
    const bob = result.find((s) => s.assigneeId === 'user-2');

    expect(alice?.assigneeName).toBe('Alice');
    expect(alice?.totalCount).toBe(2);
    expect(bob?.assigneeName).toBe('Bob');
    expect(bob?.totalCount).toBe(1);
  });

  it('複数担当者のタスクは各セクションに重複して表示される', () => {
    const users = [
      createUser({ id: 'user-1', displayName: 'Alice' }),
      createUser({ id: 'user-2', displayName: 'Bob' }),
    ];
    const tasks = [createTask({ id: 'task-1', assigneeIds: ['user-1', 'user-2'] })];

    const result = groupTasksByAssignee(tasks, users);
    expect(result).toHaveLength(2);
    expect(result[0].totalCount).toBe(1);
    expect(result[1].totalCount).toBe(1);
  });

  it('ステータス別にグルーピングされる', () => {
    const users = [createUser({ id: 'user-1', displayName: 'Alice' })];
    const tasks = [
      createTask({ id: 'task-1', assigneeIds: ['user-1'], flowStatus: '対応中' }),
      createTask({ id: 'task-2', assigneeIds: ['user-1'], flowStatus: '未着手' }),
      createTask({ id: 'task-3', assigneeIds: ['user-1'], flowStatus: '対応中' }),
    ];

    const result = groupTasksByAssignee(tasks, users);
    expect(result).toHaveLength(1);

    const statusGroups = result[0].statusGroups;
    expect(statusGroups).toHaveLength(2);
    // 対応中が未着手より先に来る（STATUS_ORDERの順序）
    expect(statusGroups[0].status).toBe('対応中');
    expect(statusGroups[0].tasks).toHaveLength(2);
    expect(statusGroups[1].status).toBe('未着手');
    expect(statusGroups[1].tasks).toHaveLength(1);
  });

  it('担当者名でソートされる（未割り当ては最後）', () => {
    const users = [
      createUser({ id: 'user-1', displayName: 'Charlie' }),
      createUser({ id: 'user-2', displayName: 'Alice' }),
    ];
    const tasks = [
      createTask({ id: 'task-1', assigneeIds: ['user-1'] }),
      createTask({ id: 'task-2', assigneeIds: ['user-2'] }),
      createTask({ id: 'task-3', assigneeIds: [] }),
    ];

    const result = groupTasksByAssignee(tasks, users);
    expect(result).toHaveLength(3);
    expect(result[0].assigneeName).toBe('Alice');
    expect(result[1].assigneeName).toBe('Charlie');
    expect(result[2].assigneeId).toBe(UNASSIGNED_ID);
  });

  it('不明なユーザーIDの場合「不明なユーザー」と表示される', () => {
    const tasks = [createTask({ id: 'task-1', assigneeIds: ['unknown-user'] })];
    const result = groupTasksByAssignee(tasks, []);

    expect(result).toHaveLength(1);
    expect(result[0].assigneeName).toBe('不明なユーザー');
  });

  it('usersがundefinedでも動作する', () => {
    const tasks = [createTask({ id: 'task-1', assigneeIds: ['user-1'] })];
    const result = groupTasksByAssignee(tasks, undefined);

    expect(result).toHaveLength(1);
    expect(result[0].assigneeName).toBe('不明なユーザー');
  });
});
