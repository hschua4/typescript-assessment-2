import type { Context } from 'hono';

export const notFoundHandler = (c: Context) => {
  c.status(404);
  return c.json({
    type: 'https://api.tasktracker.com/problems/not-found',
    title: 'Not Found',
    status: 404,
    detail: `Route ${c.req.method} ${c.req.path} not found`,
    instance: c.req.path,
  });
};
