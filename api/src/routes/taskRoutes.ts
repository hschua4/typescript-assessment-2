import { Hono } from 'hono';
import type { Context } from 'hono';
import type { TaskService } from '../services/TaskService';
import { authenticate } from '../middlewares';
import { TaskCreateInputSchema, TaskUpdateInputSchema, TaskFiltersSchema } from '../types/task';
import { zValidator } from '@hono/zod-validator';

export const createTaskRoutes = (taskService: TaskService) => {
  const app = new Hono();

  /**
   * POST /tasks - Create a new task
   */
  app.post('/', zValidator('json', TaskCreateInputSchema), async c => {
    const body = c.req.valid('json');
    const task = await taskService.createTask(body);
    return c.json(task, 201);
  });

  /**
   * GET /tasks - List tasks with filters
   */
  app.get('/', zValidator('query', TaskFiltersSchema), async c => {
    const filters = c.req.valid('query');
    console.log({ filters });
    const result = await taskService.getTasks(filters);
    return c.json(result, 200);
  });

  /**
   * GET /tasks/:id - Get a single task
   */
  app.get('/:id', async (c: Context) => {
    const id = c.req.param('id');
    const task = await taskService.getTask(id);
    return c.json(task, 200);
  });

  /**
   * PATCH /tasks/:id - Update a task
   */
  app.patch('/:id', authenticate(), zValidator('json', TaskUpdateInputSchema), async c => {
    const id = c.req.param('id');
    const body = c.req.valid('json');
    const task = await taskService.updateTask(id, body);
    return c.json(task, 200);
  });

  /**
   * DELETE /tasks/:id - Delete a task
   */
  app.delete('/:id', authenticate(), async (c: Context) => {
    const id = c.req.param('id');
    await taskService.deleteTask(id);
    return c.body(null, 204);
  });

  return app;
};
