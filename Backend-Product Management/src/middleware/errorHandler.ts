import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { HttpError } from '../utils/http';
import { env } from '../config/env';

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof ZodError) {
    res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: error.flatten()
    });
    return;
  }

  if (error instanceof HttpError) {
    res.status(error.status).json({
      success: false,
      message: error.message
    });
    return;
  }

  const pgError = error as { code?: string; detail?: string };
  // Unique constraint violation
  if (pgError.code === '23505') {
    res.status(409).json({
      success: false,
      message: 'A record with these details already exists.'
    });
    return;
  }

  // Foreign key constraint violation
  if (pgError.code === '23503') {
    res.status(400).json({
      success: false,
      message: 'Referenced entity does not exist or cannot be modified due to dependent records.'
    });
    return;
  }

  // Invalid data type / UUID syntax
  if (pgError.code === '22P02') {
    res.status(400).json({
      success: false,
      message: 'Invalid input syntax for parameter (e.g. invalid UUID format).'
    });
    return;
  }

  // Check constraint violation
  if (pgError.code === '23514') {
    res.status(400).json({
      success: false,
      message: 'Value violates data integrity constraints.'
    });
    return;
  }

  if (env.NODE_ENV !== 'test') {
    console.error('Unhandled Server Error:', error);
  }

  res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
};