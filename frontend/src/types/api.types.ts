/** Wire format shared by every API endpoint (see docs/03_API_SPECIFICATION.md). */

export interface ApiSuccess<T> {
  success: true;
  data: T;
  meta?: Record<string, unknown>;
}

export interface ApiErrorBody {
  success: false;
  error: { code: string; message: string; details?: { path: string; message: string }[]; requestId?: string };
}

export interface Page<T> {
  items: T[];
  nextCursor: string | null;
}
