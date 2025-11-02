import type { Context } from 'hono';
import { ApplicationError } from '../errors/AppError';
import { logger } from '../utils/logger';

export const errorHandler = (err: Error, c: Context) => {
  logger.error('Error occurred', {
    error: err.message,
    stack: err.stack,
    path: c.req.path,
    method: c.req.method,
  });

  if (err instanceof ApplicationError) {
    const problemDetail = err.toProblemDetail(c.req.path);
    c.status(problemDetail.status);
    return c.json(problemDetail);
  }

  // Unexpected errors
  c.status(500);
  return c.json({
    type: 'https://api.tasktracker.com/problems/internal-error',
    title: 'Internal Server Error',
    status: 500,
    detail: 'An unexpected error occurred',
    instance: c.req.path,
  });
};
