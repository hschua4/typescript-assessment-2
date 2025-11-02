import type { Request, Response } from 'express';

export const notFoundHandler = (req: Request, res: Response): void => {
  res.status(404).json({
    type: 'https://api.tasktracker.com/problems/not-found',
    title: 'Not Found',
    status: 404,
    detail: `Route ${req.method} ${req.path} not found`,
    instance: req.originalUrl,
  });
};
