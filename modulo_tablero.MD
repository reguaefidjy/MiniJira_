# Plan de implementación — Módulo "Create Issue"

**Fecha:** 2026-05-05  
**Alcance:** Conectar el botón "Create Issue" del sidebar con el backend `POST /api/tickets`.  
**Prerequisitos:** Backend corriendo en `localhost:3000`, seed ejecutado, frontend sin MSW.

---

## Estado actual

| Pieza | Existe | Estado |
|---|---|---|
| `POST /api/tickets` (backend) | ✅ | Funcional |
| `api/tickets.ts → createTicket()` | ✅ | Funcional pero envía `labels` en lugar de `label_ids` (bug) |
| `hooks/useCreateTicket.ts` | ✅ | Funcional |
| Botón "Create Issue" en sidebar | ✅ | Sin `onClick` — no hace nada |
| Modal/formulario de creación | ❌ | No existe |
| Schema Zod para creación | ❌ | Solo existe `ticketFormSchema` (incluye `version` y `status` — no aplica para crear) |
| Estado global del modal | ❌ | `useAppStore` no tiene `createModalOpen` |

---

## Bug bloqueante a corregir primero

### B-1 — Mismatch `labels` vs `label_ids`

El frontend envía `{ labels: string[] }` en el body pero el backend espera `{ label_ids: string[] }`.

**Archivos afectados:**
- `src/types/index.ts` → `TicketFormValues.labels` → renombrar a `label_ids`
- `src/lib/schemas.ts` → campo `labels` → renombrar a `label_ids`
- `src/api/tickets.ts` → ningún cambio (el tipo lo propaga automáticamente)
- `src/components/ticket/TicketDrawer.tsx` → `reset({ labels: ... })` → `reset({ label_ids: ... })`
- `src/hooks/useUpdateTicket.ts` → exclusión del merge optimista `labels: _l` → `label_ids: _l`

---

## Pasos de implementación

### Paso 1 — Corregir bug B-1 (prerequisito)

**`src/types/index.ts`**
```ts
// Cambiar en TicketFormValues:
label_ids: string[]   // era: labels: string[]
```

**`src/lib/schemas.ts`**
```ts
// Cambiar campo en ticketFormSchema:
label_ids: z.array(z.string().min(1)).default([]),   // era: labels
```

**`src/components/ticket/TicketDrawer.tsx`** — dos puntos:
```ts
// En reset():
label_ids: ticket.labels.map((l) => l.id),   // era: labels

// En useUpdateTicket.ts — exclusión del merge optimista:
const { version: _v, assignee_ids: _a, label_ids: _l, ...safeFields } = data
// era: labels: _l
```

**Criterio de verificación:** `pnpm tsc --noEmit` sin errores nuevos.

---

### Paso 2 — Schema de creación

Crear `createTicketSchema` en `src/lib/schemas.ts` sin los campos `version` y `status` (el backend los asigna por defecto):

```ts
export const createTicketSchema = z.object({
  title: z.string().min(1, 'El título es requerido').max(120),
  description: z.string().default(''),
  priority: z.enum(['low', 'medium', 'high']),
  is_blocked: z.boolean().default(false),
  assignee_ids: z.array(z.string()).default([]),
  label_ids: z.array(z.string()).default([]),
})

export type CreateTicketSchema = z.infer<typeof createTicketSchema>
```

---

### Paso 3 — Estado global del modal

Añadir en `src/store/useAppStore.ts`:

```ts
// Interfaz:
createModalOpen: boolean
setCreateModalOpen: (open: boolean) => void

// Implementación:
createModalOpen: false,
setCreateModalOpen: (open) => set({ createModalOpen: open }),
```

---

### Paso 4 — Componente `CreateTicketModal`

**Archivo:** `src/components/ticket/CreateTicketModal.tsx`

**Descripción:** Modal centrado (no drawer lateral) con overlay. Se diferencia visualmente de `TicketDrawer`.

**Estructura del formulario:**

| Campo | Tipo UI | Validación |
|---|---|---|
| `title` | `<input>` texto | Requerido, max 120 |
| `description` | `<textarea>` | Opcional |
| `priority` | `<select>` con 3 opciones | Requerido, default `medium` |
| `assignee_ids` | Lista de checkboxes con avatar | Opcional, viene de `useUsers()` |
| `label_ids` | Lista de checkboxes con color | Opcional, viene de `useLabels()` |

**Flujo:**
```
Usuario hace click en "Create Issue"
  → setCreateModalOpen(true)
  → Modal se monta con useForm() reseteado
  → Usuario completa y envía
  → useCreateTicket.mutate(data)
  → onSuccess: setCreateModalOpen(false) + invalidateQueries(['tickets'])
  → onError: mostrar mensaje inline (no toast — mantener contexto del formulario)
```

**Skeleton del componente:**
```tsx
// src/components/ticket/CreateTicketModal.tsx
export function CreateTicketModal({ onClose }: { onClose: () => void }) {
  const { register, handleSubmit, formState: { errors } } = useForm<CreateTicketSchema>({
    resolver: zodResolver(createTicketSchema),
    defaultValues: { priority: 'medium', is_blocked: false, assignee_ids: [], label_ids: [] }
  })
  const { mutate: createTicket, isPending, error } = useCreateTicket()
  const { data: users = [] } = useUsers()
  const { data: labels = [] } = useLabels()

  function onSubmit(data: CreateTicketSchema) {
    createTicket(data, { onSuccess: onClose })
  }

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 z-40 bg-black/20" onClick={onClose} />
      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-lg rounded-xl bg-white p-6"
             style={{ boxShadow: '0px 12px 32px rgba(12,14,16,0.08)' }}>
          {/* Header */}
          {/* Form: title, description, priority, assignees, labels */}
          {/* Footer: Cancel + Submit */}
        </div>
      </div>
    </>
  )
}
```

**Nota de diseño:** Seguir las reglas de `CLAUDE.md` — colores de la paleta definida, botón primario con gradiente `#005bbf → #0050a8`, sin `shadow-*` de Tailwind.

---

### Paso 5 — Conectar botón en AppLayout

**Archivo:** `src/layouts/AppLayout.tsx`

El botón "Create Issue" ya existe. Solo añadirle el handler:

```tsx
// En SidebarContent():
const setCreateModalOpen = useAppStore((s) => s.setCreateModalOpen)

// En el botón:
<button onClick={() => setCreateModalOpen(true)}>
  Create Issue
</button>
```

---

### Paso 6 — Montar modal en BoardPage

**Archivo:** `src/pages/BoardPage.tsx`

```tsx
import { CreateTicketModal } from '@/components/ticket/CreateTicketModal'

// En el componente:
const { createModalOpen, setCreateModalOpen } = useAppStore()

// En el JSX, junto al TicketDrawer:
{createModalOpen && (
  <CreateTicketModal onClose={() => setCreateModalOpen(false)} />
)}
```

**¿Por qué en `BoardPage` y no en `AppLayout`?**  
El modal necesita invalidar el query de tickets. Montarlo en la página que tiene el board garantiza que el contexto de React Query ya está activo. (Alternativa válida: montarlo en `AppLayout` — también funciona porque `QueryClientProvider` está en `App.tsx`.)

---

### Paso 7 — Ajuste en `useCreateTicket`

El hook actual llama a `createTicket` con `Omit<TicketFormValues, 'version' | 'status'>`. Tras el fix del bug B-1, el tipo cambia automáticamente. Solo verificar que la firma sigue correcta:

```ts
// hooks/useCreateTicket.ts — sin cambios de lógica,
// el tipo se actualiza solo por el cambio en TicketFormValues
mutationFn: (data: Omit<TicketFormValues, 'version' | 'status'>) => createTicket(data)
```

---

## Orden de ejecución sugerido

```
1. Paso 1 (bug B-1)        → sin esto, los labels nunca se guardan
2. Paso 2 (schema)         → base del formulario
3. Paso 3 (store)          → control de apertura/cierre
4. Paso 4 (modal)          → componente principal
5. Paso 5 (botón)          → wiring en sidebar
6. Paso 6 (BoardPage)      → montar en la página
7. Paso 7 (hook check)     → verificación final de tipos
```

**Estimación:** ~2-3 horas de implementación.  
**Paradas para confirmación:** Después del Paso 1 (bug fix) y después del Paso 4 (modal antes de conectar).

---

## Archivos que se crean o modifican

| Acción | Archivo |
|---|---|
| **Nuevo** | `src/components/ticket/CreateTicketModal.tsx` |
| **Modifica** | `src/types/index.ts` |
| **Modifica** | `src/lib/schemas.ts` |
| **Modifica** | `src/store/useAppStore.ts` |
| **Modifica** | `src/layouts/AppLayout.tsx` |
| **Modifica** | `src/pages/BoardPage.tsx` |
| **Modifica** | `src/components/ticket/TicketDrawer.tsx` |
| **Modifica** | `src/hooks/useUpdateTicket.ts` |
| **Sin cambios** | `src/api/tickets.ts`, `src/hooks/useCreateTicket.ts`, backend |

---

## Criterios de aceptación

- [ ] Botón "Create Issue" en sidebar abre el modal
- [ ] El modal tiene los campos: título, descripción, prioridad, asignados y etiquetas
- [ ] El formulario valida antes de enviar (título requerido, prioridad requerida)
- [ ] Al guardar, el ticket aparece en la columna "Por hacer" del tablero sin recargar la página
- [ ] Al cancelar o hacer click fuera, el modal se cierra y el formulario se resetea
- [ ] Los labels se guardan correctamente en el backend (fix bug B-1)
- [ ] `pnpm tsc --noEmit` sin errores
