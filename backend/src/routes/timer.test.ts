import { describe, it, expect, afterAll, afterEach } from 'vitest';
import { createTestApp, db, client } from './test-app';
import { cleanDatabase } from '../db/test-helpers';
import * as schema from '../db/schema';

const app = createTestApp();

afterEach(async () => {
  await cleanDatabase(db);
});

afterAll(async () => {
  await client.end();
});

describe('Timer API', () => {
  // 共通のタスクシードデータ
  async function seedTask(id = 'task-timer') {
    await db.insert(schema.tasks).values({
      id,
      projectType: 'MONO',
      title: 'タイマーテスト用タスク',
      kubunLabelId: 'label-1',
      order: 1,
      createdBy: 'test-user',
    });
  }

  describe('POST /api/timer/start', () => {
    it('タイマーを開始できる', async () => {
      await seedTask();

      const res = await app.request('/api/timer/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectType: 'MONO',
          taskId: 'task-timer',
        }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.sessionId).toBeDefined();
      expect(typeof body.sessionId).toBe('string');
    });

    it('存在しないタスクだと404', async () => {
      const res = await app.request('/api/timer/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectType: 'MONO',
          taskId: 'nonexistent',
        }),
      });

      expect(res.status).toBe(404);
    });

    it('排他制御: 同一ユーザーが2つ同時に起動できない', async () => {
      await seedTask('task-timer-1');
      await seedTask('task-timer-2');

      // 1つ目のタイマー開始
      const res1 = await app.request('/api/timer/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectType: 'MONO',
          taskId: 'task-timer-1',
        }),
      });
      expect(res1.status).toBe(200);

      // 2つ目のタイマー開始 → 400
      const res2 = await app.request('/api/timer/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectType: 'MONO',
          taskId: 'task-timer-2',
        }),
      });
      expect(res2.status).toBe(400);
      const body = await res2.json();
      expect(body.code).toBe('TIMER_ALREADY_RUNNING');
    });

    it('別ユーザーのタイマーは排他制御に影響しない', async () => {
      await seedTask();

      // 別ユーザーのアクティブセッションを直接挿入
      await db.insert(schema.taskSessions).values({
        id: 'other-session',
        taskId: 'task-timer',
        projectType: 'MONO',
        userId: 'other-user',
        startedAt: new Date(),
        endedAt: null,
        durationSec: 0,
      });

      // test-userはタイマー開始できる
      const res = await app.request('/api/timer/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectType: 'MONO',
          taskId: 'task-timer',
        }),
      });
      expect(res.status).toBe(200);
    });
  });

  describe('POST /api/timer/stop', () => {
    it('タイマーを停止できる（durationSec自動計算）', async () => {
      await seedTask();

      // セッションを直接挿入（5分前に開始）
      const startedAt = new Date(Date.now() - 5 * 60 * 1000);
      await db.insert(schema.taskSessions).values({
        id: 'session-stop',
        taskId: 'task-timer',
        projectType: 'MONO',
        userId: 'test-user',
        startedAt,
        endedAt: null,
        durationSec: 0,
      });

      const res = await app.request('/api/timer/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectType: 'MONO',
          sessionId: 'session-stop',
        }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.durationSec).toBeGreaterThanOrEqual(299); // ~5分
      expect(body.durationMin).toBeGreaterThanOrEqual(4);
    });

    it('存在しないセッションだと404', async () => {
      const res = await app.request('/api/timer/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectType: 'MONO',
          sessionId: 'nonexistent',
        }),
      });

      expect(res.status).toBe(404);
    });

    it('既に終了したセッションだと400', async () => {
      await seedTask();

      await db.insert(schema.taskSessions).values({
        id: 'session-ended',
        taskId: 'task-timer',
        projectType: 'MONO',
        userId: 'test-user',
        startedAt: new Date(Date.now() - 60000),
        endedAt: new Date(),
        durationSec: 60,
      });

      const res = await app.request('/api/timer/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectType: 'MONO',
          sessionId: 'session-ended',
        }),
      });

      expect(res.status).toBe(400);
    });
  });

  describe('タイマー開始→停止の一連フロー', () => {
    it('start→stopで正しくセッションが記録される', async () => {
      await seedTask();

      // Start
      const startRes = await app.request('/api/timer/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectType: 'MONO',
          taskId: 'task-timer',
        }),
      });
      expect(startRes.status).toBe(200);
      const { sessionId } = await startRes.json();

      // Stop
      const stopRes = await app.request('/api/timer/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectType: 'MONO',
          sessionId,
        }),
      });
      expect(stopRes.status).toBe(200);
      const stopBody = await stopRes.json();
      expect(stopBody.success).toBe(true);
      expect(stopBody.durationSec).toBeGreaterThanOrEqual(0);

      // 停止後は新しいタイマーを開始できる
      const res3 = await app.request('/api/timer/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectType: 'MONO',
          taskId: 'task-timer',
        }),
      });
      expect(res3.status).toBe(200);
    });
  });
});
