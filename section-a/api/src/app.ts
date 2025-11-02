import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { secureHeaders } from 'hono/secure-headers';
import type { TaskService } from './services/TaskService';
import { createTaskRoutes } from './routes/taskRoutes';
import { notFoundHandler } from './middlewares/notFoundHandler';
import { errorHandler } from './middlewares/errorHandler';

export const createApp = (taskService: TaskService) => {
  const app = new Hono();

  // Security middleware
  app.use('*', secureHeaders());
  app.use('*', cors());

  // Request logging
  app.use(logger());

  // Health check
  app.get('/health', c => {
    return c.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
    });
  });

  // API routes
  app.route('/api/tasks', createTaskRoutes(taskService));

  // 404 handler
  app.notFound(notFoundHandler);

  // Error handler
  app.onError(errorHandler);

  return app;
};
