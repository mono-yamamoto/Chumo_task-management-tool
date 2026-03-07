import { Hono } from 'hono';
import { cors } from 'hono/cors';

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

// Health check
app.get('/health', (c) => c.json({ status: 'ok' }));

// Routes will be added in Phase 2
// app.route('/api/tasks', tasksRoute);
// app.route('/api/users', usersRoute);
// app.route('/api/labels', labelsRoute);

export default app;
