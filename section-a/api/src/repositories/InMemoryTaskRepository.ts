import { v4 as uuidv4 } from 'uuid';
import { TaskRepository } from './TaskRepository';
import {
  Task,
  TaskCreateInput,
  TaskUpdateInput,
  TaskFilters,
  TaskId,
  createTaskId,
} from '../types/task';
import { createConflictError } from '../errors/AppError';

export class InMemoryTaskRepository implements TaskRepository {
  private tasks: Map<string, Task> = new Map();

  async create(input: TaskCreateInput): Promise<Task> {
    const id = createTaskId(uuidv4());
    const now = new Date().toISOString();

    const task: Task = {
      id,
      title: input.title,
      status: input.status ?? 'todo',
      priority: input.priority ?? 3,
      dueDate: input.dueDate ?? null,
      tags: input.tags ?? [],
      version: 1,
      createdAt: now,
      updatedAt: now,
    };

    this.tasks.set(id, task);
    return task;
  }

  async findById(id: TaskId): Promise<Task | null> {
    return this.tasks.get(id) ?? null;
  }

  async findMany(filters: TaskFilters): Promise<{ tasks: Task[]; total: number }> {
    let tasks = Array.from(this.tasks.values());

    // Apply filters
    if (filters.status) {
      tasks = tasks.filter(t => t.status === filters.status);
    }

    if (filters.tag) {
      tasks = tasks.filter(t => t.tags.includes(filters.tag!));
    }

    if (filters.search) {
      const search = filters.search.toLowerCase();
      tasks = tasks.filter(t => t.title.toLowerCase().includes(search));
    }

    // Apply sorting
    if (filters.sortBy) {
      tasks.sort((a, b) => {
        let aVal: number | string | null;
        let bVal: number | string | null;

        if (filters.sortBy === 'priority') {
          aVal = a.priority;
          bVal = b.priority;
        } else {
          aVal = a.dueDate;
          bVal = b.dueDate;
        }

        // Handle nulls
        if (aVal === null) return 1;
        if (bVal === null) return -1;

        const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        return filters.sortOrder === 'desc' ? -comparison : comparison;
      });
    }

    const total = tasks.length;

    // Apply pagination
    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 10;
    const start = (page - 1) * pageSize;
    const paginatedTasks = tasks.slice(start, start + pageSize);

    return { tasks: paginatedTasks, total };
  }

  async update(id: TaskId, input: TaskUpdateInput): Promise<Task> {
    const task = this.tasks.get(id);
    if (!task) {
      throw new Error('Task not found');
    }

    // Optimistic concurrency check
    if (task.version !== input.version) {
      throw createConflictError(
        `Version mismatch. Expected version ${task.version}, got ${input.version}`
      );
    }

    const updated: Task = {
      ...task,
      title: input.title ?? task.title,
      status: input.status ?? task.status,
      priority: input.priority ?? task.priority,
      dueDate: input.dueDate !== undefined ? input.dueDate : task.dueDate,
      tags: input.tags ?? task.tags,
      version: task.version + 1,
      updatedAt: new Date().toISOString(),
    };

    this.tasks.set(id, updated);
    return updated;
  }

  async delete(id: TaskId): Promise<void> {
    this.tasks.delete(id);
  }

  async exists(id: TaskId): Promise<boolean> {
    return this.tasks.has(id);
  }

  clear(): void {
    this.tasks.clear();
  }
}
