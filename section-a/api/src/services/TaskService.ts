import { type TaskRepository } from '../repositories/TaskRepository';
import {
  type Task,
  type TaskCreateInput,
  type TaskUpdateInput,
  type TaskFilters,
  type PaginatedResponse,
  //   TaskId,
  createTaskId,
} from '../types/task';
import { createNotFoundError } from '../errors/AppError';

export class TaskService {
  constructor(private readonly repository: TaskRepository) {}

  async createTask(input: TaskCreateInput): Promise<Task> {
    return await this.repository.create(input);
  }

  async getTask(id: string): Promise<Task> {
    const taskId = createTaskId(id);
    const task = await this.repository.findById(taskId);

    if (!task) {
      throw createNotFoundError('Task', id);
    }

    return task;
  }

  async getTasks(filters: TaskFilters): Promise<PaginatedResponse<Task>> {
    const { tasks, total } = await this.repository.findMany(filters);

    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 10;
    const totalPages = Math.ceil(total / pageSize);

    return {
      data: tasks,
      pagination: {
        page,
        pageSize,
        total,
        totalPages,
      },
    };
  }

  async updateTask(id: string, input: TaskUpdateInput): Promise<Task> {
    const taskId = createTaskId(id);

    // Check if task exists
    const exists = await this.repository.exists(taskId);
    if (!exists) {
      throw createNotFoundError('Task', id);
    }

    return await this.repository.update(taskId, input);
  }

  async deleteTask(id: string): Promise<void> {
    const taskId = createTaskId(id);

    // Check if task exists
    const exists = await this.repository.exists(taskId);
    if (!exists) {
      throw createNotFoundError('Task', id);
    }

    await this.repository.delete(taskId);
  }
}
