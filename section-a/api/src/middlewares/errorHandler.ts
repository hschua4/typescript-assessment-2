import { Hono } from 'hono';

const app = new Hono();

const customErrorHandler = async (c, next) => {
  try {
    await next();
  } catch (err) {
    if (err.name === 'ValidationError') {
      return c.json({ message: 'Validation failed', details: err.errors }, 422);
    }
    throw err; // Re-throw if not a specific error type to be caught by onError
  }
};

app.use(customErrorHandler);

app.get('/validation', c => {
  // Simulate a validation error
  const error = new Error('Validation failed');
  error.name = 'ValidationError';
  error.errors = [{ field: 'name', message: 'Name is required' }];
  throw error;
});
