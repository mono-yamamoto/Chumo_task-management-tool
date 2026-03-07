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

export type Env = {
  Bindings: {
    DATABASE_URL: string;
    CLERK_SECRET_KEY: string;
    ENVIRONMENT: string;
  };
};

const app = new Hono<Env>();

// CORS
app.use(
  '*',
  cors({
    origin: ['http://localhost:3000'],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowHeaders: ['Content-Type', 'Authorization'],
  })
);

// Health check (認証不要)
app.get('/health', (c) => c.json({ status: 'ok' }));

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

export default app;
