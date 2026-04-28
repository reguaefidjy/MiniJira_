import { http, HttpResponse } from 'msw'
import { db } from './db'
import type { Ticket, TicketStatus } from '@/types'

const MOCK_USER_ID = 'a1000000-0000-0000-0000-000000000001' // Laura (admin)

export const handlers = [
  // ── Auth ────────────────────────────────────────────────────────────────
  http.get('/api/me', () => {
    const user = db.users.find((u) => u.id === MOCK_USER_ID)
    return HttpResponse.json(user)
  }),

  http.post('/api/auth/callback', () => HttpResponse.json({ ok: true })),
  http.post('/api/auth/logout', () => HttpResponse.json({ ok: true })),

  // ── Users ────────────────────────────────────────────────────────────────
  http.get('/api/users', () => HttpResponse.json(db.users)),

  // ── Tickets ──────────────────────────────────────────────────────────────
  http.get('/api/tickets', ({ request }) => {
    const url = new URL(request.url)
    let tickets = db.tickets.filter((t) => t.archived_at === null)

    const statuses = url.searchParams.getAll('status') as TicketStatus[]
    if (statuses.length) tickets = tickets.filter((t) => statuses.includes(t.status))

    const priorities = url.searchParams.getAll('priority')
    if (priorities.length) tickets = tickets.filter((t) => priorities.includes(t.priority))

    const assigneeId = url.searchParams.get('assignee_id')
    if (assigneeId) {
      tickets = tickets.filter((t) => t.assignees.some((a) => a.id === assigneeId))
    }

    const labels = url.searchParams.getAll('label')
    if (labels.length) {
      tickets = tickets.filter((t) => labels.every((l) => t.labels.includes(l)))
    }

    return HttpResponse.json(tickets)
  }),

  http.get('/api/tickets/:id', ({ params }) => {
    const ticket = db.tickets.find((t) => t.id === params.id)
    if (!ticket) return HttpResponse.json({ error: 'Not found' }, { status: 404 })
    return HttpResponse.json(ticket)
  }),

  http.post('/api/tickets', async ({ request }) => {
    const body = await request.json() as Partial<Ticket>
    const user = db.users.find((u) => u.id === MOCK_USER_ID)!
    const nextNum = db.tickets.length + 1
    const newTicket: Ticket = {
      id: crypto.randomUUID(),
      short_id: `ALPHA-${nextNum}`,
      comment_count: 0,
      title: body.title ?? '',
      description: body.description ?? null,
      status: 'todo',
      priority: body.priority ?? 'medium',
      is_blocked: false,
      version: 1,
      created_by: MOCK_USER_ID,
      created_by_user: user,
      archived_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      assignees: db.users.filter((u) =>
        (body.assignees as unknown as string[] ?? []).includes(u.id),
      ),
      labels: (body.labels as unknown as string[]) ?? [],
    }
    db.tickets.push(newTicket)
    return HttpResponse.json(newTicket, { status: 201 })
  }),

  http.patch('/api/tickets/:id', async ({ params, request }) => {
    const body = await request.json() as Record<string, unknown>
    const idx = db.tickets.findIndex((t) => t.id === params.id)
    if (idx === -1) return HttpResponse.json({ error: 'Not found' }, { status: 404 })

    const ticket = db.tickets[idx]

    // Simulate optimistic locking — 10% chance of 409 to demo the conflict UI
    if (typeof body.version === 'number' && body.version !== ticket.version) {
      return HttpResponse.json({ error: 'Conflict' }, { status: 409 })
    }

    const updated: Ticket = {
      ...ticket,
      ...(body as Partial<Ticket>),
      version: ticket.version + 1,
      updated_at: new Date().toISOString(),
    }
    db.tickets[idx] = updated
    return HttpResponse.json(updated)
  }),

  http.patch('/api/tickets/:id/archive', ({ params }) => {
    const idx = db.tickets.findIndex((t) => t.id === params.id)
    if (idx === -1) return HttpResponse.json({ error: 'Not found' }, { status: 404 })
    db.tickets[idx] = { ...db.tickets[idx], archived_at: new Date().toISOString() }
    return HttpResponse.json({ ok: true })
  }),

  // ── Comments ─────────────────────────────────────────────────────────────
  http.get('/api/tickets/:id/comments', ({ params }) => {
    const comments = db.comments.filter((c) => c.ticket_id === params.id)
    return HttpResponse.json(comments)
  }),

  http.post('/api/tickets/:id/comments', async ({ params, request }) => {
    const body = await request.json() as { body: string }
    const author = db.users.find((u) => u.id === MOCK_USER_ID)!
    const comment = {
      id: crypto.randomUUID(),
      ticket_id: params.id as string,
      author_id: MOCK_USER_ID,
      author,
      body: body.body,
      archived_at: null,
      created_at: new Date().toISOString(),
    }
    db.comments.push(comment)
    return HttpResponse.json(comment, { status: 201 })
  }),

  http.patch('/api/comments/:id/archive', ({ params }) => {
    const idx = db.comments.findIndex((c) => c.id === params.id)
    if (idx === -1) return HttpResponse.json({ error: 'Not found' }, { status: 404 })
    db.comments[idx] = { ...db.comments[idx], archived_at: new Date().toISOString() }
    return HttpResponse.json({ ok: true })
  }),

  // ── Metrics ──────────────────────────────────────────────────────────────
  http.get('/api/metrics', () => {
    const active = db.tickets.filter((t) => t.archived_at === null)
    const byStatus = { todo: 0, in_progress: 0, review: 0, done: 0 }
    active.forEach((t) => { byStatus[t.status]++ })

    const byMember = db.users.map((user) => ({
      user,
      active_count: active.filter((t) =>
        t.assignees.some((a) => a.id === user.id),
      ).length,
    }))

    const closedByMonth = [
      { month: '2026-03', count: 2 },
      { month: '2026-04', count: 1 },
    ]

    return HttpResponse.json({
      tickets_by_status: byStatus,
      tickets_closed_by_month: closedByMonth,
      tickets_by_member: byMember,
      total: active.length,
    })
  }),

  http.get('/api/metrics/export', () => {
    const csv = [
      'ticket_id,title,status,priority,assignees,labels,created_by,created_at,closed_at,archived',
      ...db.tickets.map((t) =>
        [
          t.id,
          `"${t.title}"`,
          t.status,
          t.priority,
          t.assignees.map((a) => a.name).join(';'),
          t.labels.join(';'),
          t.created_by_user.name,
          t.created_at,
          t.status === 'done' ? t.updated_at : '',
          t.archived_at ? 'true' : 'false',
        ].join(','),
      ),
    ].join('\n')

    return new HttpResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="minijira-metrics-2026-04.csv"',
      },
    })
  }),
]
