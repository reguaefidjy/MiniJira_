# Plan de implementación — Módulo "Mover Tarjetas"

**Fecha:** 2026-05-06  
**Alcance:** Corregir el bug por el cual mover tarjetas entre columnas no guarda los cambios.  
**Prerequisitos:** Backend corriendo en `localhost:3000`, módulo "Create Issue" completado.

---

## Diagnóstico

El usuario arrastra una tarjeta a otra columna y visualmente regresa a su posición original sin guardar. No aparece ningún mensaje de error.

### Flujo actual (con bug)

```
Usuario arrastra ticket (ej: todo → done)
  → handleDragEnd llama updateTicket({ status: 'done', version: 1 })
  → onMutate aplica optimistic update (tarjeta se mueve visualmente)
  → PATCH /api/tickets/:id devuelve 422 (transición inválida)
  → api/tickets.ts lanza Error sin adjuntar error.status
  → onError revierte el optimistic update (tarjeta vuelve)
  → No se muestra ningún mensaje al usuario ← bug visible
```

---

## Bugs identificados

### C-1 — Error HTTP sin status en `api/tickets.ts`

**Archivo:** `src/api/tickets.ts` (línea 55)

Solo el 409 adjunta `error.status`. Los demás errores (403, 422, 500) se lanzan como:
```ts
throw new Error('Failed to update ticket')  // sin .status
```

En `useUpdateTicket.onError`, `error.status` llega `undefined` para 403 y 422. El revert ocurre pero sin posibilidad de distinguir el tipo de error.

---

### C-2 — Transiciones inválidas no validadas en el frontend (`KanbanBoard.tsx`)

**Archivo:** `src/components/board/KanbanBoard.tsx` (línea 28)

El backend restringe las transiciones en `tickets.service.ts`:

```
todo        → [in_progress]
in_progress → [todo, review]
review      → [in_progress, done]
done        → [review]  (solo admin)
```

El frontend permite arrastrar a cualquier columna. Un usuario que mueva `todo → done` recibe un 422 del backend. El optimistic update revierte silenciosamente. Ningún mensaje explica qué pasó.

---

### C-3 — Permiso de edición no verificado antes del drag (`KanbanBoard.tsx`)

**Archivo:** `src/components/board/KanbanBoard.tsx` (línea 28)

El backend devuelve 403 si `role !== 'admin' && current.created_by !== userId`. El frontend no verifica `canEditTicket(ticket, currentUser)` antes de llamar a `updateTicket`. Resultado: mismo fallo silencioso.

---

## Archivos afectados

| Archivo | Acción |
|---|---|
| `src/api/tickets.ts` | Propagar `error.status` en todos los errores de `updateTicket` |
| `src/components/board/KanbanBoard.tsx` | Validar permisos y transición en `handleDragEnd`, mostrar error inline |
| `src/components/board/KanbanColumn.tsx` | Aceptar prop `isDropDisabled` para feedback visual en columnas no permitidas |

---

## Pasos de implementación

### Paso 1 — Propagar status HTTP en todos los errores (fix C-1)

**Archivo:** `src/api/tickets.ts`

Cambiar el bloque de error de `updateTicket` para adjuntar siempre el status:

```ts
// ANTES:
if (res.status === 409) {
  const error = new Error('Conflict') as Error & { status: number }
  error.status = 409
  throw error
}
if (!res.ok) throw new Error('Failed to update ticket')

// DESPUÉS:
if (!res.ok) {
  const error = new Error(
    res.status === 409 ? 'Conflict'
    : res.status === 422 ? 'Transition not allowed'
    : res.status === 403 ? 'Forbidden'
    : 'Failed to update ticket'
  ) as Error & { status: number }
  error.status = res.status
  throw error
}
```

**Criterio de verificación:** Al arrastrar un ticket a una columna inválida, el error en `onError` tiene `error.status === 422`.

---

### Paso 2 — Validar transición y permisos en `handleDragEnd` (fix C-2 y C-3)

**Archivo:** `src/components/board/KanbanBoard.tsx`

Añadir:
1. `currentUser` del store
2. Un mapa `VALID_TRANSITIONS` idéntico al del backend
3. Un estado `dragError` (string | null) para el mensaje inline
4. Verificaciones en `handleDragEnd` antes de llamar a `updateTicket`

```ts
const VALID_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  todo:        ['in_progress'],
  in_progress: ['todo', 'review'],
  review:      ['in_progress', 'done'],
  done:        ['review'],
}
```

**Lógica en `handleDragEnd`:**

```ts
function handleDragEnd(result: DropResult) {
  const { destination, source, draggableId } = result
  if (!destination) return
  if (destination.droppableId === source.droppableId) return

  const ticket = tickets.find((t) => t.id === draggableId)
  if (!ticket) return

  const newStatus = destination.droppableId as TicketStatus

  // C-3: verificar permiso
  if (currentUser && !canEditTicket(ticket, currentUser)) {
    setDragError('No tienes permiso para mover este ticket.')
    return
  }

  // C-2: verificar transición válida
  if (!VALID_TRANSITIONS[ticket.status].includes(newStatus)) {
    setDragError(
      `No se puede mover directamente de "${COLUMN_LABELS[ticket.status]}" a "${COLUMN_LABELS[newStatus]}".`
    )
    return
  }

  setDragError(null)
  updateTicket({ id: ticket.id, data: { status: newStatus, version: ticket.version } })
}
```

**Mensaje de error inline** — mostrar sobre el tablero cuando `dragError !== null`:

```tsx
{dragError && (
  <div className="mx-4 mb-2 rounded-md bg-[#fe8983]/15 px-3 py-2 text-sm text-[#752121]">
    {dragError}
    <button onClick={() => setDragError(null)} className="ml-2 font-medium underline">
      Cerrar
    </button>
  </div>
)}
```

El mensaje se limpia al iniciar un nuevo drag exitoso (`setDragError(null)` antes de `updateTicket`).

---

### Paso 3 — Feedback visual en columnas no permitidas (mejora UX)

**Archivo:** `src/components/board/KanbanColumn.tsx`

Añadir la prop `isDropDisabled?: boolean` y pasarla al `<Droppable>`. Cuando una columna no es destino válido para el ticket en movimiento, se muestra con opacidad reducida.

Para saber qué ticket se está arrastrando durante el drag, añadir en `KanbanBoard`:
- `onDragStart` → guarda el ticket en vuelo en estado local (`draggingTicket`)
- `onDragEnd` → limpia `draggingTicket`

Cada `KanbanColumn` recibe `isDropDisabled`:
```ts
// En KanbanBoard, al renderizar columnas:
isDropDisabled={
  draggingTicket !== null &&
  !VALID_TRANSITIONS[draggingTicket.status].includes(status)
}
```

En `KanbanColumn`, el `Droppable` recibe `isDropDisabled` y aplica estilo cuando está deshabilitado:
```tsx
<Droppable droppableId={status} isDropDisabled={isDropDisabled}>
  {(provided, snapshot) => (
    <div
      style={{
        background: isDropDisabled
          ? 'rgba(172,179,184,0.10)'
          : snapshot.isDraggingOver ? 'rgba(215,226,255,0.40)' : 'transparent',
        opacity: isDropDisabled ? 0.5 : 1,
      }}
    >
```

---

## Orden de ejecución

```
1. Paso 1 (api/tickets.ts)       → sin esto, los errores son ciegos
2. Paso 2 (KanbanBoard.tsx)      → validación + mensaje al usuario
3. Paso 3 (KanbanColumn.tsx)     → mejora visual (no bloqueante)
```

**Estimación:** ~1-2 horas de implementación.

---

## Criterios de aceptación

- [ ] Arrastrar `todo → in_progress` guarda el cambio y el ticket permanece en la nueva columna
- [ ] Arrastrar `todo → done` (transición inválida) muestra un mensaje de error y la tarjeta no se mueve
- [ ] Arrastrar un ticket ajeno siendo `member` muestra un mensaje de error
- [ ] Las columnas de destino inválido se muestran deshabilitadas visualmente durante el drag
- [ ] El mensaje de error desaparece al realizar un drag exitoso
- [ ] `pnpm tsc --noEmit` sin errores

---

## Transiciones válidas — referencia rápida

| Desde | Puede ir a |
|---|---|
| Por hacer (`todo`) | En progreso (`in_progress`) |
| En progreso (`in_progress`) | Por hacer (`todo`), Review (`review`) |
| Review (`review`) | En progreso (`in_progress`), Listo (`done`) |
| Listo (`done`) | Review (`review`) — solo admin |
