import { Task, TaskCreateInput, TaskUpdateInput, TaskFilters, TaskId } from '../types/task';

/**
 * Repository interface for Task persistence
 * This abstraction allows for swappable implementations (SQLite, in-memory, etc.)
 */
export interface TaskRepository {
  /**
   * Create a new task
   */
  create(input: TaskCreateInput): Promise<Task>;

  /**
   * Find a task by ID
   */
  findById(id: TaskId): Promise<Task | null>;

  /**
   * Find tasks with filters and pagination
   */
  findMany(filters: TaskFilters): Promise<{ tasks: Task[]; total: number }>;

  /**
   * Update a task with optimistic concurrency control
   * @throws ConflictError if version mismatch
   */
  update(id: TaskId, input: TaskUpdateInput): Promise<Task>;

  /**
   * Delete a task
   */
  delete(id: TaskId): Promise<void>;

  /**
   * Check if a task exists
   */
  exists(id: TaskId): Promise<boolean>;
}
