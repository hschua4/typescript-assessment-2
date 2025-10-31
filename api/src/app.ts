import express, { type Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { type TaskService } from './services/TaskService';
import { createTaskRoutes } from './routes/taskRoutes';
import { errorHandler, notFoundHandler, requestLogger } from './middlewares';

export const createApp = (taskService: TaskService): Express => {
  const app = express();

  // Security middleware
  app.use(helmet());
  app.use(cors());

  // Body parsing
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Request logging
  app.use(requestLogger);

  // Health check
  app.get('/health', (req, res) => {
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
    });
  });

  // API routes
  app.use('/tasks', createTaskRoutes(taskService));

  // 404 handler
  app.use(notFoundHandler);

  // Error handler (must be last)
  app.use(errorHandler);

  return app;
};
