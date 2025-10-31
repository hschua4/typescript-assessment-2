import type { ProblemDetail, AppError } from '../types/task';

export class ApplicationError extends Error {
  constructor(
    public readonly errorType: AppError,
    public readonly statusCode: number
  ) {
    super();
    this.name = 'ApplicationError';
  }

  toProblemDetail(instance?: string): ProblemDetail {
    const baseUrl = 'https://api.tasktracker.com/problems';

    switch (this.errorType.type) {
      case 'VALIDATION_ERROR':
        return {
          type: `${baseUrl}/validation-error`,
          title: 'Validation Failed',
          status: 400,
          detail: 'One or more fields failed validation',
          errors: this.errorType.errors,
          instance,
        };

      case 'NOT_FOUND':
        return {
          type: `${baseUrl}/not-found`,
          title: 'Resource Not Found',
          status: 404,
          detail: `${this.errorType.resource} with id '${this.errorType.id}' was not found`,
          instance,
        };

      case 'CONFLICT':
        return {
          type: `${baseUrl}/conflict`,
          title: 'Conflict',
          status: 409,
          detail: this.errorType.message,
          instance,
        };

      case 'UNAUTHORIZED':
        return {
          type: `${baseUrl}/unauthorized`,
          title: 'Unauthorized',
          status: 401,
          detail: this.errorType.message,
          instance,
        };

      case 'INTERNAL_ERROR':
        return {
          type: `${baseUrl}/internal-error`,
          title: 'Internal Server Error',
          status: 500,
          detail: this.errorType.message,
          instance,
        };
    }
  }
}

export const createValidationError = (errors: Record<string, string[]>): ApplicationError => {
  return new ApplicationError({ type: 'VALIDATION_ERROR', errors }, 400);
};

export const createNotFoundError = (resource: string, id: string): ApplicationError => {
  return new ApplicationError({ type: 'NOT_FOUND', resource, id }, 404);
};

export const createConflictError = (message: string): ApplicationError => {
  return new ApplicationError({ type: 'CONFLICT', message }, 409);
};

export const createUnauthorizedError = (message: string): ApplicationError => {
  return new ApplicationError({ type: 'UNAUTHORIZED', message }, 401);
};

export const createInternalError = (message: string): ApplicationError => {
  return new ApplicationError({ type: 'INTERNAL_ERROR', message }, 500);
};
