import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';
import type { TaskService } from './services/TaskService';
import { createTaskRoutes } from './routes/taskRoutes';
import { errorHandler, notFoundHandler, requestLogger } from './middlewares';

export const createApp = (taskService: TaskService) => {
  const app = new Hono();

  // Security middleware
  app.use('*', secureHeaders());
  app.use('*', cors());

  // Request logging
  app.use('*', requestLogger());

  // Health check
  app.get('/health', c => {
    return c.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
    });
  });

  // API routes
  app.route('/tasks', createTaskRoutes(taskService));

  // 404 handler
  app.notFound(notFoundHandler);

  // Error handler
  app.onError(errorHandler);

  return app;
};
