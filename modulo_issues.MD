# Plan de implementación — Módulo "Issues"

**Fecha:** 2026-05-06  
**Alcance:** Crear la vista `/issues` — lista completa de todos los tickets con filtros avanzados y orientación a búsqueda/historial.  
**Prerequisitos:** Módulo "Create Issue" completado, módulo "Mover Tarjetas" completado.

---

## Contexto y decisión de diseño

La ruta `/issues` aparece en el sidebar pero **no está registrada en `App.tsx`** — al hacer clic el usuario obtiene pantalla en blanco. No existe ningún spec ni componente de Issues.

**Issues = Vista completa de TODOS los tickets** (todas las columnas del Kanban en una lista plana). Su propósito es distinto al de las otras vistas ya implementadas: no es para planificar (`/backlog`), ni para ver el estado del trabajo en curso (`/board`), ni para ver el progreso por prioridad (`/roadmap`). Issues está orientada a la **búsqueda y el historial** — el equipo puede encontrar cualquier ticket, independientemente de su estado.

**Diferencias clave entre Backlog e Issues:**

| Aspecto | Backlog | Issues |
|---|---|---|
| Estados por defecto | Solo `todo` | Todos los estados |
| Enfoque | Planificación de trabajo pendiente | Búsqueda e historial completo |
| Acción rápida | Botón "Iniciar" (⚡) | Sin acciones rápidas |
| Orden por defecto | Alta → Media → Baja prioridad | `updated_at` descendente (más reciente primero) |
| Fecha mostrada | `created_at` | `updated_at` |
| Filtro de fecha | No tiene | Rango de fechas de creación (desde/hasta) |
| Filtro de status | Checkbox "Incluir En progreso" | Multi-select completo (4 estados) |

---

## Estado actual

| Pieza | Existe | Estado |
|---|---|---|
| Ruta `/issues` en `App.tsx` | ❌ | Sin registrar — pantalla en blanco al navegar |
| `IssuesPage.tsx` | ❌ | No existe |
| `src/components/issues/` | ❌ | Carpeta inexistente |
| `GET /api/tickets` con filtros | ✅ | Funcional — acepta `status[]`, `priority[]`, `assignee_id`, `label_id`, `created_at_from`, `created_at_to` |
| `useTickets(filters)` | ✅ | Reutilizable |
| `TicketDrawer` | ✅ | Reutilizable para abrir detalle desde Issues |
| `StatusChip` | ✅ | Reutilizable |
| `PriorityBadge` | ✅ | Reutilizable |
| `AssigneeAvatarStack` | ✅ | Reutilizable |
| `LabelTag` | ✅ | Reutilizable |
| `BlockedBadge` | ✅ | Reutilizable |
| `useUsers()` | ✅ | Reutilizable para filtro de asignado |
| `useLabels()` | ✅ | Reutilizable para filtro de etiqueta |

---

## Diseño de la vista

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Issues                                              [Limpiar filtros]  │
│  [Estado ▼ Por hacer ☑ En prog. ☑ Review ☑ Listo ☑]                    │
│  [Alta] [Media] [Baja]  [Asignado ▼]  [Etiqueta ▼]                     │
│  [Desde: ____-__-__]  [Hasta: ____-__-__]                              │
├─────────────────────────────────────────────────────────────────────────┤
│  42 tickets · Todos los estados                                         │
├────────────┬──────────────┬──────────────────────────┬──────┬──────────┤
│  #MJ-07    │ [En progreso]│ Título del ticket A…     │[Alta]│ hace 1h  │
│            │              │ [etiqueta1] [BLOQUEADO]   │      │ [Av][Av] │
├────────────┼──────────────┼──────────────────────────┼──────┼──────────┤
│  #MJ-12    │ [Review]     │ Título del ticket B…     │[Media]│ hace 3h │
│            │              │                           │      │ [Av]     │
├────────────┼──────────────┼──────────────────────────┼──────┼──────────┤
│  #MJ-03    │ [Listo]      │ Título del ticket C…     │[Baja]│ hace 1d  │
│            │              │ [etiqueta2] [etiqueta3]  │      │          │
└────────────┴──────────────┴──────────────────────────┴──────┴──────────┘
  Columnas: short_id | StatusChip | título + labels + BlockedBadge | PriorityBadge | updated_at + avatares
```

**Orden por defecto:** `updated_at` descendente — el ticket modificado más recientemente aparece primero.

**Clic en fila:** abre `TicketDrawer` con el detalle completo del ticket.

---

## Archivos a crear o modificar

| Acción | Archivo |
|---|---|
| **Nuevo** | `src/pages/IssuesPage.tsx` |
| **Nuevo** | `src/components/issues/IssuesToolbar.tsx` |
| **Nuevo** | `src/components/issues/IssuesRow.tsx` |
| **Modifica** | `src/App.tsx` — añadir ruta `/issues` |

**Sin cambios:** backend, tipos, store, hooks.

---

## Pasos de implementación

### Paso 1 — Registrar la ruta en `App.tsx`

```tsx
import { IssuesPage } from '@/pages/IssuesPage'

// Dentro del bloque autenticado (junto a /board, /backlog, /roadmap):
<Route path="/issues" element={<IssuesPage />} />
```

**Criterio:** navegar a `/issues` no produce pantalla en blanco.

---

### Paso 2 — Componente `IssuesToolbar`

**Archivo:** `src/components/issues/IssuesToolbar.tsx`

Barra de filtros local a esta vista. No usa Zustand — los filtros de Issues son independientes de los del Board, Backlog y Roadmap.

```tsx
interface Props {
  statusFilter:       TicketStatus[]
  priorityFilter:     TicketPriority[]
  assigneeFilter:     string | null
  labelFilter:        string | null
  createdAtFrom:      string | null
  createdAtTo:        string | null
  onStatusChange:     (v: TicketStatus[]) => void
  onPriorityChange:   (v: TicketPriority[]) => void
  onAssigneeChange:   (v: string | null) => void
  onLabelChange:      (v: string | null) => void
  onCreatedAtFromChange: (v: string | null) => void
  onCreatedAtToChange:   (v: string | null) => void
  onClear:            () => void
  hasFilters:         boolean
}
```

**Controles:**

- **Estado** — cuatro checkboxes independientes, uno por cada estado del sistema:
  - "Por hacer" (`todo`)
  - "En progreso" (`in_progress`)
  - "Review" (`review`)
  - "Listo" (`done`)
  - Por defecto: todos marcados (array vacío equivale a "sin filtro de estado" en `useTickets`)
  - Al marcar/desmarcar un checkbox se añade o elimina ese status del array `statusFilter`

- **Prioridad** — tres botones toggle (Alta / Media / Baja), selección múltiple, igual que `BacklogToolbar`:
  - Activos: `bg-[#005bbf] text-white`
  - Inactivos: `bg-[#f2f4f6] text-[#0c0e10]`

- **Asignado** — `<select>` con la lista de usuarios de `useUsers()`, opción vacía "Todos los asignados"

- **Etiqueta** — `<select>` con las etiquetas de `useLabels()`, opción vacía "Todas las etiquetas"

- **Fecha de creación desde** — `<input type="date" />` con label "Desde"

- **Fecha de creación hasta** — `<input type="date" />` con label "Hasta"

- **"Limpiar filtros"** — botón solo visible cuando `hasFilters === true`; resetea todos los controles al estado inicial

**Diseño:**
- Fondo `bg-white`, borde inferior `border-[#e4e9ee]/50`
- Selects con `bg-[#f2f4f6]`, sin borde, `focus:ring-[#005bbf]`
- Inputs de fecha: mismos estilos que los selects, ancho fijo `w-36`
- Los checkboxes de estado se agrupan horizontalmente con `accent-[#005bbf]`
- Toda la toolbar en dos filas si el espacio es estrecho (flex-wrap)

---

### Paso 3 — Componente `IssuesRow`

**Archivo:** `src/components/issues/IssuesRow.tsx`

Fila que representa un ticket. Una sola línea de altura cómoda, sin botón de acción rápida. Distinto de `BacklogRow`.

```tsx
interface Props {
  ticket: Ticket
  onOpen: (id: string) => void
}
```

**Columnas de izquierda a derecha:**

| Columna | Contenido | Ancho aprox. |
|---|---|---|
| `short_id` | ID corto del ticket (ej. `#MJ-07`) en `text-[0.6875rem] text-[#acb3b8]` | `w-20` fijo |
| `StatusChip` | Estado actual del ticket | `w-32` fijo |
| Título | Texto truncado a 1 línea + etiquetas (`LabelTag`) + `BlockedBadge` si `is_blocked` | `flex-1` (crece) |
| `PriorityBadge` | Prioridad del ticket | `w-20` fijo |
| Asignados | `AssigneeAvatarStack` con los avatares | `w-20` fijo |
| `updated_at` | Fecha formateada como texto relativo (ej. `hace 2h`, `hace 3d`) | `w-24` fijo, `text-right text-[#acb3b8] text-xs` |

**Detalles:**
- El clic en cualquier parte de la fila llama `onOpen(ticket.id)`
- Sin botón "Iniciar" — Issues no tiene acciones rápidas
- `short_id`: si no existe en el ticket, la celda queda vacía (sin error)
- `BlockedBadge` se renderiza solo cuando `ticket.is_blocked === true`
- Las etiquetas (`LabelTag`) se muestran dentro de la celda de título, en línea con el texto
- Fila completa: `hover:bg-[#f2f4f6]` con transición, separada de la siguiente por `border-b border-[#e4e9ee]/40`
- Cursor: `cursor-pointer` en toda la fila

**Estructura JSX de referencia:**
```tsx
<div
  role="row"
  onClick={() => onOpen(ticket.id)}
  className="flex items-center gap-4 px-6 py-3 cursor-pointer hover:bg-[#f2f4f6] transition-colors border-b border-[#e4e9ee]/40"
>
  {/* short_id */}
  <span className="w-20 shrink-0 text-[0.6875rem] text-[#acb3b8]">
    {ticket.short_id ? `#${ticket.short_id}` : null}
  </span>

  {/* StatusChip */}
  <div className="w-32 shrink-0">
    <StatusChip status={ticket.status} />
  </div>

  {/* Título + etiquetas + bloqueado */}
  <div className="flex-1 min-w-0 flex flex-col gap-0.5">
    <span className="truncate text-sm text-[#0c0e10]">{ticket.title}</span>
    <div className="flex items-center gap-1 flex-wrap">
      {ticket.labels.map(l => <LabelTag key={l.id} label={l} />)}
      {ticket.is_blocked && <BlockedBadge />}
    </div>
  </div>

  {/* PriorityBadge */}
  <div className="w-20 shrink-0">
    <PriorityBadge priority={ticket.priority} />
  </div>

  {/* Assignees */}
  <div className="w-20 shrink-0">
    <AssigneeAvatarStack assignees={ticket.assignees} max={3} />
  </div>

  {/* updated_at */}
  <span className="w-24 shrink-0 text-right text-xs text-[#acb3b8]">
    {formatRelative(ticket.updated_at)}
  </span>
</div>
```

`formatRelative` es una función utilitaria local que convierte un ISO timestamp a texto como `hace 2h`, `hace 3d`, `hace 1sem`. No requiere librería externa — basta aritmética con `Date.now()`.

---

### Paso 4 — Página `IssuesPage`

**Archivo:** `src/pages/IssuesPage.tsx`

Orquesta filtros, datos, lista y drawer.

**Estado local:**
```ts
const [statusFilter,    setStatusFilter]    = useState<TicketStatus[]>([])
const [priorityFilter,  setPriorityFilter]  = useState<TicketPriority[]>([])
const [assigneeFilter,  setAssigneeFilter]  = useState<string | null>(null)
const [labelFilter,     setLabelFilter]     = useState<string | null>(null)
const [createdAtFrom,   setCreatedAtFrom]   = useState<string | null>(null)
const [createdAtTo,     setCreatedAtTo]     = useState<string | null>(null)
const [activeTicketId,  setActiveTicketId]  = useState<string | null>(null)
```

**`hasFilters` calculado:**
```ts
const hasFilters =
  statusFilter.length > 0 ||
  priorityFilter.length > 0 ||
  assigneeFilter !== null ||
  labelFilter !== null ||
  createdAtFrom !== null ||
  createdAtTo !== null
```

**`handleClear`:**
```ts
function handleClear() {
  setStatusFilter([])
  setPriorityFilter([])
  setAssigneeFilter(null)
  setLabelFilter(null)
  setCreatedAtFrom(null)
  setCreatedAtTo(null)
}
```

**Datos:**
```ts
// Sin filtro de status activo → array vacío → el hook devuelve todos los estados
const { data: tickets = [], isLoading } = useTickets({
  status:          statusFilter as TicketStatus[],
  priority:        priorityFilter,
  assignee_id:     assigneeFilter,
  labels:          labelFilter ? [labelFilter] : [],
  created_at_from: createdAtFrom,
  created_at_to:   createdAtTo,
})
```

**Ordenamiento en el cliente** (sin llamada extra al servidor):
```ts
const sorted = [...tickets].sort((a, b) =>
  new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
)
```

**Contador en el header:**
```tsx
<span className="text-[0.6875rem] text-[#acb3b8]">
  {tickets.length} ticket{tickets.length !== 1 ? 's' : ''} · {
    statusFilter.length === 0
      ? 'Todos los estados'
      : statusFilter.map(s => STATUS_LABELS[s]).join(', ')
  }
</span>
```

Donde `STATUS_LABELS` es un mapeo local:
```ts
const STATUS_LABELS: Record<TicketStatus, string> = {
  todo:        'Por hacer',
  in_progress: 'En progreso',
  review:      'Review',
  done:        'Listo',
}
```

**Spinner:** mismo componente o patrón que el usado en `KanbanBoard` — centrado verticalmente en el área de lista.

**Estado vacío diferenciado:**
- Si `hasFilters === true`: _"No hay tickets con los filtros seleccionados."_ + botón "Limpiar filtros"
- Si `hasFilters === false`: _"No hay tickets en el proyecto todavía."_ (sin acción)

**Estructura JSX:**
```tsx
<div className="flex h-full flex-col overflow-hidden">
  {/* Header */}
  <div className="border-b border-[#e4e9ee]/50 bg-white px-6 py-4">
    <div className="flex items-center justify-between">
      <h1 className="text-lg font-semibold text-[#0c0e10]">Issues</h1>
      <span className="text-[0.6875rem] text-[#acb3b8]">
        {tickets.length} tickets · ...
      </span>
    </div>
  </div>

  {/* Toolbar */}
  <IssuesToolbar
    statusFilter={statusFilter}
    priorityFilter={priorityFilter}
    assigneeFilter={assigneeFilter}
    labelFilter={labelFilter}
    createdAtFrom={createdAtFrom}
    createdAtTo={createdAtTo}
    onStatusChange={setStatusFilter}
    onPriorityChange={setPriorityFilter}
    onAssigneeChange={setAssigneeFilter}
    onLabelChange={setLabelFilter}
    onCreatedAtFromChange={setCreatedAtFrom}
    onCreatedAtToChange={setCreatedAtTo}
    onClear={handleClear}
    hasFilters={hasFilters}
  />

  {/* Lista */}
  <div className="flex-1 overflow-y-auto">
    {isLoading ? (
      <Spinner />
    ) : sorted.length === 0 ? (
      <EmptyState hasFilters={hasFilters} onClear={handleClear} />
    ) : (
      <div role="table" className="divide-y divide-[#e4e9ee]/40">
        {sorted.map(ticket => (
          <IssuesRow
            key={ticket.id}
            ticket={ticket}
            onOpen={setActiveTicketId}
          />
        ))}
      </div>
    )}
  </div>

  {/* Drawer */}
  <TicketDrawer
    ticketId={activeTicketId}
    onClose={() => setActiveTicketId(null)}
  />
</div>
```

---

## Orden de ejecución

```
1. Paso 1 (App.tsx)         → habilita la ruta, sin esto nada es visible
2. Paso 2 (IssuesToolbar)   → componente hoja, sin dependencias nuevas
3. Paso 3 (IssuesRow)       → componente hoja, usa shared components
4. Paso 4 (IssuesPage)      → ensambla todo
```

**Estimación:** ~2 horas de implementación.

---

## Criterios de aceptación

- [ ] Navegar a `/issues` desde el sidebar muestra la página (no pantalla en blanco)
- [ ] Por defecto se muestran tickets de todos los estados, ordenados por `updated_at` descendente
- [ ] Cada fila muestra: `short_id`, `StatusChip`, título truncado, etiquetas, `BlockedBadge` (si aplica), `PriorityBadge`, avatares de asignados y fecha `updated_at` relativa
- [ ] El badge "Bloqueado" solo aparece en tickets donde `is_blocked === true`
- [ ] Los checkboxes de estado filtran la lista correctamente (cada estado de forma independiente)
- [ ] Los botones toggle de prioridad filtran la lista correctamente (selección múltiple)
- [ ] El filtro por asignado reduce la lista correctamente
- [ ] El filtro por etiqueta reduce la lista correctamente
- [ ] Los inputs de fecha "Desde" y "Hasta" filtran por `created_at` correctamente
- [ ] El botón "Limpiar filtros" solo es visible cuando hay al menos un filtro activo
- [ ] Al limpiar, todos los controles vuelven a su estado inicial y se muestran todos los tickets
- [ ] Al hacer clic en una fila se abre el `TicketDrawer` con el detalle completo
- [ ] No hay botón "Iniciar" ni ninguna otra acción rápida en la fila
- [ ] Estado vacío con filtros activos muestra mensaje apropiado y botón "Limpiar filtros"
- [ ] Estado vacío sin filtros muestra mensaje neutro sin acción
- [ ] El spinner aparece durante la carga inicial
- [ ] `pnpm tsc --noEmit` sin errores

---

## Decisiones de diseño documentadas

| Decisión | Motivo |
|---|---|
| Filtros en estado local (no Zustand) | Los filtros de Issues son independientes de los del Board, Backlog y Roadmap — no se comparten |
| `status: []` por defecto (todos los estados) | Issues es la vista de historial completo; mostrar solo `todo` sería redundante con el Backlog |
| Ordenamiento por `updated_at` desc en el cliente | Los datos ya están en cache de React Query; sin llamada extra. El ticket más recientemente modificado es el más relevante en una vista de historial |
| Sin botón "Iniciar" | Issues no es una vista de planificación sino de búsqueda; las acciones se realizan desde el `TicketDrawer` |
| `IssuesRow` distinto de `BacklogRow` | Las columnas son diferentes (añade `StatusChip` y `updated_at`, elimina el botón de acción); reusar `BacklogRow` con flags condicionales haría el componente más difícil de mantener |
| Multi-select de estado con checkboxes | La vista de Issues necesita filtrar por combinaciones arbitrarias de estados (ej. "En progreso + Review"); el checkbox simple de Backlog no cubre ese caso |
| Filtro de rango de fechas `created_at` | El backend ya acepta `created_at_from` y `created_at_to` — no requiere trabajo extra en el servidor; es útil para auditoría e historial |
| Sin paginación | El volumen de tickets en v1 no justifica la complejidad; añadir si supera ~200 items o si el rendimiento del scroll lo requiere |
