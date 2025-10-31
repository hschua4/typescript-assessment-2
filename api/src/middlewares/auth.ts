import type { Request, Response, NextFunction } from 'express';
import { createUnauthorizedError } from '../errors/AppError';

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
