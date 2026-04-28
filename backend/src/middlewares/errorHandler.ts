import { ErrorRequestHandler } from 'express';

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  const status: number = (err as { status?: number }).status ?? 500;
  const error: string  = (err as { code?: string }).code ?? 'internal_error';
  const message        = status === 500 ? 'An unexpected error occurred' : String(err.message ?? err);

  if (status === 500) console.error(err);

  res.status(status).json({ error, message });
};
