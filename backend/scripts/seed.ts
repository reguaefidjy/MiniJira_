import path from 'path'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { eq } from 'drizzle-orm'
import { randomUUID } from 'crypto'
import * as schema from '../src/db/schema'

const dbUrl = process.env.DATABASE_URL ?? './minijira.db'
const resolvedUrl = dbUrl.startsWith('.') ? path.resolve(process.cwd(), dbUrl) : dbUrl

const sqlite = new Database(resolvedUrl)
sqlite.pragma('journal_mode = WAL')
sqlite.pragma('foreign_keys = ON')
const db = drizzle(sqlite, { schema })

// ── Datos de seed ────────────────────────────────────────────────

const USERS = [
  { id: 'a1000000-0000-0000-0000-000000000001', name: 'test',            email: 'test@minijira.dev',          role: 'admin'  as const },
  { id: 'a1000000-0000-0000-0000-000000000002', name: 'Laura García',    email: 'laura.garcia@empresa.com',   role: 'admin'  as const },
  { id: 'a1000000-0000-0000-0000-000000000003', name: 'Marcos Rodríguez',email: 'marcos.rodriguez@empresa.com',role: 'member' as const },
  { id: 'a1000000-0000-0000-0000-000000000004', name: 'Sofía Martínez',  email: 'sofia.martinez@empresa.com', role: 'member' as const },
]

const LABELS = [
  { id: randomUUID(), name: 'auth',        color: '#005bbf' },
  { id: randomUUID(), name: 'backend',     color: '#0050a8' },
  { id: randomUUID(), name: 'frontend',    color: '#69f6b8' },
  { id: randomUUID(), name: 'ui',          color: '#d7e2ff' },
  { id: randomUUID(), name: 'api',         color: '#acb3b8' },
  { id: randomUUID(), name: 'concurrencia',color: '#fe8983' },
  { id: randomUUID(), name: 'métricas',    color: '#003d84' },
]

// Tickets: [creatorIndex, status, priority, is_blocked, title, description, assigneeIndexes, labelNames]
const TICKETS: Array<{
  id: string
  title: string
  description: string
  status: 'todo' | 'in_progress' | 'review' | 'done'
  priority: 'low' | 'medium' | 'high'
  is_blocked: boolean
  version: number
  creatorId: string
  assigneeIds: string[]
  labelNames: string[]
  created_at: string
  updated_at: string
}> = [
  {
    id: 'b2000000-0000-0000-0000-000000000001',
    title: 'Configurar autenticación OAuth 2.0',
    description: 'Integrar Google Workspace como proveedor OAuth. Registrar la app, configurar redirect URIs y validar el flujo Authorization Code con JWT de acceso y refresco.',
    status: 'todo',
    priority: 'high',
    is_blocked: false,
    version: 1,
    creatorId: USERS[1].id,
    assigneeIds: [USERS[2].id],
    labelNames: ['auth', 'backend'],
    created_at: '2026-04-10T10:00:00Z',
    updated_at: '2026-04-10T10:00:00Z',
  },
  {
    id: 'b2000000-0000-0000-0000-000000000002',
    title: 'Implementar tablero Kanban con drag-and-drop',
    description: 'Crear las 4 columnas (Por hacer, En progreso, Review, Listo) con tarjetas arrastrables. El badge Bloqueado debe coexistir con cualquier columna sin ocupar una propia.',
    status: 'in_progress',
    priority: 'high',
    is_blocked: false,
    version: 3,
    creatorId: USERS[2].id,
    assigneeIds: [USERS[2].id, USERS[3].id],
    labelNames: ['frontend', 'ui'],
    created_at: '2026-04-11T08:30:00Z',
    updated_at: '2026-04-14T16:00:00Z',
  },
  {
    id: 'b2000000-0000-0000-0000-000000000003',
    title: 'Crear endpoint PATCH /api/tickets/:id',
    description: 'Incluir validación de version para Optimistic Locking. Devolver 409 si la versión del cliente no coincide con la de la BD.',
    status: 'in_progress',
    priority: 'high',
    is_blocked: true,
    version: 2,
    creatorId: USERS[2].id,
    assigneeIds: [USERS[2].id],
    labelNames: ['backend', 'api', 'concurrencia'],
    created_at: '2026-04-12T09:00:00Z',
    updated_at: '2026-04-15T11:30:00Z',
  },
  {
    id: 'b2000000-0000-0000-0000-000000000004',
    title: 'Diseñar dashboard de métricas',
    description: 'Mostrar: tickets cerrados por mes, tickets por estado (snapshot), tickets por miembro. Calculados en tiempo real sin tabla de hechos separada.',
    status: 'review',
    priority: 'medium',
    is_blocked: false,
    version: 4,
    creatorId: USERS[3].id,
    assigneeIds: [USERS[3].id],
    labelNames: ['frontend', 'métricas'],
    created_at: '2026-04-13T10:15:00Z',
    updated_at: '2026-04-17T09:45:00Z',
  },
  {
    id: 'b2000000-0000-0000-0000-000000000005',
    title: 'Exportación de métricas a CSV',
    description: 'Endpoint GET /api/metrics/export con streaming fila a fila. Soportar filtros: rango de fechas, estado y asignado. Cumplir RFC 4180.',
    status: 'done',
    priority: 'medium',
    is_blocked: false,
    version: 5,
    creatorId: USERS[1].id,
    assigneeIds: [USERS[3].id],
    labelNames: ['backend', 'métricas'],
    created_at: '2026-04-14T11:00:00Z',
    updated_at: '2026-04-18T17:00:00Z',
  },
]

// ── Helpers ──────────────────────────────────────────────────────

async function upsertUser(u: typeof USERS[0]) {
  const [existing] = await db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.email, u.email))
  if (existing) {
    console.log(`  · usuario ya existe: ${u.name} <${u.email}>`)
    return
  }
  const now = new Date().toISOString()
  await db.insert(schema.users).values({ ...u, is_active: true, created_at: now, updated_at: now })
  console.log(`  ✓ usuario creado: ${u.name} <${u.email}> (${u.role})`)
}

async function upsertLabel(l: typeof LABELS[0]): Promise<string> {
  const [existing] = await db.select({ id: schema.labels.id }).from(schema.labels).where(eq(schema.labels.name, l.name))
  if (existing) return existing.id
  const now = new Date().toISOString()
  await db.insert(schema.labels).values({ ...l, created_at: now, updated_at: now })
  return l.id
}

async function upsertTicket(t: typeof TICKETS[0], labelMap: Record<string, string>) {
  const [existing] = await db.select({ id: schema.tickets.id }).from(schema.tickets).where(eq(schema.tickets.id, t.id))
  if (existing) {
    console.log(`  · ticket ya existe: ${t.title.slice(0, 40)}…`)
    return
  }

  await db.insert(schema.tickets).values({
    id: t.id,
    title: t.title,
    description: t.description,
    status: t.status,
    priority: t.priority,
    is_blocked: t.is_blocked,
    version: t.version,
    created_by: t.creatorId,
    archived_at: null,
    created_at: t.created_at,
    updated_at: t.updated_at,
  })

  for (const userId of t.assigneeIds) {
    await db.insert(schema.ticketAssignees).values({ ticket_id: t.id, user_id: userId }).catch(() => {})
  }

  for (const labelName of t.labelNames) {
    const labelId = labelMap[labelName]
    if (labelId) {
      await db.insert(schema.ticketLabels).values({ ticket_id: t.id, label_id: labelId }).catch(() => {})
    }
  }

  console.log(`  ✓ ticket: [${t.status}] ${t.title.slice(0, 50)}`)
}

// ── Main ─────────────────────────────────────────────────────────

async function seed() {
  console.log('\n── Usuarios ──────────────────────────────────────────')
  for (const u of USERS) await upsertUser(u)

  console.log('\n── Labels ────────────────────────────────────────────')
  const labelMap: Record<string, string> = {}
  for (const l of LABELS) {
    labelMap[l.name] = await upsertLabel(l)
    console.log(`  ✓ label: ${l.name}`)
  }

  console.log('\n── Tickets ───────────────────────────────────────────')
  for (const t of TICKETS) await upsertTicket(t, labelMap)

  console.log('\n✓ Seed completado.\n')
  sqlite.close()
}

seed().catch((err) => {
  console.error(err)
  process.exit(1)
})
