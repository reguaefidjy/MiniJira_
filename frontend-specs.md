# Frontend Specs — Mini Jira v0.1

**Fecha:** 2026-04-22
**Basado en:** specs.md, backlog.md, DESIGN.md, mermaid_design.md, init_db.sql
**Estado:** Pendiente de confirmación

---

## 1. Stack y Versiones

| Capa | Tecnología | Versión |
|---|---|---|
| Lenguaje | TypeScript | 5.x |
| Framework | React | 18.x |
| Build tool | Vite | 5.x |
| Gestor de paquetes | pnpm | 9.x |
| Routing | React Router | 6.x |
| UI Components | shadcn/ui (Radix UI) | CLI latest |
| Estilos | Tailwind CSS | 3.x |
| Estado UI | Zustand | 4.x |
| Server state / Cache | TanStack Query | v5.x |
| Formularios | React Hook Form | 7.x |
| Validación de esquemas | Zod | 3.x |
| Drag and Drop | @dnd-kit/core + @dnd-kit/sortable | 6.x |
| Markdown (lectura) | react-markdown + remark-gfm | latest |
| Gráficas | Recharts | 2.x |
| Tests unitarios | Vitest + @testing-library/react | latest |
| Tests E2E | Playwright | latest |

---

## 2. Dependencias

### Producción

```
react @18
react-dom @18
react-router-dom @6
@tanstack/react-query @5
zustand @4
react-hook-form @7
zod @3
@dnd-kit/core @6
@dnd-kit/sortable @6
@dnd-kit/utilities @6
react-markdown
remark-gfm
recharts @2
tailwindcss @3
```

**shadcn/ui components instalados vía CLI:**
`Button`, `Sheet`, `Dialog`, `Select`, `Badge`, `Tooltip`, `Calendar`,
`Popover`, `Command`, `Input`, `Textarea`, `Label`, `DropdownMenu`,
`Separator`, `Skeleton`, `Toaster`, `Toggle`, `Avatar`

### Desarrollo

```
typescript @5
vite @5
vitest
@testing-library/react
@testing-library/user-event
@playwright/test
@types/react
@types/react-dom
autoprefixer
postcss
```

---

## 3. Modelo de Datos (TypeScript)

Derivado directamente de `init_db.sql`. Fuente de verdad para todos los tipos del frontend.

```typescript
// --- Enums ---
type UserRole      = 'admin' | 'member';
type TicketStatus  = 'todo' | 'in_progress' | 'review' | 'done';
type TicketPriority = 'low' | 'medium' | 'high';

// --- Entidades base ---
interface User {
  id:         string;   // UUID
  name:       string;
  email:      string;
  role:       UserRole;
  created_at: string;   // ISO 8601 UTC
  updated_at: string;
}

interface Ticket {
  id:          string;
  title:       string;           // max 120 chars
  description: string | null;    // markdown, renderizado en lectura
  status:      TicketStatus;
  priority:    TicketPriority;
  is_blocked:  boolean;
  version:     number;           // Optimistic Locking
  created_by:  string;           // user UUID
  archived_at: string | null;
  created_at:  string;
  updated_at:  string;
  // relaciones expandidas por el API
  assignees:      User[];
  labels:         string[];
  created_by_user: User;
}

interface Comment {
  id:          string;
  ticket_id:   string;
  author_id:   string;
  author:      User;
  body:        string;           // texto plano, sin markdown
  archived_at: string | null;
  created_at:  string;
}

// --- Dashboard ---
interface MetricsSnapshot {
  tickets_by_status:         Record<TicketStatus, number>;
  tickets_closed_by_month:   Array<{ month: string; count: number }>; // month = "YYYY-MM"
  tickets_by_member:         Array<{ user: User; active_count: number }>;
}

// --- Filtros ---
interface BoardFilters {
  status:           TicketStatus[];
  priority:         TicketPriority[];
  assignee_id:      string | null;
  labels:           string[];
  created_at_from:  string | null;   // YYYY-MM-DD
  created_at_to:    string | null;
}

interface MetricsFilters {
  from:        string;           // YYYY-MM-DD, default: primer día del mes actual
  to:          string;           // YYYY-MM-DD, default: hoy
  status:      TicketStatus[];
  assignee_id: string | null;
}

// --- Formularios (Zod + RHF) ---
interface TicketFormValues {
  title:       string;
  description: string;
  priority:    TicketPriority;
  status:      TicketStatus;
  is_blocked:  boolean;
  assignee_ids: string[];
  labels:      string[];
  version:     number;           // enviado en PATCH para Optimistic Locking
}

interface CommentFormValues {
  body: string;                  // texto plano, menciones con @handle
}

// --- Sesión ---
interface CurrentUser extends User {
  // Decodificado del JWT vía GET /api/me
}
```

---

## 4. Arquitectura de Componentes

### 4.1 Rutas

| Ruta | Componente | Acceso | Notas |
|---|---|---|---|
| `/login` | `LoginPage` | Público | Redirige a `/board` si ya autenticado |
| `/auth/callback` | `AuthCallbackPage` | Público | Recibe `?code=` del proveedor OAuth |
| `/board` | `BoardPage` | Autenticado | Tablero Kanban principal |
| `/board?ticket=:id` | `BoardPage` + `TicketDrawer` | Autenticado | Slide-over lateral sobre el tablero |
| `/dashboard` | `DashboardPage` | Autenticado | Métricas + exportación CSV |

> La ruta `/admin/users` queda fuera de v1 (aprovisionamiento de cuentas es manual por el admin).

### 4.2 Árbol de componentes

```
App
├── QueryClientProvider          ← TanStack Query
├── Router
│   ├── PublicLayout             ← sin sidebar
│   │   ├── LoginPage
│   │   └── AuthCallbackPage
│   └── AuthGuard                ← llama GET /api/me; 401 → redirect /login
│       └── AppLayout
│           ├── Sidebar          ← nav: Tablero | Dashboard
│           └── Outlet
│               ├── BoardPage
│               │   ├── BoardToolbar
│               │   │   ├── BoardFilters
│               │   │   │   ├── StatusMultiSelect
│               │   │   │   ├── PriorityMultiSelect
│               │   │   │   ├── AssigneeSelect
│               │   │   │   ├── LabelFilter
│               │   │   │   └── DateRangePicker
│               │   │   └── CreateTicketButton → TicketCreateDialog
│               │   ├── KanbanBoard              ← DndContext de @dnd-kit
│               │   │   └── KanbanColumn × 4     ← Droppable
│               │   │       ├── ColumnHeader (nombre + contador)
│               │   │       └── TicketCard × N   ← Draggable
│               │   │           ├── TicketTitle
│               │   │           ├── PriorityBadge
│               │   │           ├── BlockedBadge  (condicional, rojo)
│               │   │           ├── AssigneeAvatarStack
│               │   │           └── LabelList
│               │   ├── DragOverlay              ← sombra durante drag
│               │   └── TicketDrawer             ← Sheet (shadcn), abierto si ?ticket=:id
│               │       ├── TicketHeader
│               │       │   ├── TitleDisplay / TitleInput (toggle edición)
│               │       │   ├── StatusSelect
│               │       │   ├── PrioritySelect
│               │       │   └── BlockedToggle
│               │       ├── ConflictBanner       ← visible solo tras 409
│               │       ├── TicketDescription    ← react-markdown (modo lectura)
│               │       │   └── DescriptionEditor (modo edición, Textarea)
│               │       ├── TicketMetadata
│               │       │   ├── AssigneeMultiSelect
│               │       │   ├── LabelInput       ← freeform tags
│               │       │   ├── CreatedByDisplay
│               │       │   └── DateDisplay
│               │       ├── TicketActions
│               │       │   ├── SaveButton       ← submit RHF
│               │       │   └── ArchiveButton    ← "Eliminar" (soft delete)
│               │       └── CommentSection
│               │           ├── CommentList
│               │           │   └── CommentItem × N
│               │           │       ├── CommentBody (texto plano)
│               │           │       ├── CommentAuthor + Timestamp
│               │           │       └── ArchiveCommentButton (propio o admin)
│               │           └── CommentInput
│               │               └── MentionTextarea
│               │                   └── MentionPopover ← abierto tras '@'
│               │                       └── UserCommandList (filtrable)
│               └── DashboardPage
│                   ├── DashboardToolbar
│                   │   ├── DashboardFilters
│                   │   │   ├── DateRangePicker
│                   │   │   ├── StatusMultiSelect
│                   │   │   └── AssigneeSelect
│                   │   └── ExportButton        ← deshabilitado si vacío
│                   └── MetricsGrid
│                       ├── TicketsByStatusChart      ← Recharts PieChart / BarChart
│                       ├── TicketsClosedByMonthChart ← Recharts BarChart
│                       └── TicketsByMemberList       ← lista con contadores
```

### 4.3 Componentes compartidos (`/shared`)

| Componente | Props clave | Notas |
|---|---|---|
| `PriorityBadge` | `priority: TicketPriority` | Colores del design system |
| `StatusChip` | `status: TicketStatus` | Colores de `DESIGN.md §5 Status Chips` |
| `BlockedBadge` | — | Siempre rojo (`error_container`), texto "Bloqueado" |
| `AssigneeAvatar` | `user: User` | Iniciales o avatar; stack de hasta 3 + contador |
| `LabelTag` | `label: string` | Fondo `surface_container_high`, texto pequeño caps |
| `DateDisplay` | `date: string` | ISO → formato legible local |

---

## 5. Estructura de Carpetas

```
src/
├── api/                        # funciones fetch tipadas contra el API REST
│   ├── auth.ts                 # POST /api/auth/callback, GET /api/me, POST /api/auth/logout
│   ├── tickets.ts              # GET /api/tickets, POST, PATCH /:id, PATCH /:id/archive
│   ├── comments.ts             # GET /api/tickets/:id/comments, POST, PATCH /:id/archive
│   ├── users.ts                # GET /api/users
│   └── metrics.ts              # GET /api/metrics, GET /api/metrics/export
│
├── components/
│   ├── ui/                     # shadcn/ui generados — NO editar manualmente
│   ├── board/
│   │   ├── KanbanBoard.tsx
│   │   ├── KanbanColumn.tsx
│   │   ├── TicketCard.tsx
│   │   ├── DragOverlay.tsx
│   │   ├── BoardFilters.tsx
│   │   └── BoardToolbar.tsx
│   ├── ticket/
│   │   ├── TicketDrawer.tsx
│   │   ├── TicketHeader.tsx
│   │   ├── TicketDescription.tsx
│   │   ├── TicketMetadata.tsx
│   │   ├── TicketActions.tsx
│   │   ├── TicketForm.tsx      # React Hook Form
│   │   └── ConflictBanner.tsx
│   ├── comments/
│   │   ├── CommentSection.tsx
│   │   ├── CommentList.tsx
│   │   ├── CommentItem.tsx
│   │   └── MentionTextarea.tsx # textarea con @mention popover
│   ├── dashboard/
│   │   ├── DashboardFilters.tsx
│   │   ├── DashboardToolbar.tsx
│   │   ├── MetricsGrid.tsx
│   │   ├── TicketsByStatusChart.tsx
│   │   ├── TicketsClosedByMonthChart.tsx
│   │   ├── TicketsByMemberList.tsx
│   │   └── ExportButton.tsx
│   └── shared/
│       ├── PriorityBadge.tsx
│       ├── StatusChip.tsx
│       ├── BlockedBadge.tsx
│       ├── AssigneeAvatar.tsx
│       ├── LabelTag.tsx
│       └── DateDisplay.tsx
│
├── hooks/                      # TanStack Query wrappers (useQuery / useMutation)
│   ├── useCurrentUser.ts       # GET /api/me, staleTime: Infinity
│   ├── useTickets.ts           # GET /api/tickets con filtros de board
│   ├── useTicket.ts            # GET /api/tickets/:id
│   ├── useCreateTicket.ts
│   ├── useUpdateTicket.ts      # incluye manejo de 409
│   ├── useArchiveTicket.ts
│   ├── useComments.ts
│   ├── useAddComment.ts
│   ├── useArchiveComment.ts
│   ├── useUsers.ts             # GET /api/users, staleTime: 5min
│   └── useMetrics.ts           # GET /api/metrics con filtros de dashboard
│
├── layouts/
│   ├── AppLayout.tsx           # sidebar + outlet
│   ├── PublicLayout.tsx        # centrado, sin nav
│   └── AuthGuard.tsx           # verifica sesión, redirige si 401
│
├── lib/
│   ├── queryClient.ts          # new QueryClient({ defaultOptions: { queries: { refetchInterval: 30_000 } } })
│   ├── schemas.ts              # Zod schemas para formularios
│   └── utils.ts                # cn(), formatDate(), buildExportUrl()
│
├── pages/
│   ├── LoginPage.tsx
│   ├── AuthCallbackPage.tsx
│   ├── BoardPage.tsx
│   └── DashboardPage.tsx
│
├── store/
│   └── useAppStore.ts          # Zustand store (ver §6)
│
├── types/
│   └── index.ts                # todos los tipos del §3
│
├── test/
│   ├── unit/                   # Vitest + Testing Library
│   └── e2e/                    # Playwright
│
├── App.tsx
├── main.tsx
└── vite-env.d.ts
```

---

## 6. Estado Global

### Zustand (`useAppStore`) — solo UI state

```typescript
interface AppStore {
  // Sesión (se hidrata desde GET /api/me al inicio)
  currentUser: CurrentUser | null;
  setCurrentUser: (user: CurrentUser | null) => void;

  // Drawer de ticket
  activeTicketId: string | null;         // sincronizado con ?ticket= en URL
  setActiveTicketId: (id: string | null) => void;

  // Conflicto de edición (Optimistic Locking)
  conflictPayload: TicketFormValues | null;  // datos del form al recibir 409
  setConflictPayload: (payload: TicketFormValues | null) => void;

  // Filtros del tablero
  boardFilters: BoardFilters;
  setBoardFilters: (filters: Partial<BoardFilters>) => void;
  resetBoardFilters: () => void;

  // Filtros del dashboard
  metricsFilters: MetricsFilters;
  setMetricsFilters: (filters: Partial<MetricsFilters>) => void;
}
```

### TanStack Query — server state

| Query key | Endpoint | `staleTime` | `refetchInterval` |
|---|---|---|---|
| `['me']` | `GET /api/me` | `Infinity` | — |
| `['tickets', filters]` | `GET /api/tickets?...` | 0 | 30 000 ms |
| `['ticket', id]` | `GET /api/tickets/:id` | 0 | 30 000 ms |
| `['comments', ticketId]` | `GET /api/tickets/:id/comments` | 0 | 30 000 ms |
| `['users']` | `GET /api/users` | 5 min | — |
| `['metrics', filters]` | `GET /api/metrics?...` | 0 | 30 000 ms |

Tras cualquier mutación exitosa: `queryClient.invalidateQueries` de las queries relacionadas.

---

## 7. Reglas de Negocio en el Frontend

### 7.1 Permisos

La lógica de permisos se evalúa en el cliente solo para **mostrar u ocultar controles**. El backend es la fuente autoritativa.

```typescript
const canEditTicket = (ticket: Ticket, user: CurrentUser) =>
  user.role === 'admin' || ticket.created_by === user.id;

const canArchiveTicket = (ticket: Ticket, user: CurrentUser) =>
  canEditTicket(ticket, user);

const canDeleteComment = (comment: Comment, user: CurrentUser) =>
  user.role === 'admin' || comment.author_id === user.id;

const canViewArchivedTickets = (user: CurrentUser) =>
  user.role === 'admin';
```

- Los botones "Editar" y "Eliminar" se **ocultan** (no solo se deshabilitan) cuando el usuario no tiene permiso.
- Los tickets con `archived_at !== null` nunca se incluyen en las queries del tablero.
- Solo los `admin` pueden ver tickets archivados (endpoint separado, fuera del tablero principal).

### 7.2 Optimistic Locking (409)

1. Al abrir `TicketDrawer`, React Hook Form inicializa el form con todos los campos del ticket, **incluyendo `version`**.
2. En el submit, se hace `PATCH /api/tickets/:id` con `{ ...campos, version }`.
3. **Si la respuesta es 409:**
   - Se almacena el payload actual del form en `conflictPayload` (Zustand).
   - Se muestra `ConflictBanner`: _"Alguien modificó este ticket mientras lo editabas. Recarga para ver los cambios."_
   - El formulario **no se limpia**; el usuario ve sus cambios intactos.
   - El botón "Recargar" del banner llama `queryClient.invalidateQueries(['ticket', id])` y resetea `conflictPayload`.
4. **Si la respuesta es 200:** se invalida la query y se cierra el modo edición.

### 7.3 Estado "Bloqueado"

- `is_blocked` coexiste con cualquier `status`; no ocupa columna propia en el Kanban.
- En `TicketCard`: si `is_blocked === true`, se renderiza `BlockedBadge` (badge rojo, texto "Bloqueado") superpuesto sobre la esquina superior derecha de la tarjeta.
- El toggle de bloqueo emite `PATCH /api/tickets/:id` con `{ is_blocked: !ticket.is_blocked, version }`.
- El `BlockedBadge` también aparece en `TicketHeader` dentro del drawer.

### 7.4 Flujo de Estados (transiciones válidas en UI)

El dropdown de estado en el drawer solo muestra las transiciones permitidas según el estado actual:

| Estado actual | Opciones en el selector |
|---|---|
| `todo` | `in_progress` |
| `in_progress` | `todo`, `review` |
| `review` | `in_progress`, `done` |
| `done` | `review` (solo admin) |

El drag-and-drop en el Kanban respeta las mismas columnas de destino: al soltar en una columna, se emite el PATCH con el nuevo status; si el backend rechaza, se revierte visualmente y se muestra un toast de error.

### 7.5 Exportación CSV

- `ExportButton` usa los `metricsFilters` activos de Zustand para construir los query params.
- El botón está **deshabilitado** cuando `useMetrics` devuelve `data.total === 0`.
- Tooltip sobre el botón deshabilitado: _"No hay datos para el rango seleccionado"_.
- Al hacer clic (estado habilitado): se llama `buildExportUrl(filters)` → se asigna a `window.location.href`. La descarga ocurre sin modal.
- El nombre del archivo lo fija el servidor via `Content-Disposition`.
- Si el servidor responde 400 (rango inválido), se muestra un toast de error y no se descarga nada.
- Si el servidor responde 401, `AuthGuard` captura el error y redirige a `/login`.

### 7.6 @mention en Comentarios

- `MentionTextarea` es un `<textarea>` estándar envuelto en un `Popover` de shadcn/ui.
- Trigger: se detecta `@` seguido de caracteres en el cursor mediante un event listener `onChange`.
- El popover usa el componente `Command` de shadcn/ui para la lista filtrable de usuarios.
- Filtro: `user.name` case-insensitive, empezando por los caracteres tras `@`.
- Al seleccionar un usuario, se inserta `@{user.email.split('@')[0]}` en la posición del cursor.
- El popover se cierra con `Escape`, clic fuera, o al seleccionar un usuario.
- La validación de que el @handle existe es responsabilidad del backend al crear el comentario.

### 7.7 Autenticación OAuth

1. `LoginPage`: botón único "Iniciar sesión con cuenta corporativa" → redirige al proveedor OAuth.
2. `AuthCallbackPage`: extrae `?code=` de la URL → `POST /api/auth/callback { code }` → el backend setea las httpOnly cookies con access + refresh tokens.
3. Tras el `POST` exitoso: `navigate('/board')`.
4. `AuthGuard`: al montar, llama `GET /api/me`. Si `401` → `navigate('/login')`.
5. Logout: `POST /api/auth/logout` → el backend invalida el refresh token en Redis y limpia las cookies → `navigate('/login')`.
6. El token **nunca** se almacena en `localStorage` ni es accesible desde JavaScript del cliente.

### 7.8 Responsivo

| Breakpoint | Comportamiento |
|---|---|
| `< 768px` (mobile) | Sidebar colapsado (hamburguesa). Columnas Kanban en scroll horizontal (`overflow-x-auto`, `min-w-[280px]` por columna). `TicketDrawer` ocupa 100% del ancho. |
| `768px – 1023px` (tablet) | Sidebar visible con iconos. Columnas Kanban con scroll horizontal. `TicketDrawer` ocupa 480px desde la derecha. |
| `≥ 1024px` (desktop) | Sidebar expandido con texto. Columnas Kanban en grid de 4 columnas. `TicketDrawer` ocupa 480px. |

---

## 8. Design System (Implementación)

Basado en `DESIGN.md — "Lucid Efficiency"`.

### Paleta de colores (variables Tailwind)

| Token | Hex | Uso |
|---|---|---|
| `surface` | `#f9f9fb` | Fondo base de la app |
| `surface-low` | `#f2f4f6` | Sidebar, paneles secundarios |
| `surface-lowest` | `#ffffff` | Tarjetas activas, editor |
| `surface-high` | `#e4e9ee` | Items en lista hover |
| `surface-highest` | `#dde3e9` | Command palette inner glow |
| `primary` | `#005bbf` | CTA, links activos |
| `primary-dim` | `#0050a8` | Gradiente de botón primario |
| `on-primary` | `#ffffff` | Texto sobre botón primario |
| `outline-variant` | `#acb3b8` | Ghost border al 15-20% opacity |
| `inverse-surface` | `#0c0e10` | Negro "orgánico" (no #000000) |

### Reglas de implementación

- **Sin bordes 1px para separar secciones.** Usar cambio de `background-color` entre capas.
- **Botón primario:** gradiente `primary → primary-dim` a 145°, radio `6px`.
- **Botón secundario:** sin fondo, `outline-variant` al 20% opacity, texto `primary`.
- **Sombras:** solo `0px 12px 32px rgba(12,14,16,0.04)` para elementos flotantes.
- **Tipografía:** fuente `Inter`. Títulos con `letter-spacing: -0.02em`. Metadata en all-caps con `letter-spacing: +0.05em`.
- **Status chips:** ver tabla de colores en `DESIGN.md §5`.
- **Glassmorphism** (Popover, Command): `background: rgba(255,255,255,0.8)`, `backdrop-filter: blur(24px)`.

---

## 9. Testing

### 9.1 Tests unitarios (Vitest + Testing Library)

Cobertura obligatoria en v1:

| Test | Componente / Hook | Escenario |
|---|---|---|
| Permisos | `canEditTicket`, `canArchiveTicket`, `canDeleteComment` | Todos los casos de la matriz de permisos del PRD §2.1 |
| Optimistic Locking | `useUpdateTicket` | Respuesta 200 normal; respuesta 409 con `conflictPayload` intacto |
| Export button | `ExportButton` | Deshabilitado cuando `total === 0`; tooltip visible; URL construida correctamente |
| Estado Bloqueado | `TicketCard` | Badge rojo visible cuando `is_blocked: true`; ausente cuando `false` |
| @mention | `MentionTextarea` | Popover abre con '@'; filtra usuarios; inserta handle correcto |

### 9.2 Tests E2E (Playwright)

Flujos críticos cubiertos:

| Flujo | Pasos |
|---|---|
| Login OAuth | Redirect → callback → board visible |
| Crear ticket | Formulario → ticket en columna "Por hacer" |
| Mover ticket (DnD) | Drag de "Por hacer" a "En progreso" → columna correcta |
| Editar con conflicto | Dos sesiones → segunda sesión recibe ConflictBanner; datos intactos |
| Exportar CSV | Filtros activos → botón habilitado → descarga inicia |
| CSV vacío | Filtro sin resultados → botón deshabilitado → tooltip visible |
| Permisos member | Intento de editar ticket ajeno → botón ausente |

---

> **Pendiente de confirmación.** Una vez confirmado este documento se procede a implementar.
