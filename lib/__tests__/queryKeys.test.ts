import { describe, it, expect } from 'vitest';
import { queryKeys } from '../queryKeys';

describe('queryKeys', () => {
  it('tasks: プロジェクトタイプを含むキーを生成する', () => {
    expect(queryKeys.tasks('REG2017')).toEqual(['tasks', 'REG2017']);
    expect(queryKeys.tasks('all')).toEqual(['tasks', 'all']);
  });

  it('task: タスクIDを含むキーを生成する', () => {
    expect(queryKeys.task('task-123')).toEqual(['task', 'task-123']);
  });

  it('taskSessions: タスクIDを含むキーを生成する', () => {
    expect(queryKeys.taskSessions('task-123')).toEqual(['taskSessions', 'task-123']);
  });

  it('activeSession: userId/taskIdがnull/undefinedの場合nullになる', () => {
    expect(queryKeys.activeSession('user-1', 'task-1')).toEqual([
      'activeSession',
      'user-1',
      'task-1',
    ]);
    expect(queryKeys.activeSession(null, null)).toEqual(['activeSession', null, null]);
    expect(queryKeys.activeSession(undefined, undefined)).toEqual(['activeSession', null, null]);
  });

  it('contacts: ステータスを含むキーを生成する', () => {
    expect(queryKeys.contacts('pending')).toEqual(['contacts', 'pending']);
    expect(queryKeys.contacts('resolved')).toEqual(['contacts', 'resolved']);
  });

  it('dashboardTasks: userIdがnull/undefinedの場合nullになる', () => {
    expect(queryKeys.dashboardTasks('user-1')).toEqual(['dashboard-tasks', 'user-1']);
    expect(queryKeys.dashboardTasks(null)).toEqual(['dashboard-tasks', null]);
    expect(queryKeys.dashboardTasks(undefined)).toEqual(['dashboard-tasks', null]);
  });

  it('taskComments: タスクIDを含むキーを生成する', () => {
    expect(queryKeys.taskComments('task-123')).toEqual(['taskComments', 'task-123']);
  });

  it('unreadComments: userIdがnull/undefinedの場合nullになる', () => {
    expect(queryKeys.unreadComments('user-1')).toEqual(['unreadComments', 'user-1']);
    expect(queryKeys.unreadComments(null)).toEqual(['unreadComments', null]);
  });
});
