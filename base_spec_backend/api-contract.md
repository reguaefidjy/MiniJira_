# API Contract — Mini Jira v0.1

**Audiencia:** equipo frontend  
**Base URL:** `http://localhost:3000`  
**Fecha:** 2026-04-27

---

## Convenciones globales

| Aspecto | Detalle |
|---|---|
| Formato | JSON (`Content-Type: application/json`) en todas las rutas salvo el export CSV |
| Autenticación | Cookie `httpOnly` con JWT; el navegador la envía automáticamente — **no** usar `Authorization` header |
| IDs | UUID v4 como `string` |
| Timestamps | ISO 8601 UTC — `"2026-04-27T14:30:00.000Z"` |
| Errores | Ver §Errores estándar |

---

## Autenticación y sesión

### `POST /api/auth/callback`
Recibe el código OAuth del proveedor y establece las cookies de sesión.

**Acceso:** público

**Request:**
```json
{ "code": "string" }
```

**Response `200`:**
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

Las cookies `access_token` y `refresh_token` quedan seteadas automáticamente (`httpOnly`, `SameSite=Strict`).

---

### `GET /api/me`
Devuelve el usuario autenticado actual.

**Acceso:** autenticado

**Response `200`:**
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

### `POST /api/auth/refresh`
Renueva el access token usando el refresh token de la cookie.

**Acceso:** público (lleva la cookie de refresh)

**Request:** sin body

**Response `200`:** sin body — solo renueva la cookie `access_token`

---

### `POST /api/auth/logout`
Invalida la sesión y limpia las cookies.

**Acceso:** autenticado

**Request:** sin body

**Response `200`:** sin body

---

## Tickets

### Tipos compartidos

```ts
type TicketStatus   = 'todo' | 'in_progress' | 'review' | 'done'
type TicketPriority = 'low' | 'medium' | 'high'

interface TicketUser  { id: string; name: string; email: string; role: string }
interface TicketLabel { id: string; name: string; color: string }          // color = hex "#005bbf"

interface Ticket {
  id:          string
  title:       string
  description: string | null
  status:      TicketStatus
  priority:    TicketPriority
  is_blocked:  boolean
  version:     number          // requerido en PATCH para Optimistic Locking
  archived_at: string | null
  created_at:  string
  updated_at:  string
  creator:     TicketUser
  assignees:   TicketUser[]
  labels:      TicketLabel[]
}
```

---

### `GET /api/tickets`
Lista todos los tickets activos (no archivados).

**Acceso:** autenticado

**Query params** (todos opcionales, combinables):

| Parámetro | Tipo | Ejemplo |
|---|---|---|
| `status` | `string \| string[]` | `?status=todo&status=review` o `?status=todo,review` |
| `priority` | `string \| string[]` | `?priority=high` |
| `assignee_id` | `uuid` | `?assignee_id=abc-123` |
| `label_id` | `uuid` | `?label_id=xyz-456` |
| `created_at_from` | `YYYY-MM-DD` | `?created_at_from=2026-04-01` |
| `created_at_to` | `YYYY-MM-DD` | `?created_at_to=2026-04-27` |

**Response `200`:** `Ticket[]`

---

### `POST /api/tickets`
Crea un ticket nuevo. El campo `created_by` se toma del JWT.

**Acceso:** autenticado

**Request:**
```json
{
  "title":        "string (requerido, max 120 chars)",
  "description":  "string | null (opcional)",
  "priority":     "low | medium | high (requerido)",
  "status":       "todo | in_progress | review | done (opcional, default: todo)",
  "is_blocked":   false,
  "assignee_ids": ["uuid"],
  "label_ids":    ["uuid"]
}
```

**Response `201`:** `Ticket` (objeto completo con relaciones expandidas)

---

### `GET /api/tickets/:id`
Devuelve un ticket con todas las relaciones expandidas.

**Acceso:** autenticado

**Response `200`:** `Ticket`

**Errores:** `404` si no existe o está archivado (member)

---

### `PATCH /api/tickets/:id`
Edita campos del ticket. **El campo `version` es obligatorio** (Optimistic Locking).

**Acceso:** autenticado — member solo puede editar sus propios tickets

**Request** (todos los campos son opcionales salvo `version`):
```json
{
  "title":        "string?",
  "description":  "string | null?",
  "priority":     "low | medium | high?",
  "status":       "todo | in_progress | review | done?",
  "is_blocked":   "boolean?",
  "assignee_ids": ["uuid?"],
  "label_ids":    ["uuid?"],
  "version":      1
}
```

**Response `200`:** `Ticket` actualizado

**Errores específicos:**

| Código | `error` | Cuándo |
|---|---|---|
| `403` | `forbidden` | Member intenta editar ticket ajeno |
| `409` | `version_conflict` | El `version` no coincide con el de la BD — recargar y reintentar |
| `422` | `invalid_transition` | Transición de estado no permitida (ver tabla abajo) |

**Transiciones de estado válidas:**

| Desde | Hacia |
|---|---|
| `todo` | `in_progress` |
| `in_progress` | `todo`, `review` |
| `review` | `in_progress`, `done` |
| `done` | `review` (solo admin) |

---

### `PATCH /api/tickets/:id/archive`
Soft delete del ticket — setea `archived_at`.

**Acceso:** autenticado — member solo puede archivar sus propios tickets

**Request:** sin body

**Response `200`:** `Ticket` con `archived_at` seteado

**Errores:** `403` si el ticket es ajeno y el usuario es member

---

## Comentarios

### Tipos compartidos

```ts
interface Comment {
  id:          string
  ticket_id:   string
  body:        string
  archived_at: string | null
  created_at:  string
  author:      { id: string; name: string; email: string }
}
```

---

### `GET /api/tickets/:id/comments`
Lista comentarios activos del ticket (excluye archivados).

**Acceso:** autenticado

**Response `200`:** `Comment[]`

---

### `POST /api/tickets/:id/comments`
Crea un comentario. Encola notificaciones por email para creador, asignados y @mencionados.

**Acceso:** autenticado

**Request:**
```json
{ "body": "string (texto plano; menciones con @handle)" }
```

**Response `201`:** `Comment`

---

### `PATCH /api/comments/:id/archive`
Soft delete del comentario.

**Acceso:** autenticado — member solo puede archivar sus propios comentarios

**Request:** sin body

**Response `200`:** `Comment` con `archived_at` seteado

---

## Usuarios

### `GET /api/users`
Lista usuarios activos. Usado para el selector de asignados y autocompletar @menciones.

**Acceso:** autenticado

**Response `200`:**
```json
[
  { "id": "uuid", "name": "string", "email": "string", "role": "admin | member" }
]
```

---

## Etiquetas

### `GET /api/labels`
Lista el catálogo completo de etiquetas.

**Acceso:** autenticado

**Response `200`:**
```json
[{ "id": "uuid", "name": "string", "color": "#hex" }]
```

---

### `POST /api/labels`
Crea una etiqueta nueva.

**Acceso:** admin

**Request:**
```json
{ "name": "string", "color": "#hex" }
```

**Response `201`:**
```json
{ "id": "uuid", "name": "string", "color": "#hex", "created_at": "ISO 8601", "updated_at": "ISO 8601" }
```

---

### `PATCH /api/labels/:id`
Edita nombre o color de una etiqueta.

**Acceso:** admin

**Request:**
```json
{ "name": "string?", "color": "#hex?" }
```

**Response `200`:** etiqueta actualizada

---

### `DELETE /api/labels/:id`
Elimina una etiqueta. Las referencias en tickets se eliminan en cascada.

**Acceso:** admin

**Response `204`:** sin body

---

## Métricas

### `GET /api/metrics`
Snapshot de métricas calculadas en tiempo real.

**Acceso:** autenticado

**Query params** (todos opcionales):

| Parámetro | Tipo | Default |
|---|---|---|
| `from` | `YYYY-MM-DD` | Primer día del mes actual |
| `to` | `YYYY-MM-DD` | Hoy |
| `status` | `string \| string[]` | Todos |
| `assignee_id` | `uuid` | Todos |

**Response `200`:**
```json
{
  "tickets_by_status": {
    "todo": 0,
    "in_progress": 0,
    "review": 0,
    "done": 0
  },
  "tickets_closed_by_month": [
    { "month": "YYYY-MM", "count": 0 }
  ],
  "tickets_by_member": [
    { "user": { "id": "uuid", "name": "string" }, "active_count": 0 }
  ],
  "total": 0
}
```

---

### `GET /api/metrics/export`
Descarga un CSV con los mismos filtros del dashboard.

**Acceso:** autenticado

**Query params:** mismos que `GET /api/metrics`

**Response `200`:**
```
Content-Type: text/csv; charset=utf-8
Content-Disposition: attachment; filename="minijira-metrics-YYYY-MM.csv"
```

**Columnas del CSV** (en orden):
`ticket_id`, `title`, `status`, `priority`, `assignees` (`;`-separados), `labels` (`;`-separados), `created_by`, `created_at`, `closed_at`, `archived`

**Errores:** `400` con `invalid_date_range` si `from > to`

> Para disparar la descarga desde el navegador: `window.location.href = '/api/metrics/export?...'`  
> Si el resultado está vacío, deshabilitar el botón en UI (no hay respuesta 204).

---

## Administración

> Todas las rutas de este módulo requieren rol **admin**.

### `POST /api/admin/users`
Aprovisiona un usuario nuevo.

**Request:**
```json
{ "name": "string", "email": "string", "role": "admin | member" }
```

**Response `201`:**
```json
{ "id": "uuid", "name": "string", "email": "string", "role": "string", "is_active": true, "created_at": "ISO 8601" }
```

---

### `PATCH /api/admin/users/:id`
Edita nombre, email o rol de un usuario.

**Request:**
```json
{ "name": "string?", "email": "string?", "role": "admin | member?" }
```

**Response `200`:** usuario actualizado

---

### `PATCH /api/admin/users/:id/deactivate`
Desactiva un usuario (soft delete: `is_active = false`).

**Request:** sin body

**Response `200`:** usuario con `is_active: false`

---

## Errores estándar

Todas las respuestas de error tienen este shape:

```json
{
  "error": "snake_case_code",
  "message": "Descripción legible"
}
```

| HTTP | `error` | Cuándo |
|---|---|---|
| `400` | `invalid_input` | Body o query params inválidos |
| `400` | `invalid_date_range` | `from > to` en métricas/export |
| `401` | `unauthorized` | Cookie ausente, expirada o inválida |
| `403` | `forbidden` | Rol insuficiente o recurso ajeno |
| `404` | `not_found` | Recurso no existe |
| `409` | `version_conflict` | Optimistic Locking — recargar y reintentar |
| `422` | `invalid_transition` | Transición de estado no permitida |
| `500` | `internal_error` | Error inesperado — mensaje genérico, sin traza |

### Manejo recomendado en frontend

```ts
// 401 → redirigir a /login
// 409 → mostrar aviso "Alguien modificó este ticket mientras lo editabas. Recarga para ver los cambios."
// 422 → mostrar el message del body al usuario
// 500 → toast genérico de error
```

---

## Notas de integración

- **Avatares:** no hay `avatar_url`. Renderizar iniciales del campo `name`.
- **Color de etiquetas:** hex libre, ej. `#005bbf`. El frontend decide contraste del texto.
- **Paginación:** no existe en v1. `GET /api/tickets` devuelve todos los activos.
- **Concurrencia:** guardar siempre el `version` del ticket al abrirlo y enviarlo en cada `PATCH`. Si llega `409`, no descartar los cambios del usuario — mostrar el aviso y dejar el formulario intacto.
- **CORS:** configurado solo para `http://localhost:5173` en desarrollo.
