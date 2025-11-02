import Database from 'better-sqlite3';
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

interface TaskRow {
  id: string;
  title: string;
  status: string;
  priority: number;
  due_date: string | null;
  tags: string;
  version: number;
  created_at: string;
  updated_at: string;
}

export class SqliteTaskRepository implements TaskRepository {
  private db: Database.Database;

  constructor(dbPath: string = ':memory:') {
    this.db = new Database(dbPath);
    this.initializeDatabase();
  }

  private initializeDatabase(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL CHECK(length(title) >= 1 AND length(title) <= 120),
        status TEXT NOT NULL CHECK(status IN ('todo', 'doing', 'done')),
        priority INTEGER NOT NULL CHECK(priority >= 1 AND priority <= 5),
        due_date TEXT,
        tags TEXT NOT NULL DEFAULT '[]',
        version INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
      CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
      CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
    `);
  }

  private rowToTask(row: TaskRow): Task {
    return {
      id: row.id,
      title: row.title,
      status: row.status as Task['status'],
      priority: row.priority as Task['priority'],
      dueDate: row.due_date,
      tags: JSON.parse(row.tags) as string[],
      version: row.version,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async create(input: TaskCreateInput): Promise<Task> {
    const id = uuidv4();
    const now = new Date().toISOString();
    const tags = JSON.stringify(input.tags ?? []);

    const stmt = this.db.prepare(`
      INSERT INTO tasks (id, title, status, priority, due_date, tags, version, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
    `);

    stmt.run(
      id,
      input.title,
      input.status ?? 'todo',
      input.priority ?? 3,
      input.dueDate ?? null,
      tags,
      now,
      now
    );

    const task = await this.findById(createTaskId(id));
    if (!task) {
      throw new Error('Failed to create task');
    }

    return task;
  }

  async findById(id: TaskId): Promise<Task | null> {
    const stmt = this.db.prepare('SELECT * FROM tasks WHERE id = ?');
    const row = stmt.get(id) as TaskRow | undefined;
    return row ? this.rowToTask(row) : null;
  }

  async findMany(filters: TaskFilters): Promise<{ tasks: Task[]; total: number }> {
    const conditions: string[] = [];
    const params: (string | number)[] = [];

    // Build WHERE clause
    if (filters.status) {
      conditions.push('status = ?');
      params.push(filters.status);
    }

    if (filters.tag) {
      conditions.push('tags LIKE ?');
      params.push(`%"${filters.tag}"%`);
    }

    if (filters.search) {
      conditions.push('title LIKE ?');
      params.push(`%${filters.search}%`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Count total
    const countStmt = this.db.prepare(`SELECT COUNT(*) as count FROM tasks ${whereClause}`);
    const countResult = countStmt.get(...params) as { count: number };
    const total = countResult.count;

    // Build ORDER BY clause
    let orderClause = '';
    if (filters.sortBy) {
      const column = filters.sortBy === 'dueDate' ? 'due_date' : filters.sortBy;
      const order = filters.sortOrder === 'desc' ? 'DESC' : 'ASC';
      orderClause = `ORDER BY ${column} ${order} NULLS LAST`;
    }

    // Pagination
    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 10;
    const offset = (page - 1) * pageSize;

    const query = `
      SELECT * FROM tasks 
      ${whereClause} 
      ${orderClause}
      LIMIT ? OFFSET ?
    `;

    const stmt = this.db.prepare(query);
    const rows = stmt.all(...params, pageSize, offset) as TaskRow[];
    const tasks = rows.map(row => this.rowToTask(row));

    return { tasks, total };
  }

  async update(id: TaskId, input: TaskUpdateInput): Promise<Task> {
    // First, check current version
    const current = await this.findById(id);
    if (!current) {
      throw new Error('Task not found');
    }

    if (current.version !== input.version) {
      throw createConflictError(
        `Version mismatch. Expected version ${current.version}, got ${input.version}`
      );
    }

    const updates: string[] = [];
    const params: (string | number | null)[] = [];

    if (input.title !== undefined) {
      updates.push('title = ?');
      params.push(input.title);
    }

    if (input.status !== undefined) {
      updates.push('status = ?');
      params.push(input.status);
    }

    if (input.priority !== undefined) {
      updates.push('priority = ?');
      params.push(input.priority);
    }

    if (input.dueDate !== undefined) {
      updates.push('due_date = ?');
      params.push(input.dueDate);
    }

    if (input.tags !== undefined) {
      updates.push('tags = ?');
      params.push(JSON.stringify(input.tags));
    }

    updates.push('version = version + 1');
    updates.push('updated_at = ?');
    params.push(new Date().toISOString());

    // Add WHERE clause params
    params.push(id);
    params.push(input.version);

    const query = `
      UPDATE tasks 
      SET ${updates.join(', ')}
      WHERE id = ? AND version = ?
    `;

    const stmt = this.db.prepare(query);
    const result = stmt.run(...params);

    if (result.changes === 0) {
      throw createConflictError('Version conflict or task not found');
    }

    const updated = await this.findById(id);
    if (!updated) {
      throw new Error('Failed to retrieve updated task');
    }

    return updated;
  }

  async delete(id: TaskId): Promise<void> {
    const stmt = this.db.prepare('DELETE FROM tasks WHERE id = ?');
    stmt.run(id);
  }

  async exists(id: TaskId): Promise<boolean> {
    const stmt = this.db.prepare('SELECT 1 FROM tasks WHERE id = ? LIMIT 1');
    const result = stmt.get(id);
    return result !== undefined;
  }

  close(): void {
    this.db.close();
  }
}
