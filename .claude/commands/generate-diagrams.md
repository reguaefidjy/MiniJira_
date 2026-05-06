# Agente: Generador de diagramas técnicos — MiniJira

## Rol
Eres un documentador técnico especializado en diagramas Mermaid.
Tu única fuente de verdad son los archivos que se te indica leer a continuación.
No puedes inventar flujos, tablas, campos ni comportamientos que no estén en esos archivos.

---

## Archivos de contexto a leer (en este orden)

> NOTA DE RUTAS: El proyecto NO tiene directorio `apps/` ni `Base-Specs/`.
> Las rutas reales son las que se listan aquí.

1. `DESIGN.md` — arquitectura visual, paleta, jerarquía de superficies
2. `mermaid_design.md` — diagramas Mermaid de diseño previos (referencia)
3. `specs.md` — especificaciones funcionales de la aplicación (raíz del proyecto)
4. `base_spec_backend/specs.md` — especificaciones técnicas del backend
5. `backend/src/db/schema.ts` — fuente de verdad del schema Drizzle (tablas, campos, FK)
6. `backend/src/modules/auth/auth.router.ts` — rutas de autenticación
7. `backend/src/modules/auth/auth.controller.ts` — lógica de autenticación
8. `backend/src/modules/auth/auth.service.ts` — servicios de autenticación
9. `backend/src/modules/tickets/tickets.router.ts` — rutas de tickets
10. `backend/src/modules/tickets/tickets.controller.ts` — lógica de tickets
11. `backend/src/modules/tickets/tickets.service.ts` — servicios de tickets

---

## Correcciones al prompt original (aplicar antes de generar)

- **NO existe tabla `AuditLog`** en el schema Drizzle. La tabla de registro de eventos
  es `notification_queue`. Úsala en el diagrama 2 si es relevante, o bien omite
  el nodo si ninguna tabla de auditoría existe.

- **El proyecto usa Optimistic Locking, NO Pessimistic Lock.** El mecanismo es el
  campo `version INTEGER` en la tabla `tickets`. Al recibir un PATCH, el servicio
  compara `body.version` con `tickets.version` en BD; si no coinciden devuelve `409`.
  Refleja esto con precisión en los diagramas 2 y 3.

- **El status enum real** (del schema) es: `todo | in_progress | review | done`.
  No uses otros valores.

---

## Tarea

Genera el archivo `docs/diagramas.md` con exactamente 3 diagramas Mermaid
y sus secciones de contexto, siguiendo la estructura indicada abajo.

---

## Estructura obligatoria de `docs/diagramas.md`

```markdown
# Diagramas técnicos — MiniJira
> Generado el: 2026-05-04 | Fuente: DESIGN.md · specs.md · schema.ts · routers
```

### Sección 1 — Flujo de autenticación JWT

**Contexto (2-3 líneas):** Explicar brevemente el flujo OAuth + JWT que usa el proyecto
antes del diagrama.

```mermaid
sequenceDiagram
    ...
```

El diagrama DEBE incluir estos participantes y pasos:
- `Browser` → `API /auth/callback` con código OAuth
- `API` llama al proveedor OAuth para validar credenciales
- `API` consulta o crea el usuario en tabla `users`
- `API` genera `access_token` (JWT corto plazo) y `refresh_token`
- `API` almacena hash del refresh token en tabla `refresh_tokens`
- `API` devuelve ambos tokens en cookies `httpOnly`
- Rama alternativa: si el refresh token ha expirado → redirige a login

---

### Sección 2 — Mover ticket entre columnas (con Optimistic Locking)

**Contexto (2-3 líneas):** Explicar brevemente el mecanismo de Optimistic Locking
con el campo `version`.

```mermaid
sequenceDiagram
    ...
```

El diagrama DEBE incluir:
- `Frontend` envía `PATCH /api/tickets/:id` con `{ status, version }`
- `API` autentica la cookie (`authenticate` middleware)
- `Servicio de tickets` lee el ticket actual de BD
- Bifurcación `alt version coincide / else version no coincide`:
  - Éxito: UPDATE en tabla `tickets` (incrementa `version`), responde `200` con ticket actualizado
  - Conflicto: responde `409` sin modificar la BD; el frontend muestra `ConflictBanner`
- Si el ticket tiene `is_blocked = true`, registrar en `notification_queue`
  solo si hay un comentario asociado al evento (según schema real)

---

### Sección 3 — Ciclo de vida de un ticket

**Contexto (2-3 líneas):** Explicar los estados posibles y las transiciones
válidas según el schema.

```mermaid
flowchart LR
    ...
```

El diagrama DEBE incluir:
- Nodo de inicio: `[Crear ticket]`
- Los 4 estados del enum: `TODO`, `IN_PROGRESS`, `REVIEW`, `DONE`
- Transiciones válidas (cualquier estado puede ir a cualquier otro
  mientras el ticket no esté archivado — reflejar esto si el contrato lo confirma)
- Nodo especial `{is_blocked = true}` que puede aparecer en cualquier estado
  sin cambiar de columna (badge visual, no transición de estado)
- Nodo terminal: `[Archivar]` — `archived_at IS NOT NULL`
- Mecanismo de Optimistic Locking: mostrar como decisión `{version ok?}`
  antes de cada transición de estado

---

## Reglas de generación

1. **Solo Mermaid válido.** Cada diagrama debe renderizarse sin errores.
   - En `sequenceDiagram`: usar `alt / else / end` para bifurcaciones.
   - En `flowchart`: usar `-->` para flujos, `-.->` para flujos condicionales opcionales.
   - No usar sintaxis experimental o de versiones futuras de Mermaid.

2. **Fidelidad al schema.** Todos los nombres de tablas y campos deben
   coincidir exactamente con `backend/src/db/schema.ts`.

3. **No inventar.** Si un flujo no está documentado en los archivos de contexto,
   omitirlo y añadir una nota `<!-- TODO: sin información suficiente -->`.

4. **Contexto antes del diagrama.** Cada sección debe tener 2-3 líneas de
   explicación en prosa antes del bloque Mermaid.

5. **Sin secciones adicionales.** El archivo generado debe tener exactamente
   las 3 secciones de diagramas, una cabecera y un pie de notas.

---

## Pie de notas (al final del archivo generado)

Incluir una sección `## Notas` con:
- Mención explícita de que `AuditLog` no existe en el schema y fue omitido.
- Mención de que el locking es Optimistic (campo `version`), no Pessimistic.
- Cualquier otra discrepancia encontrada entre los archivos de contexto y el prompt original.
