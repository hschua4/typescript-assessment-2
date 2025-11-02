import { StatusCode } from 'hono/utils/http-status';
import { z } from 'zod';

// Branded type for TaskId to prevent accidental string usage
export type TaskId = string & { readonly __brand: 'TaskId' };

export const createTaskId = (id: string): TaskId => id as TaskId;

// Task status as discriminated union
export const TaskStatusSchema = z.enum(['todo', 'doing', 'done']);
export type TaskStatus = z.infer<typeof TaskStatusSchema>;

// Task priority with validation
export const TaskPrioritySchema = z.number().int().min(1).max(5);
export type TaskPriority = 1 | 2 | 3 | 4 | 5;

// Core Task entity
export const TaskSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(120),
  status: TaskStatusSchema,
  priority: TaskPrioritySchema,
  dueDate: z.string().datetime().nullable(),
  tags: z.array(z.string()),
  version: z.number().int().positive(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Task = z.infer<typeof TaskSchema>;

// Task creation input
export const TaskCreateInputSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(120, 'Title must be 120 characters or less')
    .trim(),
  status: TaskStatusSchema.optional().default('todo'),
  priority: TaskPrioritySchema.optional().default(3),
  dueDate: z.string().datetime().nullable().optional(),
  tags: z.array(z.string()).optional().default([]),
});

export type TaskCreateInput = z.infer<typeof TaskCreateInputSchema>;

// Task update input (partial)
export const TaskUpdateInputSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(120, 'Title must be 120 characters or less')
    .trim()
    .optional(),
  status: TaskStatusSchema.optional(),
  priority: TaskPrioritySchema.optional(),
  dueDate: z.string().datetime().nullable().optional(),
  tags: z.array(z.string()).optional(),
  version: z.number().int().positive(),
});

export type TaskUpdateInput = z.infer<typeof TaskUpdateInputSchema>;

// Query filters
export const TaskFiltersSchema = z.object({
  status: TaskStatusSchema.optional(),
  tag: z.string().optional(),
  search: z.string().optional(),
  sortBy: z.enum(['priority', 'dueDate']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().positive().max(100).optional().default(10),
});

export type TaskFilters = z.infer<typeof TaskFiltersSchema>;

// Pagination metadata
export interface PaginationMetadata {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

// Paginated response
export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMetadata;
}

// RFC 7807 Problem Details
export interface ProblemDetail {
  type: string;
  title: string;
  status: StatusCode;
  detail?: string;
  errors?: Record<string, string[]>;
  instance?: string;
}

// Error types as discriminated union
export type AppError =
  | { type: 'VALIDATION_ERROR'; errors: Record<string, string[]> }
  | { type: 'NOT_FOUND'; resource: string; id: string }
  | { type: 'CONFLICT'; message: string }
  | { type: 'UNAUTHORIZED'; message: string }
  | { type: 'INTERNAL_ERROR'; message: string };
