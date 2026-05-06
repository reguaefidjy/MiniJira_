import { Response } from 'express';

export const startCsvStream = (res: Response, filename: string): void => {
  const safeFilename = filename
    .replace(/[^\w\s.-]/g, '_')
    .replace(/\s+/g, '_')
    .slice(0, 200);

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
};

export const csvRow = (fields: (string | number | boolean | null | undefined)[]): string =>
  fields.map(f => `"${String(f ?? '').replace(/"/g, '""')}"`).join(',') + '\r\n';
