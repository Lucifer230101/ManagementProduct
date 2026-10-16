import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { HttpError } from '../utils/http';

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof ZodError) {
    res.status(400).json({ success: false, message: 'Validation failed', errors: error.flatten() });
    return;
  }
  if (error instanceof HttpError) {
    res.status(error.status).json({ success: false, message: error.message });
    return;
  }
  if ((error as { code?: string }).code === '23505') {
    res.status(409).json({ success: false, message: 'A record with these details already exists.' });
    return;
  }
  console.error(error);
  res.status(500).json({ success: false, message: 'Internal server error' });
};