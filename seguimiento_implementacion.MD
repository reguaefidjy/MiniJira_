# Seguimiento de implementación — MiniJira v0.1

**Última actualización:** 2026-05-05

---

## ✅ Implementación completada — 2026-05-05

Todas las fases implementadas. El proyecto compila sin errores TypeScript. Los 22 endpoints del contrato están activos.

---

## Estado real del proyecto

El proyecto tiene la **estructura completa** (rutas, schema BD, tipos), pero la mayoría de los controladores son **stubs vacíos** (`async (_req, _res, next) => next()`).

| Módulo | Estado real |
|--------|-------------|
| Schema BD (8 tablas) | ✅ Completo |
| `tickets.service.ts` (`listTickets`, `createTicket`) | ✅ Completo |
| `tickets.controller.ts` (`list`, `create`) | ✅ Completo |
| `tickets.controller.ts` (`getOne`, `update`, `archive`) | ❌ Stubs |
| `auth.controller.ts` (los 4 handlers) | ❌ Stubs |
| `comments.controller.ts` (los 3 handlers) | ❌ Stubs |
| `users.controller.ts` | ❌ Stub |
| `labels.controller.ts` (los 4 handlers) | ❌ Stubs |
| `metrics.controller.ts` (los 2 handlers) | ❌ Stubs |
| `admin.controller.ts` (los 3 handlers) | ❌ Stubs |
| `lib/jwt.ts` | ❌ Stub (lanza error) |
| `lib/oauth.ts` | ❌ Stub (lanza error) |
| `lib/csv.ts` | ⚠️ Parcial (sin `res.write`) |
| `middlewares/authenticate.ts` | ❌ Stub (pasa sin verificar) |
| `middlewares/authorize.ts` | ❌ Stub (pasa sin verificar) |

---

## Plan de implementación

### Fase 1 — Seguridad crítica (prerrequisito de todo lo demás)

- [x] **1.1 — `backend/src/lib/jwt.ts`**
  Implementar `signAccessToken`, `signRefreshToken`, `verifyAccessToken`, `verifyRefreshToken`.
  Validar que los secretos existan y no sean los valores por defecto al startup.
  _(Corrección C-03 de correction-prompt.md)_

- [x] **1.2 — `backend/src/middlewares/authenticate.ts`**
  Leer cookie `access_token`, llamar `verifyAccessToken`, asignar `req.user` o responder 401.
  _(Corrección C-01)_

- [x] **1.3 — `backend/src/middlewares/authorize.ts`**
  Verificar `req.user.role` contra los roles permitidos, responder 403 si no aplica.
  _(Corrección C-02)_

- [x] **1.4 — `backend/src/app.ts`**
  - Validar que `CORS_ORIGIN` esté definida al startup (lanzar error si no).
  - Agregar `helmet` antes de cualquier otro middleware.
  - Agregar `express-rate-limit` (20 req / 15 min) en `/api/auth`.
  _(Correcciones A-02, M-05, M-01)_

---

### Fase 2 — Módulo Auth (flujo OAuth completo)

- [x] **2.1 — `backend/src/lib/oauth.ts`**
  Implementar `exchangeCode`: intercambiar el código OAuth por un token de identidad usando
  `OAUTH_CLIENT_ID`, `OAUTH_CLIENT_SECRET`, `OAUTH_CALLBACK_URL`, `OAUTH_TOKEN_URL` y `OAUTH_USERINFO_URL`.
  Flujo estándar OAuth2 + OIDC compatible con cualquier proveedor (Google, Microsoft, etc.).

- [x] **2.2 — `backend/src/modules/auth/auth.controller.ts`**
  - `callback`: llama a `exchangeCode`, busca usuario por email (403 si no existe o está inactivo),
    firma access + refresh tokens, almacena hash del refresh en BD, setea cookies httpOnly.
    _(Corrección B-01)_
  - `me`: consulta usuario en BD por `req.user.sub`, devuelve datos actualizados.
  - `refresh`: verifica refresh token en cookie, compara hash en tabla `refresh_tokens`, rota el token (elimina el usado, emite nuevo par).
  - `logout`: elimina el refresh token de la BD, limpia ambas cookies.

---

### Fase 3 — Completar controladores de Tickets

- [x] **3.1 — `backend/src/modules/tickets/tickets.service.ts`**
  Agregadas las funciones:
  - `getTicketById(id, role)` — devuelve ticket con relaciones; 404 para archivados si role es member.
  - `updateTicket(id, input, userId, role)` — Optimistic Locking (409), transiciones de estado (422), reemplaza assignees/labels si se envían.
  - `archiveTicket(id, userId, role)` — soft delete con `archived_at`; 403 si member intenta archivar ticket ajeno.
  - Helpers internos `replaceAssignees` y `replaceLabels` para reemplazar relaciones de forma limpia.

- [x] **3.2 — `backend/src/modules/tickets/tickets.controller.ts`**
  - Implementados `getOne`, `update` (valida `version` obligatorio), `archive`.
  - Eliminado `req.user!` en `create`, reemplazado por guarda explícita.
  - Validación de longitud máxima 10 000 chars en `description`.
  _(Correcciones A-01, M-03)_

---

### Fase 4 — Comentarios

- [x] **4.1 — Crear `backend/src/modules/comments/comments.service.ts`**
  - `listComments(ticketId)` — devuelve comentarios activos ordenados por `created_at` ASC.
  - `createComment(ticketId, authorId, body)` — inserta comentario y encola notificaciones:
    creador del ticket + asignados (`comment_added`), @menciones (`mention`, con prioridad sobre `comment_added`).
    El autor queda excluido de sus propias notificaciones.
  - `archiveComment(commentId, userId, role)` — soft delete; 403 si member intenta archivar comentario ajeno.

- [x] **4.2 — `backend/src/modules/comments/comments.controller.ts`**
  Implementados `list`, `create` (valida body, max 5 000 chars), `archive`.

---

### Fase 5 — Usuarios, Etiquetas y Admin

- [x] **5.1 — Usuarios**
  - `users.service.ts`: `listUsers()` — devuelve usuarios activos ordenados por nombre.
  - `users.controller.ts`: handler `list` implementado.

- [x] **5.2 — Etiquetas**
  - `labels.service.ts`: `listLabels`, `createLabel`, `updateLabel`, `deleteLabel`.
    Unicidad de `name` validada con pre-check (409 si duplicado). Cascada en `ticket_labels` por FK.
  - `labels.controller.ts`: handlers `list`, `create`, `update`, `remove` (204 sin body).
    Validación de color hex `#RGB` / `#RRGGBB`.

- [x] **5.3 — Admin**
  - `admin.service.ts`: `provisionUser`, `updateUser`, `deactivateUser`.
    Unicidad de `email` validada con pre-check. Emails normalizados a lowercase.
  - `admin.controller.ts`: handlers `createUser`, `updateUser`, `deactivateUser`.
    Validación de email con regex y de role contra enum.

---

### Fase 6 — Métricas y CSV

- [x] **6.1 — `backend/src/lib/csv.ts`**
  - `startCsvStream`: sanitiza filename (sólo `[\w\s.-]`, máx 200 chars), setea headers de streaming.
  - `csvRow`: acepta cualquier tipo primitivo; escapa comillas internas (`""`) RFC 4180.
  _(Corrección A-04)_

- [x] **6.2 — Métricas**
  - `metrics.service.ts`:
    - `getSnapshot(filters)` — `tickets_by_status`, `tickets_closed_by_month` (por `archived_at`), `tickets_by_member` (todos los usuarios activos), `total`.
    - `exportCsvStream(res, filters)` — headers primero, luego fila a fila con `res.write()`, cierra con `res.end()`. Columnas: `ticket_id`, `title`, `status`, `priority`, `assignees`, `labels`, `created_by`, `created_at`, `closed_at`, `archived`.
  - `metrics.controller.ts`: `snapshot` y `exportCsv` con validación de rango de fechas (`invalid_date_range` si `from > to`). Defaults: `from` = primer día del mes, `to` = hoy.

---

### Fase 7 — Correcciones de seguridad restantes

- [x] **7.1 — `backend/src/middlewares/errorHandler.ts`**
  Mapa de mensajes seguros para 10 códigos de error conocidos. Cualquier código desconocido recibe
  "Request could not be processed" (nunca se filtran mensajes internos de Drizzle/SQLite).
  _(Corrección M-02)_

- [x] **7.2 — `backend/.gitignore`**
  Creado con `*.db`, `*.sqlite`, `minijira.db`, `.env`, `dist/`, `node_modules/`.
  _(Corrección M-04)_

- [x] **7.3 — `backend/src/db/index.ts`**
  `DATABASE_URL` relativa resuelta con `path.resolve(process.cwd(), dbUrl)` antes de abrir la BD.
  _(Corrección B-03)_

- [x] **7.4 — `backend/.env.example`**
  Secretos JWT documentados como "REEMPLAZAR_CON_SECRETO_ALEATORIO_64_BYTES" con instrucciones de generación.
  _(Corrección A-05 — completado en Fase 1)_

- [x] **7.5 — Frontend: validación OAuth state (CSRF)**
  - `LoginPage.tsx`: genera `state = crypto.randomUUID()`, lo guarda en `sessionStorage`, lo añade como `?state=` al URL de login.
  - `AuthCallbackPage.tsx`: lee `state` del callback, compara con `sessionStorage` (y lo elimina), redirige a `/login` si no coincide o si falta el `code`.
  _(Corrección A-03)_

---

## Orden de ejecución

```
Fase 1  (jwt → authenticate → authorize → app.ts)
  ↓
Fase 2  (oauth.ts → auth.controller.ts completo)
  ↓
Fase 3  (tickets service completo → tickets controller completo)
  ↓
Fase 4  (comments service + controller)
  ↓
Fase 5  (users | labels | admin — se pueden hacer en paralelo)
  ↓
Fase 6  (csv.ts → metrics service + controller)
  ↓
Fase 7  (correcciones de seguridad restantes)
```

---

## Dependencias de paquetes pendientes de instalar

```bash
# En backend/
pnpm add express-rate-limit --filter backend
pnpm add helmet --filter backend
```

---

## Decisiones de negocio aplicadas (no modificar)

- JWT en cookies `httpOnly` — nunca `localStorage` ni `Authorization` header.
- Optimistic Locking con campo `version` en `tickets` (409 si no coincide).
- Transiciones de estado validadas en backend (422 si inválida).
- Soft delete con `archived_at`; nunca hard delete en tickets ni comentarios.
- Worker verifica que el comentario siga activo antes de enviar email (EC-1).
- Sin paginación en v1: `GET /api/tickets` devuelve todos los activos.
- CSV export fila a fila sin acumular en memoria (EC-2).
- Notificaciones via Resend para `comment_added`, `mention`, `ticket_assigned`.
