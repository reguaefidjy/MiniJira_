# Estado de implementación — API Mini Jira v0.1

**Última actualización:** 2026-04-27

---

## Hitos

| # | Módulo | Archivos | Estado |
|---|--------|----------|--------|
| 1 | **Infraestructura base** | `app.ts`, `server.ts`, `db/index.ts` | ✅ Implementado |
| 2 | **Schema BD (Drizzle)** | `db/schema/` — 8 tablas | ✅ Implementado |
| 3 | **Middlewares** | `authenticate.ts`, `authorize.ts`, `errorHandler.ts` | ✅ Implementado |
| 4 | **Lib utilitaria** | `jwt.ts`, `oauth.ts`, `mailer.ts`, `csv.ts` | ✅ Implementado |
| 5 | **Auth** | `POST /api/auth/callback`, `GET /api/me`, `POST /api/auth/logout`, `POST /api/auth/refresh` | ✅ Implementado |
| 6 | **Tickets** | `GET/POST /api/tickets`, `GET/PATCH /api/tickets/:id`, `PATCH /:id/archive` | ✅ Implementado |
| 7 | **Comentarios** | `GET/POST /api/tickets/:id/comments`, `PATCH /api/comments/:id/archive` | ✅ Implementado |
| 8 | **Usuarios** | `GET /api/users` | ✅ Implementado |
| 9 | **Etiquetas** | `GET/POST /api/labels`, `PATCH/DELETE /api/labels/:id` | ✅ Implementado |
| 10 | **Métricas** | `GET /api/metrics`, `GET /api/metrics/export` (stream CSV) | ✅ Implementado |
| 11 | **Admin** | `POST /api/admin/users`, `PATCH /:id`, `PATCH /:id/deactivate` | ✅ Implementado |
| 12 | **Worker de notificaciones** | `notificationWorker.ts` — 3 reintentos / 5 min | ✅ Implementado |

---

## Decisiones críticas aplicadas

- JWT en cookies `httpOnly` — nunca `localStorage`
- Optimistic Locking con campo `version` en `tickets` (409 si no coincide)
- Transiciones de estado validadas en backend (422 si inválida)
- Archivado = soft delete con `archived_at`; nunca hard delete en tickets/comentarios
- Worker verifica que el comentario siga activo antes de enviar email
- Sin paginación en v1: `GET /api/tickets` devuelve todos los activos

---

## Pendiente / Próximos pasos

- [ ] Tests de integración por módulo (Vitest)
- [ ] Migraciones Drizzle en entorno de staging
- [ ] Configurar variables de entorno en producción
- [ ] Revisar límite de rate en `/api/auth/callback` (sin Redis en v1, evaluar solución mínima)
