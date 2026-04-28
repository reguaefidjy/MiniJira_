# CLAUDE.md — Mini Jira Frontend

Reglas globales para este proyecto. Leer antes de tocar cualquier archivo.

---

## 1. Paleta de colores — ÚNICA fuente de verdad

Todos los colores vienen de `DESIGN.md`. No se inventan valores hex. No se usan clases de color de Tailwind fuera de esta lista.

| Token | Hex | Clase Tailwind (inline) | Uso |
|---|---|---|---|
| `surface` | `#f9f9fb` | `bg-[#f9f9fb]` | Fondo base de la app (canvas) |
| `surface_container_low` | `#f2f4f6` | `bg-[#f2f4f6]` | Sidebar, columnas Kanban, paneles secundarios |
| `surface_container_lowest` | `#ffffff` | `bg-white` | Tarjetas activas, editor, drawer |
| `surface_container_high` | `#e4e9ee` | `bg-[#e4e9ee]` | Items en lista, contadores de columna |
| `surface_container_highest` | `#dde3e9` | `bg-[#dde3e9]` | Command palette inner glow |
| `primary` | `#005bbf` | `bg-[#005bbf]` / `text-[#005bbf]` | CTAs, links activos, ring focus |
| `primary_dim` | `#0050a8` | `bg-[#0050a8]` | Extremo del gradiente en botón primario |
| `primary_container` | `#d7e2ff` | `bg-[#d7e2ff]` | Chip status "En progreso" (fondo) |
| `on_primary` | `#ffffff` | `text-white` | Texto sobre botón primario |
| `on_primary_fixed` | `#003d84` | `text-[#003d84]` | Texto chip status "En progreso" |
| `tertiary_container` | `#69f6b8` | `bg-[#69f6b8]` | Chip status "Listo" (fondo) |
| `on_tertiary_fixed` | `#00452d` | `text-[#00452d]` | Texto chip status "Listo" |
| `error_container` | `#fe8983` | `bg-[#fe8983]` | Chip "Bloqueado" (fondo), badge rojo |
| `on_error_container` | `#752121` | `text-[#752121]` | Texto chip "Bloqueado", texto destructivo |
| `outline_variant` | `#acb3b8` | `text-[#acb3b8]` | Texto secundario, ghost border al 15-20% opacity |
| `inverse_surface` | `#0c0e10` | `text-[#0c0e10]` | Negro "orgánico" — único negro permitido |

### Colores prohibidos
- `#000000` / `black` — **siempre** usar `#0c0e10`
- Cualquier hex no listado arriba
- Clases de color semánticas de Tailwind (`text-gray-*`, `bg-blue-*`, `text-red-*`, etc.) — **no usar**

---

## 2. Reglas de elevación y profundidad

- **Separación entre secciones:** cambio de color de fondo entre capas. Nunca `border` de 1px para seccionar.
- **Sombra para elementos flotantes (drawer, modals, tooltips):** `box-shadow: 0px 12px 32px rgba(12, 14, 16, 0.04)` — opacidad 4%, debe sentirse, no verse.
- **Ghost border (solo accesibilidad):** `outline_variant` (`#acb3b8`) al 15% opacity. No para separar contenido.
- **Drop shadows estándar de Tailwind (`shadow-*`):** prohibidos. Solo la sombra ambient definida arriba.

### Jerarquía de superficies obligatoria

```
App background     → surface          #f9f9fb
Sidebar / columnas → surface_low      #f2f4f6
Tarjetas / editor  → surface_lowest   #ffffff   ← siempre encima de surface_low
Items hover        → surface_high     #e4e9ee
```

---

## 3. Tipografía

- **Fuente única:** `Inter` (cargada desde Google Fonts en `index.html`).
- **Títulos de página / proyecto:** `text-[2.75rem]` + `tracking-[-0.02em]` + `font-semibold`.
- **Metadata / labels:** `text-[0.6875rem]` + `uppercase` + `tracking-[0.05em]`.
- **Cuerpo:** `text-[0.875rem]` + `leading-[1.6]` (equivale a `text-sm leading-relaxed`).
- No usar `font-bold` — el peso máximo en este sistema es `font-semibold`.

---

## 4. Componentes — reglas fijas

### Botón primario
```
background: linear-gradient(145deg, #005bbf, #0050a8)
color: #ffffff
border-radius: 6px   (rounded-md)
```
No usar `bg-[#005bbf]` plano en botones primarios — siempre el gradiente.

### Botón secundario
```
background: transparent
border: 1px solid rgba(172, 179, 184, 0.20)   (outline_variant al 20%)
color: #005bbf
```

### Botón ghost / tertiary
```
background: transparent
border: none
color: #0c0e10
```

### Status chips — valores exactos

| Estado | Fondo | Texto |
|---|---|---|
| `todo` | `#f2f4f6` | `#0c0e10` |
| `in_progress` | `#d7e2ff` | `#003d84` |
| `review` | `#fff3cd`* | `#7a5400`* |
| `done` | `#69f6b8` | `#00452d` |
| `blocked` | `#fe8983` | `#752121` |

> *`review` no está en DESIGN.md con hex explícito. Se usa el tono neutro cálido definido en `frontend-specs.md`. Si se actualiza DESIGN.md, actualizar aquí.

### Cards y listas
- **Sin líneas divisoras** entre items. Separar con `gap` o cambio de superficie.
- Espacio mínimo entre items: `1.5rem` (`gap-6`).

### Glassmorphism (popovers, command palette)
```
background: rgba(255, 255, 255, 0.80)
backdrop-filter: blur(24px)
border-radius: 12px   (rounded-xl)
```

---

## 5. Reglas de layout y espaciado

- **Padding asimétrico:** más espacio arriba y a la izquierda que abajo y a la derecha.
- **Negative space es una feature:** si algo se ve "lleno", quitar un borde y añadir `8px` de espacio.
- **Breakpoints responsivos:**

| Breakpoint | Comportamiento |
|---|---|
| `< 768px` | Sidebar colapsado (hamburguesa). Columnas Kanban: scroll horizontal, `min-w-[280px]`. Drawer: 100% ancho. |
| `768px–1023px` | Sidebar visible con iconos. Drawer: 480px desde la derecha. |
| `≥ 1024px` | Sidebar expandido. Board: grid 4 columnas fijas. Drawer: 480px. |

---

## 6. Reglas de negocio — nunca omitir

Estas reglas son contratos del backlog validado. Cualquier componente que las ignore introduce un bug, no una feature.

### Permisos (backlog §Historia 2)
- `canEditTicket`: `role === 'admin' || ticket.created_by === user.id`
- `canArchiveTicket`: igual que `canEditTicket`
- `canDeleteComment`: `role === 'admin' || comment.author_id === user.id`
- Los controles de edición/archivo se **ocultan** si no hay permiso (no solo se deshabilitan).
- Los tickets con `archived_at !== null` nunca aparecen en el tablero.

### Optimistic Locking — 409 (backlog §Historia 3)
- Al recibir un `409`, mostrar `ConflictBanner`.
- El formulario **no se limpia**. Los datos del usuario permanecen visibles.
- Solo el botón "Recargar" del banner invalida la query.

### Flag Bloqueado (backlog §Historia 2)
- `is_blocked` no cambia la columna del ticket en el tablero.
- Se muestra como badge rojo (`#fe8983` / `#752121`) sobre la tarjeta, en cualquier columna.

### Exportación CSV (backlog §EC-2)
- Botón deshabilitado cuando `metrics.total === 0`. Tooltip: `"No hay datos para el rango seleccionado"`.
- `400` del servidor → toast de error, sin descarga.
- `401` del servidor → redirect a `/login`.
- Descarga directa vía `window.location.href`, sin modal de confirmación.

### Cancelación de notificación (backlog §EC-1)
- Lógica exclusiva del backend. El frontend no tiene responsabilidad aquí.

---

## 7. Estructura de archivos — no romper

```
src/
├── api/          # fetch functions — solo llamadas HTTP, sin lógica de negocio
├── components/
│   ├── ui/       # shadcn/ui generados — NO editar manualmente
│   ├── board/
│   ├── ticket/
│   ├── comments/
│   ├── dashboard/
│   └── shared/   # StatusChip, PriorityBadge, BlockedBadge, AssigneeAvatar, LabelTag, DateDisplay
├── hooks/        # TanStack Query wrappers — un archivo por entidad/acción
├── layouts/      # AuthGuard, AppLayout, PublicLayout
├── lib/          # queryClient, schemas (Zod), utils, permissions
├── mocks/        # MSW handlers — solo en DEV, no importar en producción
├── pages/        # LoginPage, AuthCallbackPage, BoardPage, DashboardPage
├── store/        # useAppStore (Zustand) — solo UI state
└── types/        # index.ts — única fuente de tipos
```

- `src/types/index.ts` es la fuente de verdad de los tipos. No duplicar tipos en otros archivos.
- `src/lib/permissions.ts` contiene las funciones de permiso. No inlinarlas en componentes.
- `src/mocks/` solo se carga en `import.meta.env.DEV`. Nunca en el bundle de producción.

---

## 8. Stack — versiones instaladas

| Librería | Versión real instalada |
|---|---|
| React | 18.x |
| TypeScript | 6.x |
| Vite | 8.x |
| React Router | 7.x (instalado como v7, API compatible con v6) |
| TanStack Query | 5.x |
| Zustand | 5.x |
| React Hook Form | 7.x |
| Zod | 4.x |
| @hello-pangea/dnd | 18.x (reemplaza @dnd-kit — API alto nivel, React 18, Strict Mode compatible) |
| Tailwind CSS | 4.x (config CSS-based, sin `tailwind.config.js`) |
| MSW | 2.x (solo DEV) |

---

## 9. Lo que no existe aún

Antes de arrancar el backend o los tests, tener presente:

- **Backend:** no existe. Todas las llamadas van a MSW en desarrollo.
- **`BoardFilters` y `DashboardFilters`:** componentes pendientes de implementar.
- **Tests:** carpetas `src/test/unit/` y `src/test/e2e/` vacías.
- **`src/components/ui/`:** vacío — `shadcn init` no se ha ejecutado. Actualmente no bloqueante porque los componentes se construyeron sin depender de shadcn.
