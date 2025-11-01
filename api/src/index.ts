import { serve } from '@hono/node-server';
import { createApp } from './app';
import { SqliteTaskRepository } from './repositories/SqliteTaskRepository';
import { TaskService } from './services/TaskService';
import { logger } from './utils/logger';

const PORT = parseInt(process.env.PORT || '3000', 10);
const DB_PATH = process.env.DB_PATH || './tasks.db';

function main() {
  try {
    // Initialize repository (swappable!)
    const repository = new SqliteTaskRepository(DB_PATH);
    logger.info('Database initialized', { path: DB_PATH });

    // Initialize service
    const taskService = new TaskService(repository);

    // Create Hono app
    const app = createApp(taskService);

    // Start server
    const server = serve({
      fetch: app.fetch,
      port: PORT,
    });

    logger.info('Server started', {
      port: PORT,
      env: process.env.NODE_ENV || 'development',
    });

    // Graceful shutdown
    const shutdown = () => {
      logger.info('Shutting down gracefully...');
      server.close(() => {
        logger.info('Server closed');
        repository.close();
        process.exit(0);
      });
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
}

main();
