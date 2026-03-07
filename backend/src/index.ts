import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { dbMiddleware } from './middleware/db';
import { authMiddleware } from './middleware/auth';
import tasksRoute from './routes/tasks';
import commentsRoute from './routes/comments';
import sessionsRoute from './routes/sessions';
import usersRoute from './routes/users';
import labelsRoute from './routes/labels';
import timerRoute from './routes/timer';
import reportsRoute from './routes/reports';
import backlogRoute from './routes/backlog';
import githubRoute from './routes/github';
import contactRoute from './routes/contact';
import chatRoute from './routes/chat';
import driveRoute from './routes/drive';
import notificationsRoute from './routes/notifications';
import uploadRoute from './routes/upload';

export type Env = {
  Bindings: {
    DATABASE_URL: string;
    CLERK_SECRET_KEY: string;
    ENVIRONMENT: string;
    GITHUB_TOKEN: string;
    GOOGLE_CHAT_WEBHOOK_URL: string;
    GOOGLE_CHAT_SPACE_URL: string;
    GOOGLE_OAUTH_CLIENT_ID: string;
    GOOGLE_OAUTH_CLIENT_SECRET: string;
    DRIVE_PARENT_ID: string;
    CHECKSHEET_TEMPLATE_ID: string;
    APP_ORIGIN: string;
    INTERNAL_API_KEY: string;
    UPLOAD_BUCKET: R2Bucket;
  };
};

const app = new Hono<Env>();

// CORS
app.use(
  '*',
  cors({
    origin: ['http://localhost:3000'],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowHeaders: ['Content-Type', 'Authorization', 'X-Internal-Key', 'X-Internal-User-Id'],
  })
);

// Health check (認証不要)
app.get('/health', (c) => c.json({ status: 'ok' }));

// ファイル配信（認証不要、DB不要）
app.get('/api/files/*', async (c) => {
  const key = c.req.path.replace('/api/files/', '');
  const bucket = c.env.UPLOAD_BUCKET;
  if (!bucket) return c.json({ error: 'Storage not configured' }, 500);

  const object = await bucket.get(key);
  if (!object) return c.json({ error: 'File not found' }, 404);

  const headers = new Headers();
  headers.set('Content-Type', object.httpMetadata?.contentType || 'application/octet-stream');
  headers.set('Cache-Control', 'public, max-age=31536000');
  return new Response(object.body, { headers });
});

// DB + Auth ミドルウェア（APIルート全体に適用）
app.use('/api/*', dbMiddleware);
app.use('/api/*', authMiddleware);

// Routes
app.route('/api/tasks', tasksRoute);
app.route('/api/comments', commentsRoute);
app.route('/api/sessions', sessionsRoute);
app.route('/api/users', usersRoute);
app.route('/api/labels', labelsRoute);
app.route('/api/timer', timerRoute);
app.route('/api/reports', reportsRoute);
app.route('/api/backlog', backlogRoute);
app.route('/api/github', githubRoute);
app.route('/api/contact', contactRoute);
app.route('/api/chat', chatRoute);
app.route('/api/drive', driveRoute);
app.route('/api/notifications', notificationsRoute);
app.route('/api/upload', uploadRoute);

export default app;
