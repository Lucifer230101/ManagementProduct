import type { Response } from 'express';
export function success<T>(res: Response, data: T, message = 'Success', status = 200) {
  return res.status(status).json({ success: true, message, data });
}
export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}