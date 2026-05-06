import path from 'path';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';

const dbUrl = process.env.DATABASE_URL ?? './minijira.db';

// Resolver ruta relativa desde la raíz del proceso para evitar ambigüedad
const resolvedUrl = dbUrl.startsWith('.')
  ? path.resolve(process.cwd(), dbUrl)
  : dbUrl;

const sqlite = new Database(resolvedUrl);

sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');

export const db = drizzle(sqlite, { schema });
export type DB = typeof db;
