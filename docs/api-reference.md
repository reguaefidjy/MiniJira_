# API Reference — MiniJira

**Versión:** v0.1  
**Fecha de generación:** 2026-05-04  
**Fuente:** Generado desde `api-contract.md`  
**Base URL:** `http://localhost:3000`

---

## 1. Autenticación

MiniJira utiliza JWT transportado exclusivamente mediante **cookies `httpOnly`**, no mediante el header `Authorization`. El flujo completo es el siguiente:

### Flujo JWT completo

1. **Login OAuth** — El frontend redirige al proveedor OAuth. Una vez que el proveedor redirige de vuelta con un `code`, el frontend llama a `POST /api/auth/callback` enviando ese código en el body.
2. **Recepción de tokens** — El servidor valida el código con el proveedor, crea o recupera el usuario y establece automáticamente dos cookies en la respuesta:
   - `access_token` — JWT de corta duración. Enviado automáticamente por el navegador en cada petición.
   - `refresh_token` — JWT de larga duración. Almacenado en cookie `httpOnly`, `SameSite=Strict`.
3. **Uso en peticiones autenticadas** — El navegador envía la cookie `access_token` de forma automática en cada request. **No se usa el header `Authorization`.**
4. **Renovación del token** — Cuando el `access_token` expira (respuesta `401 unauthorized`), el cliente llama a `POST /api/auth/refresh`. El servidor lee el `refresh_token` desde la cookie httpOnly y emite un nuevo `access_token` renovando la cookie correspondiente. No se envía body ni se recibe body.
5. **Logout** — `POST /api/auth/logout` invalida la sesión en servidor y limpia ambas cookies.

### Formato de autenticación

Dado que la autenticación se basa en cookies httpOnly, **no se utiliza el header `Authorization: Bearer {token}`**. El navegador gestiona el envío de la cookie automáticamente. Para llamadas desde herramientas como cURL, se debe incluir la cookie:

```
Cookie: access_token={token}
```

### Cookies de sesión

| Cookie | Tipo | Descripción |
|---|---|---|
| `access_token` | `httpOnly`, `SameSite=Strict` | JWT de acceso. Enviado automáticamente en cada petición. |
| `refresh_token` | `httpOnly`, `SameSite=Strict` | JWT de renovación. Usado únicamente en `POST /api/auth/refresh`. |

---

## 2. Tabla maestra de endpoints

> **Convenciones de la tabla:**
> - `?` en campos del body indica campo opcional.
> - `🔲` en Prioridad indica endpoint P2 o pendiente / no implementado.
> - Auth = `cookie` significa que requiere la cookie `access_token` válida.
> - Auth = `admin` significa que requiere además rol `admin`.
> - Auth = `público` significa que no requiere autenticación previa (aunque puede llevar cookie de refresh).

| Método | Ruta | Auth | Prioridad | Body (campos) | Response principal | Status codes |
|---|---|---|---|---|---|---|
| `POST` | `/api/auth/callback` | público | — | `code: string` | `200`: objeto usuario (`id`, `name`, `email`, `role`, `created_at`, `updated_at`) + cookies seteadas | `200` |
| `GET` | `/api/me` | cookie | — | — (sin body) | `200`: objeto usuario (`id`, `name`, `email`, `role`, `created_at`, `updated_at`) | `200`, `401` |
| `POST` | `/api/auth/refresh` | público (cookie refresh) | — | — (sin body) | `200`: sin body — renueva cookie `access_token` | `200` |
| `POST` | `/api/auth/logout` | cookie | — | — (sin body) | `200`: sin body | `200`, `401` |
| `GET` | `/api/tickets` | cookie | — | — (sin body) | `200`: `Ticket[]` | `200`, `401` |
| `POST` | `/api/tickets` | cookie | — | `title: string` (max 120 chars), `description?: string\|null`, `priority: "low"\|"medium"\|"high"`, `status?: "todo"\|"in_progress"\|"review"\|"done"`, `is_blocked?: boolean`, `assignee_ids?: uuid[]`, `label_ids?: uuid[]` | `201`: `Ticket` completo con relaciones | `201`, `401`, `400` |
| `GET` | `/api/tickets/:id` | cookie | — | — (sin body) | `200`: `Ticket` con relaciones expandidas | `200`, `401`, `404` |
| `PATCH` | `/api/tickets/:id` | cookie | — | `version: number` (requerido), `title?: string`, `description?: string\|null`, `priority?: "low"\|"medium"\|"high"`, `status?: "todo"\|"in_progress"\|"review"\|"done"`, `is_blocked?: boolean`, `assignee_ids?: uuid[]`, `label_ids?: uuid[]` | `200`: `Ticket` actualizado | `200`, `401`, `403`, `409`, `422` |
| `PATCH` | `/api/tickets/:id/archive` | cookie | — | — (sin body) | `200`: `Ticket` con `archived_at` seteado | `200`, `401`, `403` |
| `GET` | `/api/tickets/:id/comments` | cookie | — | — (sin body) | `200`: `Comment[]` (excluye archivados) | `200`, `401`, `404` |
| `POST` | `/api/tickets/:id/comments` | cookie | — | `body: string` (texto plano, menciones con @handle) | `201`: `Comment` | `201`, `401`, `404` |
| `PATCH` | `/api/comments/:id/archive` | cookie | — | — (sin body) | `200`: `Comment` con `archived_at` seteado | `200`, `401`, `403` |
| `GET` | `/api/users` | cookie | — | — (sin body) | `200`: array de usuarios (`id`, `name`, `email`, `role`) | `200`, `401` |
| `GET` | `/api/labels` | cookie | — | — (sin body) | `200`: array de etiquetas (`id`, `name`, `color`) | `200`, `401` |
| `POST` | `/api/labels` | admin | — | `name: string`, `color: string` (#hex) | `201`: etiqueta (`id`, `name`, `color`, `created_at`, `updated_at`) | `201`, `401`, `403` |
| `PATCH` | `/api/labels/:id` | admin | — | `name?: string`, `color?: string` (#hex) | `200`: etiqueta actualizada | `200`, `401`, `403`, `404` |
| `DELETE` | `/api/labels/:id` | admin | — | — (sin body) | `204`: sin body | `204`, `401`, `403`, `404` |
| `GET` | `/api/metrics` | cookie | — | — (sin body) | `200`: objeto métricas (`tickets_by_status`, `tickets_closed_by_month`, `tickets_by_member`, `total`) | `200`, `401`, `400` |
| `GET` | `/api/metrics/export` | cookie | — | — (sin body) | `200`: archivo CSV descargable | `200`, `400`, `401` |
| `POST` | `/api/admin/users` | admin | — | `name: string`, `email: string`, `role: "admin"\|"member"` | `201`: usuario (`id`, `name`, `email`, `role`, `is_active`, `created_at`) | `201`, `401`, `403` |
| `PATCH` | `/api/admin/users/:id` | admin | — | `name?: string`, `email?: string`, `role?: "admin"\|"member"` | `200`: usuario actualizado | `200`, `401`, `403`, `404` |
| `PATCH` | `/api/admin/users/:id/deactivate` | admin | — | — (sin body) | `200`: usuario con `is_active: false` | `200`, `401`, `403`, `404` |

---

## 3. Ejemplos cURL — solo endpoints P0

> El contrato no establece una clasificación P0/P1/P2 explícita sobre los endpoints. Se consideran P0 los endpoints core de operación: autenticación, gestión de tickets (CRUD) y listado de usuarios/etiquetas necesarios para el flujo principal.

### Iniciar sesión con código OAuth

```bash
# Intercambia el código OAuth del proveedor por una sesión (cookies access_token y refresh_token)
curl -s -X POST http://localhost:3000/api/auth/callback \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{"code": "4/0AX4XfWj..."}'
```

```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "name": "Diana Gutiérrez",
  "email": "diana@example.com",
  "role": "admin",
  "created_at": "2026-04-27T10:00:00.000Z",
  "updated_at": "2026-04-27T10:00:00.000Z"
}
```

---

### Obtener el usuario autenticado actual

```bash
# Devuelve el perfil del usuario cuya cookie de sesión se envía
curl -s -X GET http://localhost:3000/api/me \
  -H "Content-Type: application/json" \
  -b cookies.txt
```

```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "name": "Diana Gutiérrez",
  "email": "diana@example.com",
  "role": "admin",
  "created_at": "2026-04-27T10:00:00.000Z",
  "updated_at": "2026-04-27T10:00:00.000Z"
}
```

---

### Renovar el access token usando el refresh token

```bash
# Renueva la cookie access_token usando el refresh_token almacenado en cookie httpOnly
curl -s -X POST http://localhost:3000/api/auth/refresh \
  -b cookies.txt \
  -c cookies.txt
```

```json

```

> La respuesta 200 no tiene body. La cookie `access_token` queda renovada.

---

### Cerrar sesión

```bash
# Invalida la sesión activa y limpia las cookies de autenticación
curl -s -X POST http://localhost:3000/api/auth/logout \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -c cookies.txt
```

```json

```

> La respuesta 200 no tiene body.

---

### Listar todos los tickets activos

```bash
# Devuelve todos los tickets no archivados; se pueden combinar filtros opcionales por query params
curl -s -X GET "http://localhost:3000/api/tickets?status=todo&status=in_progress&priority=high" \
  -H "Content-Type: application/json" \
  -b cookies.txt
```

```json
[
  {
    "id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
    "title": "Corregir bug en login",
    "description": "El formulario no valida el campo email correctamente",
    "status": "in_progress",
    "priority": "high",
    "is_blocked": false,
    "version": 3,
    "archived_at": null,
    "created_at": "2026-04-20T09:00:00.000Z",
    "updated_at": "2026-04-27T11:30:00.000Z",
    "creator": { "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890", "name": "Diana Gutiérrez", "email": "diana@example.com", "role": "admin" },
    "assignees": [
      { "id": "c3d4e5f6-a7b8-9012-cdef-123456789012", "name": "Luis Pérez", "email": "luis@example.com", "role": "member" }
    ],
    "labels": [
      { "id": "d4e5f6a7-b8c9-0123-defa-234567890123", "name": "bug", "color": "#e11d48" }
    ]
  }
]
```

---

### Crear un ticket nuevo

```bash
# Crea un nuevo ticket; el creador se toma del JWT en la cookie de sesión
curl -s -X POST http://localhost:3000/api/tickets \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "title": "Implementar filtro por etiqueta en el board",
    "description": "El usuario debe poder filtrar tickets por una o varias etiquetas desde el board principal.",
    "priority": "medium",
    "status": "todo",
    "is_blocked": false,
    "assignee_ids": ["c3d4e5f6-a7b8-9012-cdef-123456789012"],
    "label_ids": ["d4e5f6a7-b8c9-0123-defa-234567890123"]
  }'
```

```json
{
  "id": "e5f6a7b8-c9d0-1234-efab-345678901234",
  "title": "Implementar filtro por etiqueta en el board",
  "description": "El usuario debe poder filtrar tickets por una o varias etiquetas desde el board principal.",
  "status": "todo",
  "priority": "medium",
  "is_blocked": false,
  "version": 1,
  "archived_at": null,
  "created_at": "2026-05-04T08:00:00.000Z",
  "updated_at": "2026-05-04T08:00:00.000Z",
  "creator": { "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890", "name": "Diana Gutiérrez", "email": "diana@example.com", "role": "admin" },
  "assignees": [
    { "id": "c3d4e5f6-a7b8-9012-cdef-123456789012", "name": "Luis Pérez", "email": "luis@example.com", "role": "member" }
  ],
  "labels": [
    { "id": "d4e5f6a7-b8c9-0123-defa-234567890123", "name": "bug", "color": "#e11d48" }
  ]
}
```

---

### Obtener un ticket por ID

```bash
# Devuelve el detalle completo de un ticket con todas sus relaciones expandidas
curl -s -X GET http://localhost:3000/api/tickets/e5f6a7b8-c9d0-1234-efab-345678901234 \
  -H "Content-Type: application/json" \
  -b cookies.txt
```

```json
{
  "id": "e5f6a7b8-c9d0-1234-efab-345678901234",
  "title": "Implementar filtro por etiqueta en el board",
  "description": "El usuario debe poder filtrar tickets por una o varias etiquetas desde el board principal.",
  "status": "todo",
  "priority": "medium",
  "is_blocked": false,
  "version": 1,
  "archived_at": null,
  "created_at": "2026-05-04T08:00:00.000Z",
  "updated_at": "2026-05-04T08:00:00.000Z",
  "creator": { "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890", "name": "Diana Gutiérrez", "email": "diana@example.com", "role": "admin" },
  "assignees": [],
  "labels": []
}
```

---

### Editar un ticket (PATCH con Optimistic Locking)

```bash
# Actualiza el estado de un ticket; el campo version es obligatorio para el Optimistic Locking
curl -s -X PATCH http://localhost:3000/api/tickets/e5f6a7b8-c9d0-1234-efab-345678901234 \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "status": "in_progress",
    "version": 1
  }'
```

```json
{
  "id": "e5f6a7b8-c9d0-1234-efab-345678901234",
  "title": "Implementar filtro por etiqueta en el board",
  "description": "El usuario debe poder filtrar tickets por una o varias etiquetas desde el board principal.",
  "status": "in_progress",
  "priority": "medium",
  "is_blocked": false,
  "version": 2,
  "archived_at": null,
  "created_at": "2026-05-04T08:00:00.000Z",
  "updated_at": "2026-05-04T09:15:00.000Z",
  "creator": { "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890", "name": "Diana Gutiérrez", "email": "diana@example.com", "role": "admin" },
  "assignees": [],
  "labels": []
}
```

---

### Archivar un ticket

```bash
# Realiza un soft delete del ticket seteando archived_at con la fecha actual
curl -s -X PATCH http://localhost:3000/api/tickets/e5f6a7b8-c9d0-1234-efab-345678901234/archive \
  -H "Content-Type: application/json" \
  -b cookies.txt
```

```json
{
  "id": "e5f6a7b8-c9d0-1234-efab-345678901234",
  "title": "Implementar filtro por etiqueta en el board",
  "description": "El usuario debe poder filtrar tickets por una o varias etiquetas desde el board principal.",
  "status": "in_progress",
  "priority": "medium",
  "is_blocked": false,
  "version": 2,
  "archived_at": "2026-05-04T10:00:00.000Z",
  "created_at": "2026-05-04T08:00:00.000Z",
  "updated_at": "2026-05-04T10:00:00.000Z",
  "creator": { "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890", "name": "Diana Gutiérrez", "email": "diana@example.com", "role": "admin" },
  "assignees": [],
  "labels": []
}
```

---

### Listar comentarios de un ticket

```bash
# Devuelve los comentarios activos (no archivados) del ticket especificado
curl -s -X GET http://localhost:3000/api/tickets/e5f6a7b8-c9d0-1234-efab-345678901234/comments \
  -H "Content-Type: application/json" \
  -b cookies.txt
```

```json
[
  {
    "id": "f6a7b8c9-d0e1-2345-fabc-456789012345",
    "ticket_id": "e5f6a7b8-c9d0-1234-efab-345678901234",
    "body": "He revisado el código y parece que el problema está en el validator del formulario. @luis puedes confirmar?",
    "archived_at": null,
    "created_at": "2026-05-04T09:30:00.000Z",
    "author": { "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890", "name": "Diana Gutiérrez", "email": "diana@example.com" }
  }
]
```

---

### Crear un comentario en un ticket

```bash
# Publica un comentario en el ticket; las menciones con @handle disparan notificaciones por email
curl -s -X POST http://localhost:3000/api/tickets/e5f6a7b8-c9d0-1234-efab-345678901234/comments \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"body": "Confirmo el bug. Voy a abrir un PR con el fix. @diana te asigno para revisión."}'
```

```json
{
  "id": "a7b8c9d0-e1f2-3456-abcd-567890123456",
  "ticket_id": "e5f6a7b8-c9d0-1234-efab-345678901234",
  "body": "Confirmo el bug. Voy a abrir un PR con el fix. @diana te asigno para revisión.",
  "archived_at": null,
  "created_at": "2026-05-04T10:05:00.000Z",
  "author": { "id": "c3d4e5f6-a7b8-9012-cdef-123456789012", "name": "Luis Pérez", "email": "luis@example.com" }
}
```

---

### Archivar un comentario

```bash
# Realiza un soft delete del comentario; solo el autor (member) o un admin pueden archivarlo
curl -s -X PATCH http://localhost:3000/api/comments/a7b8c9d0-e1f2-3456-abcd-567890123456/archive \
  -H "Content-Type: application/json" \
  -b cookies.txt
```

```json
{
  "id": "a7b8c9d0-e1f2-3456-abcd-567890123456",
  "ticket_id": "e5f6a7b8-c9d0-1234-efab-345678901234",
  "body": "Confirmo el bug. Voy a abrir un PR con el fix. @diana te asigno para revisión.",
  "archived_at": "2026-05-04T11:00:00.000Z",
  "created_at": "2026-05-04T10:05:00.000Z",
  "author": { "id": "c3d4e5f6-a7b8-9012-cdef-123456789012", "name": "Luis Pérez", "email": "luis@example.com" }
}
```

---

### Listar usuarios activos

```bash
# Devuelve todos los usuarios activos; útil para el selector de asignados y autocompletar @menciones
curl -s -X GET http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -b cookies.txt
```

```json
[
  { "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890", "name": "Diana Gutiérrez", "email": "diana@example.com", "role": "admin" },
  { "id": "c3d4e5f6-a7b8-9012-cdef-123456789012", "name": "Luis Pérez", "email": "luis@example.com", "role": "member" }
]
```

---

### Listar etiquetas

```bash
# Devuelve el catálogo completo de etiquetas disponibles para asignar a tickets
curl -s -X GET http://localhost:3000/api/labels \
  -H "Content-Type: application/json" \
  -b cookies.txt
```

```json
[
  { "id": "d4e5f6a7-b8c9-0123-defa-234567890123", "name": "bug", "color": "#e11d48" },
  { "id": "e5f6a7b8-c9d0-1234-efab-345678901234", "name": "feature", "color": "#005bbf" }
]
```

---

### Obtener métricas del dashboard

```bash
# Devuelve un snapshot de métricas calculadas en tiempo real; se pueden aplicar filtros opcionales
curl -s -X GET "http://localhost:3000/api/metrics?from=2026-05-01&to=2026-05-04" \
  -H "Content-Type: application/json" \
  -b cookies.txt
```

```json
{
  "tickets_by_status": {
    "todo": 5,
    "in_progress": 3,
    "review": 2,
    "done": 10
  },
  "tickets_closed_by_month": [
    { "month": "2026-04", "count": 8 },
    { "month": "2026-05", "count": 2 }
  ],
  "tickets_by_member": [
    { "user": { "id": "c3d4e5f6-a7b8-9012-cdef-123456789012", "name": "Luis Pérez" }, "active_count": 4 }
  ],
  "total": 20
}
```

---

### Exportar métricas como CSV

```bash
# Descarga un CSV con los mismos filtros del dashboard; rango de fechas obligatoriamente válido (from <= to)
curl -s -X GET "http://localhost:3000/api/metrics/export?from=2026-05-01&to=2026-05-04" \
  -H "Accept: text/csv" \
  -b cookies.txt \
  -o minijira-metrics-2026-05.csv
```

```json
```

> La respuesta es un archivo CSV con `Content-Type: text/csv; charset=utf-8`. Las columnas son: `ticket_id`, `title`, `status`, `priority`, `assignees` (`;`-separados), `labels` (`;`-separados), `created_by`, `created_at`, `closed_at`, `archived`.

---

## 4. Códigos de error globales

Todas las respuestas de error siguen el shape:

```json
{
  "error": "snake_case_code",
  "message": "Descripción legible"
}
```

| HTTP | `error` | Aplica a | Significado en MiniJira |
|---|---|---|---|
| `400` | `invalid_input` | Múltiples endpoints | Body o query params inválidos (campo faltante, tipo incorrecto, valor fuera de rango). |
| `400` | `invalid_date_range` | `GET /api/metrics`, `GET /api/metrics/export` | El parámetro `from` es posterior a `to` en los filtros de métricas. |
| `401` | `unauthorized` | Todos los endpoints autenticados | Cookie `access_token` ausente, expirada o inválida. El frontend debe redirigir a `/login`. |
| `403` | `forbidden` | `PATCH /api/tickets/:id`, `PATCH /api/tickets/:id/archive`, `PATCH /api/comments/:id/archive`, rutas `/api/labels`, rutas `/api/admin` | Rol insuficiente (se requiere `admin`) o intento de modificar un recurso ajeno siendo `member`. |
| `404` | `not_found` | `GET /api/tickets/:id`, `GET /api/tickets/:id/comments`, `DELETE /api/labels/:id`, endpoints admin | El recurso solicitado no existe o, en el caso de tickets, está archivado (para usuarios `member`). |
| `409` | `version_conflict` | `PATCH /api/tickets/:id` | El campo `version` enviado no coincide con el almacenado en BD. Indica edición concurrente — el frontend debe mostrar aviso y preservar los cambios del usuario sin descartarlos. |
| `422` | `invalid_transition` | `PATCH /api/tickets/:id` | La transición de `status` solicitada no está permitida según las reglas del flujo de estados. El frontend debe mostrar el `message` del body al usuario. |
| `500` | `internal_error` | Todos los endpoints | Error inesperado en el servidor. El mensaje es genérico (sin traza). El frontend debe mostrar un toast genérico de error. |

---

## 5. Notas y endpoints pendientes

El contrato `api-contract.md` en su versión v0.1 no clasifica los endpoints con etiquetas P2 ni marca ninguno como "pendiente / no implementado". Por lo tanto, **no existen endpoints clasificados como P2 o pendientes** en la fuente de verdad consultada.

### Notas de integración del contrato

Las siguientes notas aplican al desarrollo frontend y están extraídas literalmente del contrato:

- **Avatares:** no hay `avatar_url`. Renderizar iniciales del campo `name`.
- **Color de etiquetas:** hex libre, ej. `#005bbf`. El frontend decide el contraste del texto.
- **Paginación:** no existe en v1. `GET /api/tickets` devuelve todos los activos.
- **Concurrencia:** guardar siempre el `version` del ticket al abrirlo y enviarlo en cada `PATCH`. Si llega `409`, no descartar los cambios del usuario — mostrar el aviso y dejar el formulario intacto.
- **CORS:** configurado solo para `http://localhost:5173` en desarrollo.
- **Export CSV:** para disparar la descarga desde el navegador: `window.location.href = '/api/metrics/export?...'`. Si el resultado está vacío, deshabilitar el botón en UI (no hay respuesta 204).
- **Formato de respuesta:** JSON (`Content-Type: application/json`) en todas las rutas salvo el export CSV.
- **IDs:** UUID v4 como `string`.
- **Timestamps:** ISO 8601 UTC — `"2026-04-27T14:30:00.000Z"`.
