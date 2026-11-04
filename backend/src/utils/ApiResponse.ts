import type { Response } from "express";

/** Success envelope: `{ success: true, data, meta? }`. Errors use `{ success: false, error }` (error.middleware.ts). */
export interface SuccessBody<T> {
  success: true;
  data: T;
  meta?: Record<string, unknown>;
}

export function sendSuccess<T>(
  res: Response,
  data: T,
  options: { status?: number; meta?: Record<string, unknown> } = {},
) {
  const body: SuccessBody<T> = { success: true, data, ...(options.meta ? { meta: options.meta } : {}) };
  res.status(options.status ?? 200).json(body);
}

export function sendCreated<T>(res: Response, data: T) {
  sendSuccess(res, data, { status: 201 });
}

export function sendNoContent(res: Response) {
  res.status(204).end();
}
