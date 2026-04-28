import { Response } from 'express';

// TODO: implement streaming CSV row-by-row (RFC 4180)
export const startCsvStream = (res: Response, filename: string): void => {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
};

export const csvRow = (fields: string[]): string =>
  fields.map(f => `"${String(f ?? '').replace(/"/g, '""')}"`).join(',') + '\r\n';
