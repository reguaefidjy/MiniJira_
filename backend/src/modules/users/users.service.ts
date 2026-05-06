import { eq } from 'drizzle-orm';
import { db } from '../../db';
import { users } from '../../db/schema';

export async function listUsers() {
  return db
    .select({
      id:    users.id,
      name:  users.name,
      email: users.email,
      role:  users.role,
    })
    .from(users)
    .where(eq(users.is_active, true))
    .orderBy(users.name);
}
