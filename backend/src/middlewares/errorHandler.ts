import { ErrorRequestHandler } from 'express';

const SAFE_MESSAGES: Record<string, string> = {
  invalid_input:       'The provided data is invalid',
  invalid_date_range:  'The date range is invalid',
  not_found:           'Resource not found',
  conflict:            'A conflict occurred with the current state of the resource',
  version_conflict:    'The resource was modified by another user — reload and retry',
  invalid_transition:  'This state transition is not allowed',
  forbidden:           'Insufficient permissions',
  unauthorized:        'Authentication required',
  oauth_error:         'Authentication provider error',
  too_many_requests:   'Too many attempts, please try again later',
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  const status: number = (err as { status?: number }).status ?? 500;
  const error: string  = (err as { code?: string }).code ?? 'internal_error';

  const message = SAFE_MESSAGES[error]
    ?? (status === 500 ? 'An unexpected error occurred' : 'Request could not be processed');

  if (status === 500) console.error(err);

  res.status(status).json({ error, message });
};
