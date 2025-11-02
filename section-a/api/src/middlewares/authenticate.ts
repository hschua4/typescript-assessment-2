import type { Context, Next, MiddlewareHandler } from 'hono';
import { createUnauthorizedError } from '../errors/AppError';

export const authenticate = (): MiddlewareHandler => {
  return async (c: Context, next: Next) => {
    const authHeader = c.req.header('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      const error = createUnauthorizedError('Missing or invalid Authorization header');
      throw error;
    }

    const token = authHeader.substring(7);
    const validToken = process.env.API_TOKEN;

    if (token !== validToken) {
      const error = createUnauthorizedError('Invalid API token');
      throw error;
    }

    return await next();
  };
};
