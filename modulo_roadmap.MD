# Plan de implementación — Módulo "Roadmap"

**Fecha:** 2026-05-06  
**Alcance:** Crear la vista `/roadmap` — vista de progreso del proyecto agrupada por prioridad.  
**Prerequisitos:** Módulo "Create Issue" completado, módulo "Mover Tarjetas" completado.

---

## Contexto y decisión de diseño

El módulo "Roadmap" **no existe en ninguna spec** (`specs.md`, `frontend-specs.md`, `backlog.md`). Solo el link en el sidebar apunta a `/roadmap` — si el usuario hace clic, obtiene una ruta no registrada (pantalla en blanco).

Dado que el modelo de datos **no tiene** `due_date`, `sprint`, ni `milestone`, un Gantt clásico de línea de tiempo no es posible con los datos actuales. Se diseña en su lugar una **vista de progreso por prioridad (swimlanes)** que:

- Reutiliza `GET /api/tickets` — sin endpoint nuevo en el backend
- Reutiliza `useTickets`, `TicketDrawer`, `StatusChip`, `PriorityBadge` y demás componentes existentes
- Ofrece una perspectiva distinta al tablero Kanban: agrupa por prioridad en lugar de por estado

---

## Estado actual

| Pieza | Existe | Estado |
|---|---|---|
| Ruta `/roadmap` en `App.tsx` | ❌ | Sin registrar — pantalla en blanco al navegar |
| `RoadmapPage.tsx` | ❌ | No existe |
| `src/components/roadmap/` | ❌ | Carpeta inexistente |
| `GET /api/tickets` | ✅ | Funcional — base de datos del roadmap |
| `useTickets(filters)` | ✅ | Reutilizable |
| `TicketDrawer` | ✅ | Reutilizable para abrir detalle desde el roadmap |
| `StatusChip`, `PriorityBadge` | ✅ | Reutilizables |

---

## Diseño de la vista

```
┌─────────────────────────────────────────────────────┐
│  Roadmap                              [Filtros: ▼]  │
│  ██████████████████░░░░░░  68% completado (17/25)   │
├─────────────────────────────────────────────────────┤
│  🔴 Alta prioridad  (8 tickets)  ████░░░░  50%      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐            │
│  │ Ticket A │ │ Ticket B │ │ Ticket C │  …         │
│  │ En prog. │ │ Listo    │ │ Por hacer│            │
│  └──────────┘ └──────────┘ └──────────┘            │
├─────────────────────────────────────────────────────┤
│  🟡 Media prioridad  (10 tickets)  ██████░░  75%    │
│  ┌──────────┐ ┌──────────┐  …                      │
├─────────────────────────────────────────────────────┤
│  🔵 Baja prioridad  (7 tickets)  ████████  100%     │
│  ┌──────────┐  …                                   │
└─────────────────────────────────────────────────────┘
```

**Interacciones:**
- Clic en un chip → abre `TicketDrawer` (mismo mecanismo que `BoardPage`)
- Filtro por asignado y etiqueta (reutiliza el query param de `useTickets`)
- Progreso global y por swimlane calculado en el frontend (sin llamada extra al servidor)

---

## Archivos a crear o modificar

| Acción | Archivo |
|---|---|
| **Nuevo** | `src/pages/RoadmapPage.tsx` |
| **Nuevo** | `src/components/roadmap/RoadmapSwimlane.tsx` |
| **Nuevo** | `src/components/roadmap/RoadmapTicketChip.tsx` |
| **Modifica** | `src/App.tsx` — registrar ruta `/roadmap` |

**Sin cambios:** backend, hooks, tipos, store, `AppLayout.tsx`

---

## Pasos de implementación

### Paso 1 — Registrar la ruta en `App.tsx`

Añadir import de `RoadmapPage` y la ruta `/roadmap` dentro del bloque autenticado:

```tsx
import { RoadmapPage } from '@/pages/RoadmapPage'

// Dentro de <Route element={<AuthGuard><AppLayout /></AuthGuard>}>:
<Route path="/roadmap" element={<RoadmapPage />} />
```

**Criterio de verificación:** navegar a `/roadmap` no produce pantalla en blanco.

---

### Paso 2 — Componente `RoadmapTicketChip`

**Archivo:** `src/components/roadmap/RoadmapTicketChip.tsx`

Tarjeta compacta que representa un ticket en el swimlane. Muestra título truncado y estado. Al hacer clic comunica el ID hacia arriba.

```tsx
interface Props {
  ticket: Ticket
  onClick: (id: string) => void
}
```

**Estructura visual:**
```
┌──────────────────────────┐
│ [StatusChip]             │
│ Título del ticket…       │  ← truncado a 2 líneas
│ [Avatar] [Avatar]        │  ← assignees (máx. 3)
└──────────────────────────┘
```

Estilos:
- Fondo: `bg-white`
- Borde: ninguno (elevación por sombra ambient: `0px 12px 32px rgba(12,14,16,0.04)`)
- Ancho fijo: `min-w-[200px] max-w-[240px]`
- Hover: `bg-[#f2f4f6]`
- Cursor: `cursor-pointer`

---

### Paso 3 — Componente `RoadmapSwimlane`

**Archivo:** `src/components/roadmap/RoadmapSwimlane.tsx`

Fila horizontal para una prioridad. Muestra el header con nombre, contador y mini barra de progreso de esa prioridad. Los chips se despliegan en scroll horizontal.

```tsx
interface Props {
  priority: TicketPriority
  tickets: Ticket[]
  onTicketClick: (id: string) => void
}
```

**Etiquetas de prioridad:**
```ts
const PRIORITY_LABELS: Record<TicketPriority, string> = {
  high:   'Alta prioridad',
  medium: 'Media prioridad',
  low:    'Baja prioridad',
}
```

**Progreso del swimlane:** `done / total * 100` (tickets con `status === 'done'`).

**Estructura visual:**
```tsx
<section>
  {/* Header */}
  <div> <PriorityBadge /> Etiqueta (N tickets) | barra progreso % </div>

  {/* Chips en scroll horizontal */}
  <div className="flex gap-3 overflow-x-auto pb-2">
    {tickets.map(t => <RoadmapTicketChip ... />)}
    {tickets.length === 0 && <EmptyState />}
  </div>
</section>
```

---

### Paso 4 — Página `RoadmapPage`

**Archivo:** `src/pages/RoadmapPage.tsx`

Orquesta todo: carga tickets, calcula progreso global, aplica filtros locales y monta los swimlanes + `TicketDrawer`.

**Estado local** (no necesita Zustand — es específico de esta vista):
```ts
const [assigneeFilter, setAssigneeFilter] = useState<string | null>(null)
const [activeTicketId, setActiveTicketId] = useState<string | null>(null)
```

**Datos:**
```ts
// Reutiliza useTickets con filtros mínimos (sin status — el roadmap muestra todos)
const { data: tickets = [], isLoading } = useTickets({
  status: [],
  priority: [],
  assignee_id: assigneeFilter,
  labels: [],
  created_at_from: null,
  created_at_to: null,
})
```

**Progreso global:**
```ts
const total = tickets.length
const done  = tickets.filter(t => t.status === 'done').length
const pct   = total > 0 ? Math.round((done / total) * 100) : 0
```

**Estructura JSX:**
```tsx
<div className="flex h-full flex-col overflow-hidden">
  {/* Header */}
  <div className="px-6 pt-5 pb-4">
    <h1>Roadmap</h1>

    {/* Filtro por asignado */}
    <select> {users} </select>

    {/* Barra de progreso global */}
    <div> {pct}% completado ({done}/{total}) </div>
    <div> {/* barra visual */} </div>
  </div>

  {/* Swimlanes */}
  <div className="flex-1 overflow-y-auto px-6 pb-6 flex flex-col gap-6">
    {['high', 'medium', 'low'].map(priority => (
      <RoadmapSwimlane
        key={priority}
        priority={priority}
        tickets={tickets.filter(t => t.priority === priority)}
        onTicketClick={setActiveTicketId}
      />
    ))}
  </div>

  {/* Drawer reutilizado */}
  <TicketDrawer
    ticketId={activeTicketId}
    onClose={() => setActiveTicketId(null)}
  />
</div>
```

**Barra de progreso global:**
- Contenedor: `bg-[#f2f4f6]` `h-2` `rounded-full`
- Fill: `bg-[#69f6b8]` con `width: pct%` y transición CSS
- Porcentaje: texto `text-xs text-[#acb3b8]`

**Estado de carga:** spinner centrado (igual al usado en `KanbanBoard`)

**Estado vacío** (0 tickets): mensaje neutro con icono, sin acción.

---

## Orden de ejecución

```
1. Paso 1 (App.tsx)              → habilita la ruta, sin esto nada es visible
2. Paso 2 (RoadmapTicketChip)   → componente hoja, sin dependencias nuevas
3. Paso 3 (RoadmapSwimlane)     → usa RoadmapTicketChip
4. Paso 4 (RoadmapPage)         → ensambla todo
```

**Estimación:** ~2 horas de implementación.

---

## Criterios de aceptación

- [ ] Navegar a `/roadmap` desde el sidebar muestra la página (no pantalla en blanco)
- [ ] Se ven 3 swimlanes: Alta, Media y Baja prioridad, cada una con sus tickets
- [ ] La barra de progreso global refleja correctamente `done / total`
- [ ] Cada swimlane muestra su propio porcentaje de completado
- [ ] Hacer clic en un chip abre el `TicketDrawer` con el detalle del ticket
- [ ] El filtro por asignado reduce los tickets mostrados en todos los swimlanes
- [ ] Los swimlanes vacíos muestran un estado vacío (no se rompe la UI)
- [ ] `pnpm tsc --noEmit` sin errores

---

## Decisiones de diseño documentadas

| Decisión | Motivo |
|---|---|
| Sin nuevo endpoint en backend | `GET /api/tickets` ya devuelve todos los campos necesarios |
| Sin nuevo estado en Zustand | Los filtros del Roadmap son locales a esta vista; no se comparten con Board ni Dashboard |
| Sin Gantt / línea de tiempo | El modelo no tiene `due_date` ni `milestone`; agregar ese campo requeriría migración y está fuera de v1 |
| TicketDrawer reutilizado | Evita duplicar lógica de permisos, edición y comentarios |
| Progreso calculado en frontend | Sin endpoint extra; los datos ya están en el cache de React Query |
