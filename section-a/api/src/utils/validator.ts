import { ZodSchema } from 'zod';
import type { ValidationTargets } from 'hono';
import { zValidator as zv } from '@hono/zod-validator';
import { createValidationError } from '../errors/AppError';

export const validator = <T extends ZodSchema, Target extends keyof ValidationTargets>(
  target: Target,
  schema: T
) =>
  zv(target, schema, result => {
    if (!result.success) {
      const fieldErrors = result.error.issues.reduce<Record<string, string[]>>((acc, issue) => {
        const key = issue.path.length ? issue.path.join('.') : '_root';
        if (!acc[key]) acc[key] = [];
        acc[key].push(issue.message);
        return acc;
      }, {});
      throw createValidationError(fieldErrors);
    }
  });
