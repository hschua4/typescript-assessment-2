import type { Request, Response } from 'express';
import { ApplicationError } from '../errors/AppError';
import { logger } from '../utils/logger';

export const errorHandler = (err: Error | ApplicationError, req: Request, res: Response): void => {
  logger.error('Error occurred', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  if (err instanceof ApplicationError) {
    const problemDetail = err.toProblemDetail(req.originalUrl);
    res.status(err.statusCode).json(problemDetail);
    return;
  }

  // Unexpected errors
  res.status(500).json({
    type: 'https://api.tasktracker.com/problems/internal-error',
    title: 'Internal Server Error',
    status: 500,
    detail: 'An unexpected error occurred',
    instance: req.originalUrl,
  });
};
