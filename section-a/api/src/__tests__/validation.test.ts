import { describe, it, expect } from 'vitest';
import { TaskCreateInputSchema, TaskUpdateInputSchema, TaskFiltersSchema } from '../types/task';

describe('Task Validation', () => {
  describe('TaskCreateInputSchema', () => {
    it('should validate valid task creation input', () => {
      const valid = {
        title: 'Test task',
        status: 'todo' as const,
        priority: 3,
        tags: ['test'],
      };

      const result = TaskCreateInputSchema.parse(valid);
      expect(result.title).toBe('Test task');
      expect(result.status).toBe('todo');
    });

    it('should apply defaults for optional fields', () => {
      const minimal = { title: 'Test' };
      const result = TaskCreateInputSchema.parse(minimal);

      expect(result.status).toBe('todo');
      expect(result.priority).toBe(3);
      expect(result.tags).toEqual([]);
    });

    it('should trim whitespace from title', () => {
      const input = { title: '  Test task  ' };
      const result = TaskCreateInputSchema.parse(input);
      expect(result.title).toBe('Test task');
    });

    it('should reject empty title', () => {
      const invalid = { title: '' };
      expect(() => TaskCreateInputSchema.parse(invalid)).toThrow();
    });

    it('should reject title over 120 characters', () => {
      const invalid = { title: 'a'.repeat(121) };
      expect(() => TaskCreateInputSchema.parse(invalid)).toThrow();
    });

    it('should reject invalid status', () => {
      const invalid = { title: 'Test', status: 'invalid' };
      expect(() => TaskCreateInputSchema.parse(invalid)).toThrow();
    });

    it('should reject priority outside 1-5 range', () => {
      expect(() => TaskCreateInputSchema.parse({ title: 'Test', priority: 0 })).toThrow();
      expect(() => TaskCreateInputSchema.parse({ title: 'Test', priority: 6 })).toThrow();
    });

    it('should validate ISO date strings', () => {
      const valid = {
        title: 'Test',
        dueDate: '2025-12-31T23:59:59Z',
      };
      const result = TaskCreateInputSchema.parse(valid);
      expect(result.dueDate).toBe('2025-12-31T23:59:59Z');
    });

    it('should reject invalid date format', () => {
      const invalid = {
        title: 'Test',
        dueDate: '2025-13-32', // Invalid date
      };
      expect(() => TaskCreateInputSchema.parse(invalid)).toThrow();
    });
  });

  describe('TaskUpdateInputSchema', () => {
    it('should validate partial updates', () => {
      const valid = {
        title: 'Updated',
        version: 1,
      };
      const result = TaskUpdateInputSchema.parse(valid);
      expect(result.title).toBe('Updated');
      expect(result.version).toBe(1);
    });

    it('should require version field', () => {
      const invalid = { title: 'Updated' };
      expect(() => TaskUpdateInputSchema.parse(invalid)).toThrow();
    });

    it('should reject version less than 1', () => {
      const invalid = { title: 'Test', version: 0 };
      expect(() => TaskUpdateInputSchema.parse(invalid)).toThrow();
    });

    it('should allow status-only updates', () => {
      const valid = { status: 'done' as const, version: 1 };
      const result = TaskUpdateInputSchema.parse(valid);
      expect(result.status).toBe('done');
    });
  });

  describe('TaskFiltersSchema', () => {
    it('should apply defaults for pagination', () => {
      const result = TaskFiltersSchema.parse({});
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(10);
      expect(result.sortOrder).toBe('asc');
    });

    it('should coerce string numbers to integers', () => {
      const result = TaskFiltersSchema.parse({ page: '2', pageSize: '20' });
      expect(result.page).toBe(2);
      expect(result.pageSize).toBe(20);
    });

    it('should reject pageSize over 100', () => {
      expect(() => TaskFiltersSchema.parse({ pageSize: 101 })).toThrow();
    });

    it('should validate valid sortBy values', () => {
      const result1 = TaskFiltersSchema.parse({ sortBy: 'priority' });
      expect(result1.sortBy).toBe('priority');

      const result2 = TaskFiltersSchema.parse({ sortBy: 'dueDate' });
      expect(result2.sortBy).toBe('dueDate');
    });

    it('should reject invalid sortBy values', () => {
      expect(() => TaskFiltersSchema.parse({ sortBy: 'invalid' })).toThrow();
    });
  });
});
