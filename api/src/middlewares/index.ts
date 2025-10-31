import type { Request, Response, NextFunction } from 'express';
import { type z, ZodError } from 'zod';
import {
  ApplicationError,
  createUnauthorizedError,
  createValidationError,
} from '../errors/AppError';
import { logger } from '../utils/logger';

/**
 * Authentication middleware - validates Bearer token
 */
export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    const error = createUnauthorizedError('Missing or invalid Authorization header');
    res.status(error.statusCode).json(error.toProblemDetail(req.originalUrl));
    return;
  }

  const token = authHeader.substring(7);
  const validToken = process.env.API_TOKEN || 'demo-token-12345';

  if (token !== validToken) {
    const error = createUnauthorizedError('Invalid API token');
    res.status(error.statusCode).json(error.toProblemDetail(req.originalUrl));
    return;
  }

  next();
};

/**
 * Request logging middleware
 */
export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('Request completed', {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration,
      ip: req.ip,
    });
  });

  logger.info('Request received', {
    method: req.method,
    path: req.path,
    query: req.query,
    ip: req.ip,
  });

  next();
};

/**
 * Validation middleware factory
 */
export const validate = <T extends z.ZodType>(schema: T) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors: Record<string, string[]> = {};

        error.errors.forEach(err => {
          const path = err.path.join('.');
          if (!errors[path]) {
            errors[path] = [];
          }
          errors[path]!.push(err.message);
        });

        const appError = createValidationError(errors);
        res.status(appError.statusCode).json(appError.toProblemDetail(req.originalUrl));
      } else {
        next(error);
      }
    }
  };
};

/**
 * Query parameter validation middleware
 */
export const validateQuery = <T extends z.ZodType>(schema: T) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.query = schema.parse(req.query) as typeof req.query;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors: Record<string, string[]> = {};

        error.errors.forEach(err => {
          const path = err.path.join('.');
          if (!errors[path]) {
            errors[path] = [];
          }
          errors[path]!.push(err.message);
        });

        const appError = createValidationError(errors);
        res.status(appError.statusCode).json(appError.toProblemDetail(req.originalUrl));
      } else {
        next(error);
      }
    }
  };
};

/**
 * Global error handler
 */
export const errorHandler = (
  err: Error | ApplicationError,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void => {
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

/**
 * 404 handler
 */
export const notFoundHandler = (req: Request, res: Response): void => {
  res.status(404).json({
    type: 'https://api.tasktracker.com/problems/not-found',
    title: 'Not Found',
    status: 404,
    detail: `Route ${req.method} ${req.path} not found`,
    instance: req.originalUrl,
  });
};
