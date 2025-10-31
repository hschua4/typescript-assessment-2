import { Router, type Request, type Response, type NextFunction } from 'express';
import type { TaskService } from '../services/TaskService';
import { authenticate, validate, validateQuery } from '../middlewares';
import { TaskCreateInputSchema, TaskUpdateInputSchema, TaskFiltersSchema } from '../types/task';

export const createTaskRoutes = (taskService: TaskService): Router => {
  const router = Router();

  /**
   * POST /tasks - Create a new task
   */
  router.post(
    '/',
    authenticate,
    validate(TaskCreateInputSchema),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const task = await taskService.createTask(req.body);
        res.status(201).json(task);
      } catch (error) {
        next(error);
      }
    }
  );

  /**
   * GET /tasks - List tasks with filters
   */
  router.get(
    '/',
    validateQuery(TaskFiltersSchema),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const filters = req.query;
        const result = await taskService.getTasks(filters);
        res.status(200).json(result);
      } catch (error) {
        next(error);
      }
    }
  );

  /**
   * GET /tasks/:id - Get a single task
   */
  router.get('/:id', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const task = await taskService.getTask(req.params.id!);
      res.status(200).json(task);
    } catch (error) {
      next(error);
    }
  });

  /**
   * PATCH /tasks/:id - Update a task
   */
  router.patch(
    '/:id',
    authenticate,
    validate(TaskUpdateInputSchema),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const task = await taskService.updateTask(req.params.id!, req.body);
        res.status(200).json(task);
      } catch (error) {
        next(error);
      }
    }
  );

  /**
   * DELETE /tasks/:id - Delete a task
   */
  router.delete(
    '/:id',
    authenticate,
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        await taskService.deleteTask(req.params.id!);
        res.status(204).send();
      } catch (error) {
        next(error);
      }
    }
  );

  return router;
};
