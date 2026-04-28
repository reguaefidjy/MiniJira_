# Backend Specs — Mini Jira v0.1

**Fecha:** 2026-04-27
**Basado en:** specs.md, frontend-specs.md, backlog.md, DESIGN.md, mermaid_design.md
**Estado:** Aprobado por arquitecto

---

## 1. Stack y Versiones

| Capa | Tecnología | Versión |
|---|---|---|
| Runtime | Node.js | 20 LTS |
| Framework | Express | 5.x |
| Lenguaje | TypeScript | 5.x |
| ORM | Drizzle ORM | latest |
| Base de datos | SQLite | 3.x |
| Autenticación | OAuth 2.0 + JWT | — |
| Email | Resend | latest |
| Gestor de paquetes | pnpm | 9.x |

> Redis queda fuera de v1. No hay caché externa ni rate limiting por Redis.

---

## 2. Decisiones de Arquitectura

| Decisión | Detalle |
|---|---|
| ORM | Drizzle ORM (reemplaza Prisma del PRD original) |
| Base de datos | SQLite (portabilidad; archivo único) |
| UUID | Generados en aplicación, almacenados como `TEXT` |
| Enums | `TEXT` con `CHECK` constraints en SQLite |
| Booleanos | `INTEGER` (0 = false, 1 = true) |
| Timestamps | `TEXT` en formato ISO 8601 UTC |
| Foreign keys | Activadas con `PRAGMA foreign_keys = ON` al iniciar conexión |
| Tokens JWT | Access token + Refresh token en cookies `httpOnly`; refresh tokens persistidos en tabla `refresh_tokens` |
| Notificaciones | Tabla `notification_queue` con worker que procesa jobs; 3 reintentos cada 5 minutos |
| Labels | Catálogo centralizado (`labels`) + tabla junction `ticket_labels` |
| Paginación | Sin paginación en v1; `GET /api/tickets` devuelve todos los tickets activos |
| Aprovisionamiento | Admin crea/edita/desactiva usuarios vía API |
| Avatares | Solo iniciales del nombre; sin `avatar_url` |
| Concurrencia | Optimistic Locking mediante campo `version` (integer) en `tickets` |

---

## 3. Estructura de Carpetas

```
backend/
├── src/
│   ├── db/
│   │   ├── index.ts              # conexión SQLite + PRAGMA foreign_keys
│   │   └── schema/
│   │       ├── users.ts
│   │       ├── tickets.ts
│   │       ├── comments.ts
│   │       ├── labels.ts
│   │       ├── ticketAssignees.ts
│   │       ├── ticketLabels.ts
│   │       ├── refreshTokens.ts
│   │       └── notificationQueue.ts
│   │
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── auth.router.ts
│   │   │   ├── auth.controller.ts
│   │   │   └── auth.service.ts
│   │   ├── tickets/
│   │   │   ├── tickets.router.ts
│   │   │   ├── tickets.controller.ts
│   │   │   └── tickets.service.ts
│   │   ├── comments/
│   │   │   ├── comments.router.ts
│   │   │   ├── comments.controller.ts
│   │   │   └── comments.service.ts
│   │   ├── users/
│   │   │   ├── users.router.ts
│   │   │   ├── users.controller.ts
│   │   │   └── users.service.ts
│   │   ├── labels/
│   │   │   ├── labels.router.ts
│   │   │   ├── labels.controller.ts
│   │   │   └── labels.service.ts
│   │   ├── metrics/
│   │   │   ├── metrics.router.ts
│   │   │   ├── metrics.controller.ts
│   │   │   └── metrics.service.ts
│   │   └── admin/
│   │       ├── admin.router.ts
│   │       ├── admin.controller.ts
│   │       └── admin.service.ts
│   │
│   ├── workers/
│   │   └── notificationWorker.ts # procesa notification_queue; 3 reintentos / 5 min
│   │
│   ├── middlewares/
│   │   ├── authenticate.ts       # verifica JWT en cookie httpOnly
│   │   ├── authorize.ts          # verifica rol (admin / member)
│   │   └── errorHandler.ts
│   │
│   ├── lib/
│   │   ├── jwt.ts                # sign / verify access + refresh tokens
│   │   ├── oauth.ts              # intercambio de code → tokens con proveedor
│   │   ├── mailer.ts             # wrapper sobre Resend SDK
│   │   └── csv.ts                # streaming CSV fila a fila (RFC 4180)
│   │
│   ├── types/
│   │   └── index.ts              # tipos compartidos
│   │
│   └── app.ts                    # Express app; registra routers y middlewares
│
├── drizzle/
│   └── migrations/               # archivos generados por drizzle-kit
│
├── drizzle.config.ts
├── .env
└── package.json
```

---

## 4. Endpoints

### 4.1 Autenticación — `/api/auth`

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| `POST` | `/api/auth/callback` | Público | Recibe `{ code }` del proveedor OAuth; intercambia por identity token; setea cookies `httpOnly` con access y refresh tokens |
| `GET` | `/api/me` | Autenticado | Devuelve el usuario autenticado decodificado del JWT |
| `POST` | `/api/auth/logout` | Autenticado | Invalida el refresh token en `refresh_tokens` y limpia las cookies |

**Request `POST /api/auth/callback`:**
```json
{ "code": "string" }
```

**Response `GET /api/me`:**
```json
{
  "id": "uuid",
  "name": "string",
  "email": "string",
  "role": "admin | member",
  "created_at": "ISO 8601",
  "updated_at": "ISO 8601"
}
```

---

### 4.2 Tickets — `/api/tickets`

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| `GET` | `/api/tickets` | Autenticado | Lista todos los tickets activos (no archivados) con filtros opcionales |
| `POST` | `/api/tickets` | Autenticado | Crea un ticket nuevo |
| `GET` | `/api/tickets/:id` | Autenticado | Devuelve un ticket con assignees, labels y creador expandidos |
| `PATCH` | `/api/tickets/:id` | Autenticado | Edita campos del ticket; valida `version` para Optimistic Locking |
| `PATCH` | `/api/tickets/:id/archive` | Autenticado | Soft delete: setea `archived_at`; solo el creador o un admin |

**Query params `GET /api/tickets`:**

| Parámetro | Tipo | Descripción |
|---|---|---|
| `status` | `string[]` | Filtro por uno o varios estados |
| `priority` | `string[]` | Filtro por prioridad |
| `assignee_id` | `uuid` | Filtro por asignado |
| `label_id` | `uuid` | Filtro por etiqueta |
| `created_at_from` | `YYYY-MM-DD` | Rango inicio |
| `created_at_to` | `YYYY-MM-DD` | Rango fin |

**Request `POST /api/tickets`:**
```json
{
  "title": "string (max 120)",
  "description": "string | null",
  "priority": "low | medium | high",
  "status": "todo | in_progress | review | done",
  "is_blocked": false,
  "assignee_ids": ["uuid"],
  "label_ids": ["uuid"]
}
```

**Request `PATCH /api/tickets/:id`:**
```json
{
  "title": "string?",
  "description": "string?",
  "priority": "string?",
  "status": "string?",
  "is_blocked": "boolean?",
  "assignee_ids": ["uuid?"],
  "label_ids": ["uuid?"],
  "version": "number (requerido para Optimistic Locking)"
}
```

**Errores específicos:**

| Código | Situación |
|---|---|
| `409 Conflict` | El `version` enviado no coincide con el de la BD |
| `403 Forbidden` | Member intenta editar/archivar ticket ajeno |

---

### 4.3 Comentarios — `/api/tickets/:id/comments`

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| `GET` | `/api/tickets/:id/comments` | Autenticado | Lista comentarios activos del ticket |
| `POST` | `/api/tickets/:id/comments` | Autenticado | Crea un comentario; encola notificaciones por email |
| `PATCH` | `/api/comments/:id/archive` | Autenticado | Soft delete del comentario; solo el autor o un admin |

**Request `POST /api/tickets/:id/comments`:**
```json
{ "body": "string (texto plano, menciones con @handle)" }
```

**Lógica de notificaciones al crear comentario:**
1. Identificar destinatarios: creador del ticket + asignados + usuarios mencionados con `@handle`.
2. Deduplicar y excluir al autor del comentario.
3. Insertar un job en `notification_queue` por cada destinatario con `status = 'pending'`.
4. El worker verifica que el comentario siga activo (`archived_at IS NULL`) antes de llamar a Resend.

---

### 4.4 Usuarios — `/api/users`

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| `GET` | `/api/users` | Autenticado | Lista usuarios activos (aprovisionados); usado para selector de asignados y @mention |

**Response:**
```json
[
  { "id": "uuid", "name": "string", "email": "string", "role": "string" }
]
```

---

### 4.5 Etiquetas — `/api/labels`

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| `GET` | `/api/labels` | Autenticado | Lista el catálogo completo de etiquetas |
| `POST` | `/api/labels` | Admin | Crea una etiqueta nueva |
| `PATCH` | `/api/labels/:id` | Admin | Edita nombre o color |
| `DELETE` | `/api/labels/:id` | Admin | Elimina etiqueta (hard delete; cascade en `ticket_labels`) |

**Request `POST /api/labels`:**
```json
{ "name": "string", "color": "#hex" }
```

---

### 4.6 Métricas — `/api/metrics`

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| `GET` | `/api/metrics` | Autenticado | Snapshot de métricas calculadas en tiempo real |
| `GET` | `/api/metrics/export` | Autenticado | Stream CSV (RFC 4180) con filtros aplicados |

**Query params `GET /api/metrics`:**

| Parámetro | Tipo | Default |
|---|---|---|
| `from` | `YYYY-MM-DD` | Primer día del mes actual |
| `to` | `YYYY-MM-DD` | Hoy |
| `status` | `string[]` | Todos |
| `assignee_id` | `uuid` | Todos |

**Response `GET /api/metrics`:**
```json
{
  "tickets_by_status": { "todo": 0, "in_progress": 0, "review": 0, "done": 0 },
  "tickets_closed_by_month": [{ "month": "YYYY-MM", "count": 0 }],
  "tickets_by_member": [{ "user": {}, "active_count": 0 }],
  "total": 0
}
```

**`GET /api/metrics/export`:**
- Mismos query params que `GET /api/metrics`
- Respuesta: stream `text/csv; charset=utf-8`
- Header: `Content-Disposition: attachment; filename="minijira-metrics-YYYY-MM.csv"`
- Streaming fila a fila con `res.write()` (sin acumular en heap)
- Errores: `400` si `from > to`, `401` si token inválido

---

### 4.7 Administración — `/api/admin`

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| `POST` | `/api/admin/users` | Admin | Aprovisiona un usuario nuevo |
| `PATCH` | `/api/admin/users/:id` | Admin | Edita nombre, email o rol |
| `PATCH` | `/api/admin/users/:id/deactivate` | Admin | Desactiva el usuario (soft delete: `is_active = 0`) |

**Request `POST /api/admin/users`:**
```json
{
  "name": "string",
  "email": "string",
  "role": "admin | member"
}
```

---

## 5. Reglas de Negocio

### 5.1 Matriz de Permisos

| Acción | member (propio) | member (ajeno) | admin |
|---|---|---|---|
| Crear ticket | ✅ | — | ✅ |
| Ver ticket activo | ✅ | ✅ | ✅ |
| Editar ticket | ✅ | ❌ `403` | ✅ |
| Cambiar estado | ✅ | ❌ `403` | ✅ |
| Archivar ticket | ✅ | ❌ `403` | ✅ |
| Ver tickets archivados | ❌ | ❌ | ✅ |
| Borrar comentario propio | ✅ | — | ✅ |
| Borrar comentario ajeno | ❌ `403` | ❌ `403` | ✅ |
| Gestionar usuarios | ❌ | ❌ | ✅ |
| Gestionar etiquetas | ❌ | ❌ | ✅ |

### 5.2 Optimistic Locking

1. Todo `PATCH /api/tickets/:id` debe incluir el campo `version`.
2. El backend compara el `version` recibido con el almacenado.
3. Si no coinciden → `409 Conflict` con body `{ "error": "version_conflict" }`.
4. Si coinciden → se aplica el UPDATE y se incrementa `version` en 1.

### 5.3 "Eliminar" = Archivar

- El campo `archived_at` se setea a la timestamp actual.
- Los tickets archivados no aparecen en `GET /api/tickets` (solo admin puede verlos en una query explícita).
- Los tickets archivados sí cuentan en el cómputo histórico de métricas.
- Los comentarios archivados no se devuelven en `GET /api/tickets/:id/comments`.

### 5.4 Cola de Notificaciones

- Worker corre en intervalo configurable (recomendado: cada 30 segundos).
- Antes de llamar a Resend, verifica `archived_at IS NULL` en el comentario origen.
- Si el comentario está archivado → job pasa a `failed` silenciosamente (sin error).
- Máximo 3 reintentos con 5 minutos de espera entre intentos.
- Campo `next_attempt_at` controla cuándo el worker puede procesar el job de nuevo.

### 5.5 Transiciones de Estado Válidas

| Estado actual | Destinos permitidos |
|---|---|
| `todo` | `in_progress` |
| `in_progress` | `todo`, `review` |
| `review` | `in_progress`, `done` |
| `done` | `review` (solo admin) |

El backend valida la transición y devuelve `422 Unprocessable Entity` si no es válida.

---

## 6. Autenticación y Sesión

- Flujo: OAuth 2.0 Authorization Code.
- El backend intercambia el `code` con el proveedor y obtiene el identity token.
- Se emiten dos tokens propios:
  - **Access token** (JWT, corta duración: 15 min) → cookie `httpOnly`, `Secure`, `SameSite=Strict`
  - **Refresh token** (opaco, larga duración: 7 días) → cookie `httpOnly`; persistido en tabla `refresh_tokens`
- En cada request autenticado, el middleware verifica el access token.
- Si el access token expiró, el cliente usa el refresh token para obtener uno nuevo (`POST /api/auth/refresh`).
- En logout: el refresh token se elimina de `refresh_tokens` y ambas cookies se limpian.
- El token nunca se expone en `localStorage` ni en el body de respuestas.

| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/api/auth/refresh` | Emite un nuevo access token usando el refresh token de la cookie |

---

## 7. Errores Estándar

Todas las respuestas de error siguen el mismo contrato:

```json
{
  "error": "snake_case_code",
  "message": "Descripción legible"
}
```

| Código HTTP | `error` | Situación |
|---|---|---|
| `400` | `invalid_input` | Validación fallida (body, query params) |
| `400` | `invalid_date_range` | `from > to` en export |
| `401` | `unauthorized` | Token ausente o expirado |
| `403` | `forbidden` | Rol insuficiente o recurso ajeno |
| `404` | `not_found` | Recurso no existe |
| `409` | `version_conflict` | Optimistic Locking falla |
| `422` | `invalid_transition` | Transición de estado no permitida |
| `500` | `internal_error` | Error inesperado (mensaje genérico al cliente) |

---

## 8. Variables de Entorno

```env
NODE_ENV=development
PORT=3000
DATABASE_URL=./minijira.db
JWT_ACCESS_SECRET=...
JWT_REFRESH_SECRET=...
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
OAUTH_CLIENT_ID=...
OAUTH_CLIENT_SECRET=...
OAUTH_CALLBACK_URL=http://localhost:3000/api/auth/callback
RESEND_API_KEY=...
NOTIFICATION_FROM_EMAIL=noreply@example.com
WORKER_INTERVAL_MS=30000
```
