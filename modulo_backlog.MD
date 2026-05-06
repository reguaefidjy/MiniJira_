# Plan de implementación — Módulo "Backlog"

**Fecha:** 2026-05-06  
**Alcance:** Crear la vista `/backlog` — lista plana de tickets pendientes con filtros y acción rápida "Iniciar".  
**Prerequisitos:** Módulo "Create Issue" y módulo "Mover Tarjetas" completados.

---

## Contexto y decisión de diseño

La ruta `/backlog` está en el sidebar pero **no está registrada en `App.tsx`** — al hacer clic el usuario obtiene pantalla en blanco. No existe ningún spec ni componente de Backlog.

El archivo `backlog.md` del repositorio es el documento de historias de usuario del PO (Gherkin), **no es una spec de la vista**.

**Diferencia clave con el Board:**

| Vista | Formato | Enfoque |
|---|---|---|
| **Board** | Kanban 4 columnas | Ver estado actual del trabajo en curso |
| **Backlog** | Lista plana | Planificar lo que aún no se ha comenzado |

El Backlog muestra los tickets en estado `todo` (la "cola de trabajo pendiente"). Permite al equipo priorizar, filtrar y pasar tickets directamente a "En progreso" con un clic.

---

## Estado actual

| Pieza | Existe | Estado |
|---|---|---|
| Ruta `/backlog` en `App.tsx` | ❌ | Sin registrar |
| `BacklogPage.tsx` | ❌ | No existe |
| `src/components/backlog/` | ❌ | Carpeta inexistente |
| `GET /api/tickets?status=todo` | ✅ | Funcional |
| `useTickets(filters)` | ✅ | Reutilizable |
| `useUpdateTicket` | ✅ | Reutilizable para acción "Iniciar" |
| `TicketDrawer` | ✅ | Reutilizable para editar desde el backlog |
| `canEditTicket` | ✅ | Reutilizable para mostrar/ocultar "Iniciar" |

---

## Diseño de la vista

```
┌──────────────────────────────────────────────────────────────────┐
│  Backlog                                      [Limpiar filtros]  │
│  [Prioridad ▼]  [Asignado ▼]  [Etiqueta ▼]  [□ Incluir En prog.]│
├──────────────────────────────────────────────────────────────────┤
│  24 tickets · Por hacer                                          │
├──────────────────────────────────────────────────────────────────┤
│  #MJ-07  [Alta]  Título del ticket A         [Por hacer]  [⚡]  │
│          [etiqueta1]  ·  hace 2 días          [Av] [Av]         │
├──────────────────────────────────────────────────────────────────┤
│  #MJ-12  [Alta]  Título del ticket B         [Por hacer]  [⚡]  │
│          ·  hace 5 días                       [Av]              │
├──────────────────────────────────────────────────────────────────┤
│  #MJ-03  [Media] Título del ticket C         [Por hacer]        │
│          [etiqueta2]  ·  hace 1 semana                          │
└──────────────────────────────────────────────────────────────────┘
  [⚡] = botón "Iniciar" — solo visible si el usuario puede editar el ticket
```

**Orden por defecto:** Alta → Media → Baja prioridad; dentro de cada prioridad, más reciente primero.

**Acción "Iniciar" (⚡):** llama a `updateTicket({ status: 'in_progress', version: ticket.version })`. Solo se muestra cuando `canEditTicket(ticket, currentUser)` es `true` y el ticket está en `todo`.

---

## Archivos a crear o modificar

| Acción | Archivo |
|---|---|
| **Nuevo** | `src/pages/BacklogPage.tsx` |
| **Nuevo** | `src/components/backlog/BacklogToolbar.tsx` |
| **Nuevo** | `src/components/backlog/BacklogRow.tsx` |
| **Modifica** | `src/App.tsx` — registrar ruta `/backlog` |

**Sin cambios:** backend, tipos, store, hooks.

---

## Pasos de implementación

### Paso 1 — Registrar la ruta en `App.tsx`

```tsx
import { BacklogPage } from '@/pages/BacklogPage'

// Dentro del bloque autenticado:
<Route path="/backlog" element={<BacklogPage />} />
```

**Criterio:** navegar a `/backlog` no produce pantalla en blanco.

---

### Paso 2 — Componente `BacklogToolbar`

**Archivo:** `src/components/backlog/BacklogToolbar.tsx`

Barra de filtros local a esta vista. No usa Zustand — los filtros del Backlog son independientes de los del Board.

```tsx
interface Props {
  priorityFilter:    TicketPriority[]
  assigneeFilter:    string | null
  labelFilter:       string | null
  includeInProgress: boolean
  onPriorityChange:    (v: TicketPriority[]) => void
  onAssigneeChange:    (v: string | null) => void
  onLabelChange:       (v: string | null) => void
  onIncludeInProgressChange: (v: boolean) => void
  onClear: () => void
  hasFilters: boolean
}
```

**Controles:**
- **Prioridad** — tres botones toggle (Alta / Media / Baja), selección múltiple
- **Asignado** — `<select>` con usuarios de `useUsers()`
- **Etiqueta** — `<select>` con etiquetas de `useLabels()`
- **Checkbox** — "Incluir En progreso" (cuando está activo, añade `in_progress` al filtro de status)
- **"Limpiar filtros"** — solo visible cuando `hasFilters === true`

**Diseño:**
- Fondo `bg-white`, borde inferior `border-[#e4e9ee]/50`
- Botones toggle de prioridad: activos con `bg-[#005bbf] text-white`, inactivos con `bg-[#f2f4f6] text-[#0c0e10]`
- Selects con `bg-[#f2f4f6]`, sin borde, `focus:ring-[#005bbf]`

---

### Paso 3 — Componente `BacklogRow`

**Archivo:** `src/components/backlog/BacklogRow.tsx`

Fila que representa un ticket. Dos líneas de información, acción "Iniciar" condicional.

```tsx
interface Props {
  ticket:      Ticket
  currentUser: CurrentUser | null
  onOpen:      (id: string) => void
  onStart:     (ticket: Ticket) => void
  isStarting:  boolean
}
```

**Estructura visual:**

```
┌────────────────────────────────────────────────────────────────┐
│ [#MJ-07]  [Alta]  Título del ticket                            │
│           [etiqueta] [etiqueta]  ·  hace N días  [Av][Av]  [⚡]│
└────────────────────────────────────────────────────────────────┘
```

**Detalles:**
- El clic en cualquier parte de la fila (excepto el botón ⚡) abre `TicketDrawer`
- El botón "Iniciar" (⚡):
  - Solo se renderiza si `ticket.status === 'todo'` y `canEditTicket(ticket, currentUser)`
  - Muestra spinner si `isStarting` es true para ese ticket
  - Llama `onStart(ticket)` al hacer clic, con `stopPropagation()` para no abrir el drawer
- `short_id`: `text-[0.6875rem] text-[#acb3b8]` — si no existe, no se renderiza
- Fecha: `DateDisplay` o texto `hace N días` calculado desde `ticket.created_at`
- Fila completa: `hover:bg-[#f2f4f6]` con transición, separada de la siguiente por `border-b border-[#e4e9ee]/40`

**Botón "Iniciar":**
```tsx
<button
  onClick={(e) => { e.stopPropagation(); onStart(ticket) }}
  disabled={isStarting}
  title="Mover a En progreso"
  className="... rounded-md border px-2 py-1 text-xs text-[#005bbf] disabled:opacity-50"
  style={{ borderColor: 'rgba(172,179,184,0.20)' }}
>
  {isStarting ? '…' : '⚡ Iniciar'}
</button>
```

---

### Paso 4 — Página `BacklogPage`

**Archivo:** `src/pages/BacklogPage.tsx`

Orquesta filtros, datos, lista y drawer.

**Estado local:**
```ts
const [priorityFilter,    setPriorityFilter]    = useState<TicketPriority[]>([])
const [assigneeFilter,    setAssigneeFilter]    = useState<string | null>(null)
const [labelFilter,       setLabelFilter]       = useState<string | null>(null)
const [includeInProgress, setIncludeInProgress] = useState(false)
const [activeTicketId,    setActiveTicketId]    = useState<string | null>(null)
const [startingId,        setStartingId]        = useState<string | null>(null)
```

**Datos:**
```ts
const currentUser = useAppStore((s) => s.currentUser)

// Status: por defecto solo 'todo'; si includeInProgress, añadir 'in_progress'
const statusFilter = includeInProgress ? ['todo', 'in_progress'] : ['todo']

const { data: tickets = [], isLoading } = useTickets({
  status:          statusFilter as TicketStatus[],
  priority:        priorityFilter,
  assignee_id:     assigneeFilter,
  labels:          labelFilter ? [labelFilter] : [],
  created_at_from: null,
  created_at_to:   null,
})

const { mutate: updateTicket } = useUpdateTicket()
```

**Ordenamiento** (en el cliente, sin llamada extra):
```ts
const PRIORITY_ORDER: Record<TicketPriority, number> = { high: 0, medium: 1, low: 2 }

const sorted = [...tickets].sort((a, b) => {
  const byPriority = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
  if (byPriority !== 0) return byPriority
  return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
})
```

**Acción "Iniciar":**
```ts
function handleStart(ticket: Ticket) {
  setStartingId(ticket.id)
  updateTicket(
    { id: ticket.id, data: { status: 'in_progress', version: ticket.version } },
    { onSettled: () => setStartingId(null) },
  )
}
```

**Contador en el header:**
```tsx
<span className="text-[0.6875rem] text-[#acb3b8]">
  {tickets.length} ticket{tickets.length !== 1 ? 's' : ''} · {includeInProgress ? 'Por hacer y En progreso' : 'Por hacer'}
</span>
```

**Estructura JSX:**
```tsx
<div className="flex h-full flex-col overflow-hidden">
  {/* Header */}
  <div className="border-b border-[#e4e9ee]/50 bg-white px-6 py-4">
    <div className="flex items-center justify-between">
      <h1>Backlog</h1>
      <span>{tickets.length} tickets · ...</span>
    </div>
  </div>

  {/* Toolbar */}
  <BacklogToolbar ... />

  {/* Lista */}
  <div className="flex-1 overflow-y-auto">
    {isLoading ? <Spinner /> : sorted.length === 0 ? <EmptyState /> : (
      <div className="divide-y divide-[#e4e9ee]/40">
        {sorted.map(ticket => (
          <BacklogRow
            key={ticket.id}
            ticket={ticket}
            currentUser={currentUser}
            onOpen={setActiveTicketId}
            onStart={handleStart}
            isStarting={startingId === ticket.id}
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

**Estado vacío:**
- Si hay filtros activos: _"No hay tickets con los filtros seleccionados."_ + botón "Limpiar filtros"
- Si no hay filtros: _"El backlog está vacío. ¡Todo el trabajo está en marcha!"_

---

## Orden de ejecución

```
1. Paso 1 (App.tsx)           → habilita la ruta
2. Paso 2 (BacklogToolbar)    → componente hoja, sin dependencias nuevas
3. Paso 3 (BacklogRow)        → componente hoja, usa canEditTicket
4. Paso 4 (BacklogPage)       → ensambla todo
```

**Estimación:** ~2 horas de implementación.

---

## Criterios de aceptación

- [ ] Navegar a `/backlog` desde el sidebar muestra la página (no pantalla en blanco)
- [ ] Por defecto se muestran solo los tickets en `todo`, ordenados Alta → Media → Baja
- [ ] El filtro por prioridad (toggle buttons) reduce la lista correctamente
- [ ] El filtro por asignado reduce la lista correctamente
- [ ] El filtro por etiqueta reduce la lista correctamente
- [ ] El checkbox "Incluir En progreso" añade los tickets `in_progress` a la lista
- [ ] El botón "Iniciar" solo aparece en tickets `todo` que el usuario puede editar
- [ ] Al hacer clic en "Iniciar", el ticket desaparece del backlog y se mueve al board (`in_progress`)
- [ ] Al hacer clic en una fila, se abre el `TicketDrawer` con el detalle completo
- [ ] Estado vacío muestra mensaje apropiado según haya o no filtros activos
- [ ] `pnpm tsc --noEmit` sin errores

---

## Decisiones de diseño documentadas

| Decisión | Motivo |
|---|---|
| Filtros en estado local (no Zustand) | Los filtros del Backlog no se comparten con Board ni Roadmap |
| `status: ['todo']` por defecto | El backlog = trabajo pendiente; mostrar todo mezclaría con el Board |
| Ordenamiento en el cliente | Los datos ya están en cache de React Query; sin llamada extra |
| "Iniciar" respeta `canEditTicket` | Consistente con las reglas de permisos del Board y el TicketDrawer |
| Sin paginación | El volumen de tickets `todo` en v1 no justifica la complejidad; añadir si supera ~200 items |
