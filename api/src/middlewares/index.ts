import type { Context, Next, MiddlewareHandler } from 'hono';
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
export const authenticate = (): MiddlewareHandler => {
  return async (c: Context, next: Next) => {
    const authHeader = c.req.header('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      const error = createUnauthorizedError('Missing or invalid Authorization header');
      return c.json(error.toProblemDetail(c.req.path), error.statusCode);
    }

    const token = authHeader.substring(7);
    const validToken = process.env.API_TOKEN || 'demo-token-12345';

    if (token !== validToken) {
      const error = createUnauthorizedError('Invalid API token');
      return c.json(error.toProblemDetail(c.req.path), error.statusCode);
    }

    return await next();
  };
};

/**
 * Request logging middleware
 */
export const requestLogger = (): MiddlewareHandler => {
  return async (c: Context, next: Next) => {
    const start = Date.now();
    const method = c.req.method;
    const path = c.req.path;

    logger.info('Request received', {
      method,
      path,
      query: c.req.query(),
    });

    await next();

    const duration = Date.now() - start;
    logger.info('Request completed', {
      method,
      path,
      statusCode: c.res.status,
      duration,
    });
  };
};

/**
 * Validation middleware factory for body
 */
export const validateBody = <T extends z.ZodType>(schema: T): MiddlewareHandler => {
  return async (c: Context, next: Next) => {
    try {
      const body = await c.req.json();
      const validated = schema.parse(body);
      c.set('validatedBody', validated);
      await next();
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
        return c.json(appError.toProblemDetail(c.req.path), appError.statusCode);
      }
      throw error;
    }
  };
};

/**
 * Query parameter validation middleware
 */
export const validateQuery = <T extends z.ZodType>(schema: T): MiddlewareHandler => {
  return async (c: Context, next: Next) => {
    try {
      const query = c.req.query();
      const validated = schema.parse(query);
      c.set('validatedQuery', validated);
      await next();
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
        return c.json(appError.toProblemDetail(c.req.path), appError.statusCode);
      }
      throw error;
    }
  };
};

/**
 * Global error handler
 */
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

/**
 * 404 handler
 */
export const notFoundHandler = (c: Context) => {
  return c.json(
    {
      type: 'https://api.tasktracker.com/problems/not-found',
      title: 'Not Found',
      status: 404,
      detail: `Route ${c.req.method} ${c.req.path} not found`,
      instance: c.req.path,
    },
    404
  );
};
