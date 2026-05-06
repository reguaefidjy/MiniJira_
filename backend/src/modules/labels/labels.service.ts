import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { db } from '../../db';
import { labels } from '../../db/schema';

function apiError(message: string, status: number, code: string): Error {
  return Object.assign(new Error(message), { status, code });
}

async function assertNameUnique(name: string, excludeId?: string): Promise<void> {
  const rows = await db
    .select({ id: labels.id })
    .from(labels)
    .where(eq(labels.name, name));

  const conflict = excludeId ? rows.find(r => r.id !== excludeId) : rows[0];
  if (conflict) throw apiError(`Label name "${name}" is already in use`, 409, 'conflict');
}

export async function listLabels() {
  return db
    .select()
    .from(labels)
    .orderBy(labels.name);
}

export async function createLabel(name: string, color: string) {
  await assertNameUnique(name);

  const now = new Date().toISOString();
  const id  = randomUUID();

  await db.insert(labels).values({ id, name, color, created_at: now, updated_at: now });

  const [label] = await db.select().from(labels).where(eq(labels.id, id));
  return label;
}

export async function updateLabel(id: string, name?: string, color?: string) {
  const [current] = await db.select().from(labels).where(eq(labels.id, id));
  if (!current) throw apiError('Label not found', 404, 'not_found');

  if (name !== undefined) await assertNameUnique(name, id);

  const now = new Date().toISOString();
  await db
    .update(labels)
    .set({
      ...(name  !== undefined && { name }),
      ...(color !== undefined && { color }),
      updated_at: now,
    })
    .where(eq(labels.id, id));

  const [updated] = await db.select().from(labels).where(eq(labels.id, id));
  return updated;
}

export async function deleteLabel(id: string) {
  const [current] = await db.select({ id: labels.id }).from(labels).where(eq(labels.id, id));
  if (!current) throw apiError('Label not found', 404, 'not_found');

  // ticket_labels se elimina en cascada por FK
  await db.delete(labels).where(eq(labels.id, id));
}
