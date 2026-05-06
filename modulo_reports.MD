# Plan de implementación — Módulo "Reports"

**Fecha:** 2026-05-06  
**Alcance:** Crear la vista `/reports` — métricas del proyecto con filtros interactivos y exportación CSV.  
**Prerequisitos:** Módulo "Dashboard" completado y funcional (`/dashboard` con `MetricsGrid` y `ExportButton`).

---

## Contexto y decisión de diseño

La ruta `/reports` está en el sidebar pero **no está registrada en `App.tsx`** — al hacer clic el usuario obtiene pantalla en blanco. No existe ningún componente de Reports.

El Dashboard (`/dashboard`) ya muestra los gráficos de métricas correctamente, pero su `DashboardToolbar` **no expone controles de filtro al usuario**. Los `metricsFilters` de Zustand están fijos en sus valores por defecto (desde el primer día del mes hasta hoy, todos los estados, todos los asignados) y el usuario no puede modificarlos desde la UI.

**Decisión: Reports = Dashboard con filtros funcionales.**

En lugar de duplicar la lógica de gráficos, Reports reutiliza íntegramente `MetricsGrid` y añade lo que le falta al Dashboard: una toolbar con controles reales que el usuario puede manipular.

| Vista | Filtros | Filtros en | Exportar |
|---|---|---|---|
| **Dashboard** | Fijos (defaults de Zustand) | Zustand (no expuestos) | Sí (usa Zustand) |
| **Reports** | Interactivos (date, status, asignado) | Estado local | Sí (usa filtros locales) |

**Por qué filtros en estado local y no en Zustand:**  
Los filtros de Reports son propios de esta vista. No deben afectar al Dashboard ni a ninguna otra página. Zustand es correcto para estado compartido entre rutas; aquí no se necesita.

**Por qué no reutilizar `ExportButton` directamente:**  
`ExportButton` obtiene los filtros desde `metricsFilters` de Zustand internamente. En Reports los filtros viven en estado local del componente. El botón de exportar de Reports debe construir la URL con `buildExportUrl` pasándole los filtros locales, sin acoplarse al store.

**Sin nuevos endpoints de backend:** `GET /api/metrics` y `GET /api/metrics/export` ya aceptan los query params necesarios (`from`, `to`, `status[]`, `assignee_id`).

---

## Estado actual

| Pieza | Existe | Estado |
|---|---|---|
| Ruta `/reports` en `App.tsx` | ❌ | Sin registrar — pantalla en blanco al navegar |
| `ReportsPage.tsx` | ❌ | No existe |
| `src/components/reports/` | ❌ | Carpeta inexistente |
| `ReportsToolbar.tsx` | ❌ | No existe |
| `GET /api/metrics` | ✅ | Funcional — acepta `from`, `to`, `status[]`, `assignee_id` |
| `GET /api/metrics/export` | ✅ | Funcional — mismos query params |
| `useMetrics(filters)` | ✅ | Reutilizable tal cual |
| `MetricsGrid` | ✅ | Reutilizable tal cual — recibe `data: MetricsSnapshot` |
| `ExportButton` | ✅ | No reutilizable directamente (usa Zustand internamente) |
| `buildExportUrl(filters)` | ✅ | Reutilizable — construye la URL con filtros arbitrarios |
| `fetchMetrics(filters)` | ✅ | Reutilizable |
| `MetricsFilters`, `MetricsSnapshot` | ✅ | Tipos completos en `src/types/index.ts` |
| `todayISO()`, `firstDayOfMonthISO()` | ✅ | Disponibles en `src/lib/utils.ts` |
| `useUsers()` | ✅ | Reutilizable — devuelve `User[]` |

---

## Diseño de la vista

```
┌──────────────────────────────────────────────────────────────────┐
│  Reports                                                         │
├──────────────────────────────────────────────────────────────────┤
│  Desde [____2026-05-01____]  Hasta [____2026-05-06____]          │
│                                                                  │
│  Estado:  [✓ Por hacer]  [✓ En progreso]  [✓ En revisión]       │
│           [✓ Listo]                                              │
│                                                                  │
│  Asignado:  [Todos ▼]                  [Exportar CSV  ↓]        │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────────────────┐  ┌─────────────────────────────────┐│
│  │   Tickets por estado   │  │    Tickets cerrados por mes     ││
│  │      [PieChart]        │  │         [BarChart]              ││
│  └────────────────────────┘  └─────────────────────────────────┘│
│                                                                  │
│  ┌──────────────────────────────────────────────────────────────┐│
│  │              Carga por miembro                               ││
│  │  [Avatar] Ana García       ████████░░░░  8 tickets          ││
│  │  [Avatar] Carlos López     ██████░░░░░░  6 tickets          ││
│  │  [Avatar] María Torres     ████░░░░░░░░  4 tickets          ││
│  └──────────────────────────────────────────────────────────────┘│
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

**Interacciones:**
- Cambiar cualquier filtro recalcula las métricas en tiempo real (React Query con los filtros como key)
- El botón "Exportar CSV" descarga el archivo con los filtros activos en ese momento (no los del Dashboard)
- Estado de carga: spinner centrado mientras `useMetrics` está en `isPending`
- Estado de error: mensaje de error inline con botón de reintento
- Sin paginación — `MetricsGrid` muestra la snapshot completa

---

## Archivos a crear o modificar

| Acción | Archivo |
|---|---|
| **Nuevo** | `src/pages/ReportsPage.tsx` |
| **Nuevo** | `src/components/reports/ReportsToolbar.tsx` |
| **Modifica** | `src/App.tsx` — añadir ruta `/reports` |

**Sin cambios:** backend, hooks, tipos, store, `AppLayout.tsx`, `MetricsGrid.tsx`, `ExportButton.tsx`.

---

## Pasos de implementación

### Paso 1 — Registrar la ruta en `App.tsx`

Añadir el import de `ReportsPage` y la ruta `/reports` dentro del bloque autenticado, junto a las demás rutas de la aplicación:

```tsx
import { ReportsPage } from '@/pages/ReportsPage'

// Dentro de <Route element={<AuthGuard><AppLayout /></AuthGuard>}>:
<Route path="/reports" element={<ReportsPage />} />
```

**Criterio de verificación:** navegar a `/reports` desde el sidebar no produce pantalla en blanco.

---

### Paso 2 — Componente `ReportsToolbar`

**Archivo:** `src/components/reports/ReportsToolbar.tsx`

Barra de filtros local a la vista de Reports. Controla las fechas, los estados y el asignado. También aloja el botón de exportación. No usa Zustand — todos los valores le llegan por props y comunica cambios hacia arriba con callbacks.

**Interface de props:**

```tsx
interface Props {
  from:           string
  to:             string
  statusFilter:   TicketStatus[]
  assigneeFilter: string | null
  users:          User[]
  onFromChange:    (v: string) => void
  onToChange:      (v: string) => void
  onStatusChange:  (v: TicketStatus[]) => void
  onAssigneeChange:(v: string | null) => void
  onExport:        () => void
}
```

**Controles:**

**Selector de fechas (`from` / `to`):**
- Dos `<input type="date">` con etiquetas "Desde" y "Hasta"
- Valor controlado con `value` y `onChange`
- El input `to` no puede ser anterior a `from` — añadir `min={from}` en el input `to` y `max={to}` en el input `from`
- Estilos: `bg-[#f2f4f6]` `rounded-lg` `px-3 py-2` `text-sm text-[#0c0e10]` sin borde visible, `focus:outline-none focus:ring-2 focus:ring-[#005bbf]`

**Toggles de estado (`statusFilter`):**
- Cuatro botones toggle, uno por cada `TicketStatus`: `todo`, `in_progress`, `in_review`, `done`
- Etiquetas: "Por hacer", "En progreso", "En revisión", "Listo"
- Selección múltiple — array vacío significa "todos los estados"
- Activo: `background: linear-gradient(145deg, #005bbf, #0050a8)` `text-white`
- Inactivo: `bg-[#f2f4f6]` `text-[#0c0e10]`
- Ambos estados: `rounded-md` `px-3 py-1.5` `text-xs font-medium` sin sombra de Tailwind

**Selector de asignado:**
- `<select>` con la lista de usuarios de `useUsers()` (recibida por props para no hacer la llamada aquí)
- Primera opción: `value=""` → "Todos"
- Resto de opciones: `value={user.id}` → `user.name`
- Estilos: `bg-[#f2f4f6]` `rounded-lg` `px-3 py-2` `text-sm text-[#0c0e10]` sin borde visible

**Botón "Exportar CSV":**
- Alineado a la derecha de la toolbar
- Llama `onExport()` al hacer clic
- Estilos: `background: linear-gradient(145deg, #005bbf, #0050a8)` `text-white` `rounded-lg` `px-4 py-2` `text-sm font-medium`
- Sin `shadow-*` de Tailwind; elevación solo con la sombra flotante si se desea: `box-shadow: 0px 12px 32px rgba(12,14,16,0.04)`

**Estructura visual del componente:**

```tsx
<div className="border-b border-[#e4e9ee]/50 bg-white px-6 py-4 flex flex-wrap items-end gap-4">

  {/* Fechas */}
  <div className="flex items-end gap-3">
    <label className="flex flex-col gap-1">
      <span className="text-xs text-[#acb3b8]">Desde</span>
      <input type="date" value={from} max={to} onChange={...} className="..." />
    </label>
    <label className="flex flex-col gap-1">
      <span className="text-xs text-[#acb3b8]">Hasta</span>
      <input type="date" value={to} min={from} onChange={...} className="..." />
    </label>
  </div>

  {/* Estado */}
  <div className="flex flex-col gap-1">
    <span className="text-xs text-[#acb3b8]">Estado</span>
    <div className="flex gap-2">
      {STATUS_OPTIONS.map(({ value, label }) => (
        <button key={value} onClick={...} className={...}>
          {label}
        </button>
      ))}
    </div>
  </div>

  {/* Asignado */}
  <div className="flex flex-col gap-1">
    <span className="text-xs text-[#acb3b8]">Asignado</span>
    <select value={assigneeFilter ?? ''} onChange={...} className="...">
      <option value="">Todos</option>
      {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
    </select>
  </div>

  {/* Exportar — empujado a la derecha */}
  <div className="ml-auto">
    <button onClick={onExport} style={{ background: 'linear-gradient(145deg, #005bbf, #0050a8)' }} className="...">
      Exportar CSV
    </button>
  </div>

</div>
```

---

### Paso 3 — Página `ReportsPage`

**Archivo:** `src/pages/ReportsPage.tsx`

Orquesta los filtros locales, la carga de métricas, la renderización de `MetricsGrid` y la exportación. No escribe en Zustand.

**Estado local:**

```ts
const [from, setFrom]                     = useState<string>(firstDayOfMonthISO())
const [to, setTo]                         = useState<string>(todayISO())
const [statusFilter, setStatusFilter]     = useState<TicketStatus[]>([])
const [assigneeFilter, setAssigneeFilter] = useState<string | null>(null)
```

**Construcción del objeto de filtros** (usado tanto para `useMetrics` como para `buildExportUrl`):

```ts
const filters: MetricsFilters = {
  from,
  to,
  status:      statusFilter,
  assignee_id: assigneeFilter,
}
```

**Datos:**

```ts
const { data, isPending, isError, refetch } = useMetrics(filters)
const { data: users = [] }                  = useUsers()
```

**React Query usará `filters` como parte de la query key** (verificar que `useMetrics` ya lo hace — si recibe `filters` como argumento y lo pasa a `queryKey`, no hay nada más que hacer).

**Botón de exportación (inline — no reutiliza `ExportButton`):**

```ts
function handleExport() {
  const url = buildExportUrl(filters)
  window.open(url, '_blank')
}
```

No se necesita ningún estado adicional — la descarga la maneja el navegador directamente.

**Estructura JSX:**

```tsx
<div className="flex h-full flex-col overflow-hidden bg-[#f9f9fb]">

  {/* Header */}
  <div className="border-b border-[#e4e9ee]/50 bg-white px-6 py-5">
    <h1 className="text-xl font-semibold text-[#0c0e10]">Reports</h1>
  </div>

  {/* Toolbar con filtros */}
  <ReportsToolbar
    from={from}
    to={to}
    statusFilter={statusFilter}
    assigneeFilter={assigneeFilter}
    users={users}
    onFromChange={setFrom}
    onToChange={setTo}
    onStatusChange={setStatusFilter}
    onAssigneeChange={setAssigneeFilter}
    onExport={handleExport}
  />

  {/* Contenido principal */}
  <div className="flex-1 overflow-y-auto px-6 py-6">

    {/* Estado de carga */}
    {isPending && (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#e4e9ee] border-t-[#005bbf]" />
      </div>
    )}

    {/* Estado de error */}
    {isError && !isPending && (
      <div className="flex h-full flex-col items-center justify-center gap-3">
        <p className="text-sm text-[#acb3b8]">No se pudieron cargar las métricas.</p>
        <button
          onClick={() => refetch()}
          className="rounded-lg px-4 py-2 text-sm font-medium text-white"
          style={{ background: 'linear-gradient(145deg, #005bbf, #0050a8)' }}
        >
          Reintentar
        </button>
      </div>
    )}

    {/* Métricas — reutiliza MetricsGrid íntegramente */}
    {!isPending && !isError && data && (
      <MetricsGrid data={data} />
    )}

  </div>
</div>
```

**Notas de implementación:**

- `MetricsGrid` recibe `data: MetricsSnapshot` y se encarga de renderizar el PieChart, BarChart y la lista de carga por miembro. No requiere ninguna adaptación.
- El spinner de carga es idéntico al utilizado en `KanbanBoard` — borde superior coloreado con `border-t-[#005bbf]`, resto `border-[#e4e9ee]`.
- `buildExportUrl` construye la URL completa con los query params. `window.open(url, '_blank')` inicia la descarga sin salir de la página.
- Si `data` es `undefined` pero `isPending` es `false` e `isError` es `false` (situación transitoria al montar), no se renderiza nada en el área de contenido — no es necesario un estado vacío explícito porque `useMetrics` siempre devuelve datos o error.

---

## Orden de ejecución

```
1. Paso 1 (App.tsx)          → habilita la ruta, sin esto nada es visible
2. Paso 2 (ReportsToolbar)   → componente hoja, sin dependencias nuevas
3. Paso 3 (ReportsPage)      → ensambla todo y conecta los filtros
```

**Estimación:** ~1.5–2 horas de implementación.

---

## Criterios de aceptación

- [ ] Navegar a `/reports` desde el sidebar muestra la página (no pantalla en blanco)
- [ ] La toolbar muestra controles de fecha, estado y asignado con valores iniciales correctos (primer día del mes actual hasta hoy, todos los estados activos, todos los asignados)
- [ ] Cambiar el rango de fechas recalcula y refresca los gráficos automáticamente
- [ ] Los botones toggle de estado permiten selección múltiple; array vacío equivale a "todos los estados"
- [ ] El selector de asignado filtra las métricas por el usuario seleccionado
- [ ] El botón "Exportar CSV" inicia la descarga con los filtros activos en ese momento
- [ ] La exportación NO usa los filtros del Dashboard (Zustand) — usa exclusivamente el estado local de Reports
- [ ] Los gráficos de Reports son los mismos que los del Dashboard (mismo `MetricsGrid`)
- [ ] Durante la carga se muestra el spinner centrado
- [ ] Si la llamada falla, se muestra el mensaje de error con botón "Reintentar"
- [ ] `pnpm tsc --noEmit` sin errores

---

## Decisiones de diseño documentadas

| Decisión | Motivo |
|---|---|
| Filtros en estado local (no Zustand) | Los filtros de Reports son exclusivos de esta vista; no se deben compartir con Dashboard ni afectar sus métricas |
| No reutilizar `ExportButton` directamente | `ExportButton` está acoplado a `metricsFilters` de Zustand; en Reports los filtros son locales y se pasan explícitamente a `buildExportUrl` |
| Reutilizar `MetricsGrid` sin modificaciones | El componente ya recibe `MetricsSnapshot` por props y es agnóstico al origen de los datos; no hay razón para duplicarlo |
| Sin nuevo endpoint de backend | `GET /api/metrics` y `GET /api/metrics/export` ya soportan todos los filtros necesarios |
| `window.open(url, '_blank')` para exportar | Patrón más sencillo para iniciar una descarga de archivo; no requiere estado de `isPending` ni manejo de blob en el cliente |
| Valores iniciales = defaults del Dashboard | Consistencia UX — al entrar a Reports el usuario ve el mismo período que vería en el Dashboard, y desde ahí puede ajustar |
| Sin paginación ni virtualización | El volumen de datos de `MetricsSnapshot` es acotado (agregados, no filas); no aplica paginación |
