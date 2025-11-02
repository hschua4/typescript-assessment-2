import { describe, it, expect, beforeEach } from 'vitest';
import { createApp } from '../app';
import { InMemoryTaskRepository } from '../repositories/InMemoryTaskRepository';
import { TaskService } from '../services/TaskService';

const API_TOKEN = 'test-token-12345';

describe('Task API Integration Tests', () => {
  let app: ReturnType<typeof createApp>;
  let repository: InMemoryTaskRepository;

  beforeEach(() => {
    repository = new InMemoryTaskRepository();
    const taskService = new TaskService(repository);
    app = createApp(taskService);
    process.env.API_TOKEN = API_TOKEN;
  });

  describe('POST /tasks', () => {
    it('should create a task successfully', async () => {
      const response = await app.request('api/tasks', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: 'Test task',
          status: 'todo',
          priority: 3,
          tags: ['test'],
        }),
      });

      expect(response.status).toBe(201);
      const body = await response.json();
      expect(body).toMatchObject({
        title: 'Test task',
        status: 'todo',
        priority: 3,
        tags: ['test'],
        version: 1,
      });
      expect(body.id).toBeDefined();
      expect(body.createdAt).toBeDefined();
    });

    it('should reject request without authentication', async () => {
      const response = await app.request('api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Test task' }),
      });

      expect(response.status).toBe(401);
    });

    it('should reject invalid title', async () => {
      const response = await app.request('api/tasks', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title: '' }),
      });

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.title).toBe('Validation Failed');
      expect(body.errors).toBeDefined();
    });

    it('should reject title over 120 characters', async () => {
      const response = await app.request('api/tasks', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title: 'a'.repeat(121) }),
      });

      expect(response.status).toBe(400);
    });

    it('should apply defaults for optional fields', async () => {
      const response = await app.request('api/tasks', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title: 'Minimal task' }),
      });

      expect(response.status).toBe(201);
      const body = await response.json();
      expect(body.status).toBe('todo');
      expect(body.priority).toBe(3);
      expect(body.tags).toEqual([]);
    });
  });

  describe('GET /tasks', () => {
    beforeEach(async () => {
      // Seed data
      await repository.create({ title: 'Task 1', status: 'todo', priority: 5, tags: ['urgent'] });
      await repository.create({ title: 'Task 2', status: 'doing', priority: 3, tags: ['work'] });
      await repository.create({ title: 'Task 3', status: 'done', priority: 1, tags: ['work'] });
    });

    it('should list all tasks with pagination', async () => {
      const response = await app.request('api/tasks');

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.data).toHaveLength(3);
      expect(body.pagination).toMatchObject({
        page: 1,
        pageSize: 10,
        total: 3,
        totalPages: 1,
      });
    });

    it('should filter by status', async () => {
      const response = await app.request('/tasks?status=doing');

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.data).toHaveLength(1);
      expect(body.data[0].status).toBe('doing');
    });

    it('should filter by tag', async () => {
      const response = await app.request('/tasks?tag=work');

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.data).toHaveLength(2);
    });

    it('should search by title', async () => {
      const response = await app.request('/tasks?search=Task%202');

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.data).toHaveLength(1);
      expect(body.data[0].title).toBe('Task 2');
    });

    it('should sort by priority descending', async () => {
      const response = await app.request('/tasks?sortBy=priority&sortOrder=desc');

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.data[0].priority).toBe(5);
      expect(body.data[2].priority).toBe(1);
    });

    it('should paginate results', async () => {
      const response = await app.request('/tasks?page=1&pageSize=2');

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.data).toHaveLength(2);
      expect(body.pagination).toMatchObject({
        page: 1,
        pageSize: 2,
        total: 3,
        totalPages: 2,
      });
    });
  });

  describe('GET /tasks/:id', () => {
    it('should get a task by ID', async () => {
      const task = await repository.create({ title: 'Test task' });

      const response = await app.request(`/tasks/${task.id}`);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.id).toBe(task.id);
      expect(body.title).toBe('Test task');
    });

    it('should return 404 for non-existent task', async () => {
      const response = await app.request('/tasks/00000000-0000-0000-0000-000000000000');

      expect(response.status).toBe(404);
      const body = await response.json();
      expect(body.title).toBe('Resource Not Found');
    });
  });

  describe('PATCH /tasks/:id', () => {
    it('should update a task successfully', async () => {
      const task = await repository.create({ title: 'Original' });

      const response = await app.request(`/tasks/${task.id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: 'Updated',
          status: 'done',
          version: 1,
        }),
      });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.title).toBe('Updated');
      expect(body.status).toBe('done');
      expect(body.version).toBe(2);
    });

    it('should handle optimistic concurrency conflict', async () => {
      const task = await repository.create({ title: 'Original' });

      // First update succeeds
      await repository.update(task.id, { title: 'Updated Once', version: 1 });

      // Second update with stale version fails
      const response = await app.request(`/tasks/${task.id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: 'Updated Twice',
          version: 1, // Stale version
        }),
      });

      expect(response.status).toBe(409);
      const body = await response.json();
      expect(body.title).toBe('Conflict');
    });

    it('should reject update without authentication', async () => {
      const task = await repository.create({ title: 'Test' });

      const response = await app.request(`/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Updated', version: 1 }),
      });

      expect(response.status).toBe(401);
    });

    it('should return 404 for non-existent task', async () => {
      const response = await app.request('/tasks/00000000-0000-0000-0000-000000000000', {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title: 'Updated', version: 1 }),
      });

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /tasks/:id', () => {
    it('should delete a task successfully', async () => {
      const task = await repository.create({ title: 'To Delete' });

      const response = await app.request(`/tasks/${task.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${API_TOKEN}` },
      });

      expect(response.status).toBe(204);

      const exists = await repository.exists(task.id);
      expect(exists).toBe(false);
    });

    it('should reject delete without authentication', async () => {
      const task = await repository.create({ title: 'Test' });

      const response = await app.request(`/tasks/${task.id}`, {
        method: 'DELETE',
      });

      expect(response.status).toBe(401);
    });

    it('should return 404 for non-existent task', async () => {
      const response = await app.request('/tasks/00000000-0000-0000-0000-000000000000', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${API_TOKEN}` },
      });

      expect(response.status).toBe(404);
    });
  });

  describe('Health Check', () => {
    it('should return 200 for health endpoint', async () => {
      const response = await app.request('/health');

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.status).toBe('ok');
      expect(body.timestamp).toBeDefined();
    });
  });

  describe('Error Responses', () => {
    it('should return RFC 7807 problem detail for errors', async () => {
      const response = await app.request('api/tasks', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title: '' }),
      });

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body).toMatchObject({
        type: expect.stringContaining('https://api.tasktracker.com/problems/'),
        title: 'Validation Failed',
        status: 400,
      });
      expect(body.instance).toBeDefined();
    });

    it('should return 404 for unknown routes', async () => {
      const response = await app.request('/unknown');

      expect(response.status).toBe(404);
      const body = await response.json();
      expect(body.title).toBe('Not Found');
    });
  });
});
