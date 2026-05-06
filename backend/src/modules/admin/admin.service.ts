import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { db } from '../../db';
import { users } from '../../db/schema';
import type { UserRole } from '../../types';

function apiError(message: string, status: number, code: string): Error {
  return Object.assign(new Error(message), { status, code });
}

async function assertEmailUnique(email: string, excludeId?: string): Promise<void> {
  const rows = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email));

  const conflict = excludeId ? rows.find(r => r.id !== excludeId) : rows[0];
  if (conflict) throw apiError(`Email "${email}" is already registered`, 409, 'conflict');
}

function publicUser(user: typeof users.$inferSelect) {
  return {
    id:         user.id,
    name:       user.name,
    email:      user.email,
    role:       user.role,
    is_active:  user.is_active,
    created_at: user.created_at,
    updated_at: user.updated_at,
  };
}

export async function provisionUser(name: string, email: string, role: UserRole) {
  await assertEmailUnique(email);

  const now = new Date().toISOString();
  const id  = randomUUID();

  await db.insert(users).values({ id, name, email, role, is_active: true, created_at: now, updated_at: now });

  const [user] = await db.select().from(users).where(eq(users.id, id));
  return publicUser(user);
}

export async function updateUser(id: string, name?: string, email?: string, role?: UserRole) {
  const [current] = await db.select().from(users).where(eq(users.id, id));
  if (!current) throw apiError('User not found', 404, 'not_found');

  if (email !== undefined) await assertEmailUnique(email, id);

  const now = new Date().toISOString();
  await db
    .update(users)
    .set({
      ...(name  !== undefined && { name }),
      ...(email !== undefined && { email }),
      ...(role  !== undefined && { role }),
      updated_at: now,
    })
    .where(eq(users.id, id));

  const [updated] = await db.select().from(users).where(eq(users.id, id));
  return publicUser(updated);
}

export async function deactivateUser(id: string) {
  const [current] = await db.select().from(users).where(eq(users.id, id));
  if (!current) throw apiError('User not found', 404, 'not_found');
  if (!current.is_active) throw apiError('User is already deactivated', 409, 'conflict');

  const now = new Date().toISOString();
  await db
    .update(users)
    .set({ is_active: false, updated_at: now })
    .where(eq(users.id, id));

  const [updated] = await db.select().from(users).where(eq(users.id, id));
  return publicUser(updated);
}
