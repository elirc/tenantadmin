import { ZodError } from 'zod';
import { isHttpError } from '../utils/httpError.js';

export const errorHandler = (error, _req, res, _next) => {
  if (error instanceof ZodError) {
    return res.status(400).json({
      error: 'Validation failed',
      details: error.flatten()
    });
  }

  if (isHttpError(error)) {
    return res.status(error.statusCode).json({
      error: error.message,
      details: error.details ?? null
    });
  }

  console.error(error);
  return res.status(500).json({
    error: 'Internal server error'
  });
};
