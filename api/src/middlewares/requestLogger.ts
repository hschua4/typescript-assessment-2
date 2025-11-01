import type { Context, Next } from 'hono';
import { createMiddleware } from 'hono/factory';
import { logger } from '../utils/logger';

export const requestLogger = createMiddleware(async (c: Context, next: Next) => {
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
});
