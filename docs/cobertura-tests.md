# Cobertura de Tests — MiniJira
> Generado el: 2026-05-04 | Fuente: backlog.md + búsqueda de *.test.ts / *.spec.ts / *.test.tsx

---

## Resumen ejecutivo

| Total historias | ✅ con test | ❌ sin test | ⚠️ parcial | % cobertura |
|-----------------|------------|------------|-----------|-------------|
| 16              | 0          | 16         | 0         | 0 %         |

> **0 archivos de test encontrados en todo el proyecto.** Todas las historias y escenarios carecen de cobertura.

---

## Sección 1 — Historias del backlog vs estado de tests

| ID | Historia / Criterio | Prioridad | Estado | Archivos de test |
|----|---------------------|-----------|--------|-----------------|
| H-01-S1 | Acceso exitoso con cuenta corporativa activa | P0 | ❌ | — |
| H-01-S2 | Intento de acceso con cuenta no aprovisionada | P0 | ❌ | — |
| H-01-S3 | Sesión expirada → redirección a login sin pérdida de datos | P0 | ❌ | — |
| H-02-S1 | Creación de un ticket válido (aparece en "Por hacer", visible al equipo) | P0 | ❌ | — |
| H-02-S2 | Avance normal de un ticket por el flujo (updated_at actualizado) | P0 | ❌ | — |
| H-02-S3 | Marcar un ticket como bloqueado (badge rojo, sin cambio de columna) | P1 | ❌ | — |
| H-02-S4 | Archivar un ticket propio (desaparece del tablero, conservado para métricas) | P1 | ❌ | — |
| H-02-S5 | Intentar editar un ticket ajeno como member → acción rechazada | P0 | ❌ | — |
| H-03-S1 | Primer usuario guarda sin conflicto (versión incrementada) | P0 | ❌ | — |
| H-03-S2 | Segundo usuario intenta guardar sobre versión desactualizada → rechazo con notificación | P0 | ❌ | — |
| H-03-S3 | Cambio de estado concurrente → solo un cambio se aplica | P0 | ❌ | — |
| EC-01-S1 | Notificación enviada cuando el comentario sigue activo | P1 | ❌ | — |
| EC-01-S2 | Notificación cancelada porque el comentario fue archivado antes del envío | P1 | ❌ | — |
| EC-01-S3 | Mención con @handle en comentario archivado antes del envío → sin email | P1 | ❌ | — |
| EC-02-S1 | Exportar con filtros sin resultados → botón deshabilitado, sin petición al servidor | P1 | ❌ | — |
| EC-02-S2 | Exportar con rango de fechas inválido → HTTP 400, mensaje de error, sin descarga | P1 | ❌ | — |
| EC-02-S3 | Exportar con sesión expirada → HTTP 401, redirección a login, sin descarga | P0 | ❌ | — |
| EC-02-S4 | Exportar volumen grande → descarga progresiva, sin acumulación en memoria, RFC 4180 | P2 | ❌ | — |

---

## Sección 2 — Escenarios Gherkin sin cobertura

Todos los escenarios del backlog carecen de test. Se listan a continuación agrupados por historia.

---

### H-01: Acceso al sistema con cuenta corporativa

#### H-01-S1: Acceso exitoso con cuenta activa

- **Escenario:** Un miembro del equipo inicia sesión con su cuenta corporativa válida y aprovisionada.
  - **Given:** El proveedor OAuth corporativo está configurado y la cuenta ha sido aprovisionada por un admin.
  - **When:** El usuario inicia sesión con su cuenta corporativa válida.
  - **Then:** Tiene acceso al tablero con el rol asignado y la sesión permanece activa hasta que el token expire o se cierre sesión manualmente.
  - **Por qué importa:** Sin este test, un cambio en la integración OAuth (cabeceras, scopes, endpoints) puede romper el acceso de todos los usuarios sin que los pipelines de CI lo detecten.

#### H-01-S2: Intento de acceso con cuenta no aprovisionada

- **Escenario:** Un usuario con cuenta corporativa válida pero no aprovisionada intenta entrar al sistema.
  - **Given:** El proveedor OAuth corporativo está configurado y la cuenta NO ha sido aprovisionada.
  - **When:** El usuario intenta iniciar sesión.
  - **Then:** Se muestra un mensaje de acceso denegado y no se le permite entrar al sistema.
  - **Por qué importa:** Sin este test, un error en la validación del aprovisionamiento podría conceder acceso a usuarios no autorizados, representando una brecha de seguridad crítica.

#### H-01-S3: Sesión expirada

- **Escenario:** El token de acceso del usuario expira mientras tiene sesión activa.
  - **Given:** El usuario tiene una sesión activa con un token próximo a expirar.
  - **When:** El token de acceso expira.
  - **Then:** El usuario es redirigido a la pantalla de login y sus datos no se pierden al volver a autenticarse.
  - **Por qué importa:** Sin este test, una regresión en el middleware de autenticación podría dejar al usuario en un estado roto (pantalla en blanco, bucle de redirección, pérdida de contexto).

---

### H-02: Gestión de tickets en el tablero Kanban

#### H-02-S1: Creación de un ticket válido

- **Escenario:** Un usuario autenticado crea un ticket con título y prioridad.
  - **Given:** El usuario está autenticado y visualiza el tablero Kanban.
  - **When:** Crea un ticket con título y prioridad.
  - **Then:** El ticket aparece en la columna "Por hacer" y es visible para todos los miembros del equipo.
  - **Por qué importa:** Es el flujo de negocio más fundamental; si falla en silencio, el equipo pierde visibilidad del trabajo sin recibir ningún aviso.

#### H-02-S2: Avance normal de un ticket por el flujo

- **Escenario:** Un ticket en "Por hacer" se mueve a "En progreso".
  - **Given:** Existe un ticket en la columna "Por hacer".
  - **When:** El usuario cambia su estado a "En progreso".
  - **Then:** El ticket aparece en "En progreso" y el campo `updated_at` refleja el momento del cambio.
  - **Por qué importa:** Sin verificar `updated_at`, el Optimistic Locking (H-03) no puede funcionar correctamente; un error aquí corrompe toda la lógica de concurrencia.

#### H-02-S3: Marcar un ticket como bloqueado

- **Escenario:** Un usuario activa el flag "Bloqueado" en un ticket activo.
  - **Given:** Existe un ticket en cualquier columna activa.
  - **When:** El usuario activa el flag "Bloqueado".
  - **Then:** El ticket muestra un badge rojo sin cambiar de columna y sigue siendo visible en su estado actual.
  - **Por qué importa:** Sin este test, un refactor del componente del ticket podría eliminar el badge o mover el ticket a una columna incorrecta sin detectarse.

#### H-02-S4: Archivar un ticket propio

- **Escenario:** El creador de un ticket elige eliminarlo.
  - **Given:** El usuario autenticado es el creador del ticket.
  - **When:** Elige eliminar el ticket.
  - **Then:** El ticket desaparece del tablero pero el sistema lo conserva para el cómputo histórico de métricas.
  - **Por qué importa:** Un borrado físico en lugar de lógico destruiría datos históricos irreversiblemente; sin test, este error puede pasar a producción silenciosamente.

#### H-02-S5: Intentar editar un ticket ajeno como member

- **Escenario:** Un usuario con rol member intenta modificar un ticket creado por otra persona.
  - **Given:** El usuario tiene rol member y existe un ticket creado por otra persona.
  - **When:** Intenta modificar ese ticket.
  - **Then:** El sistema rechaza la acción y el ticket permanece sin cambios.
  - **Por qué importa:** Sin este test, una vulnerabilidad de autorización horizontal (IDOR) permitiría a cualquier member sobrescribir trabajo ajeno.

---

### H-03: Edición segura ante cambios concurrentes

#### H-03-S1: El primer usuario guarda sin conflicto

- **Escenario:** El primer usuario en guardar un ticket compartido lo hace sin conflicto.
  - **Given:** Dos usuarios tienen el mismo ticket abierto simultáneamente.
  - **When:** El primer usuario guarda sus cambios.
  - **Then:** El ticket se actualiza correctamente y la versión del ticket se incrementa.
  - **Por qué importa:** Sin verificar el incremento de versión, el Optimistic Locking no tiene base de comparación y cualquier cambio concurrente podría pasar silenciosamente.

#### H-03-S2: Segundo usuario guarda sobre versión desactualizada

- **Escenario:** El segundo usuario intenta guardar sus cambios después de que el primero ya guardó.
  - **Given:** El primer usuario ya guardó cambios en el ticket incrementando su versión.
  - **When:** El segundo usuario intenta guardar sus propios cambios con la versión antigua.
  - **Then:** El sistema rechaza la operación, informa al segundo usuario del conflicto y los cambios locales del segundo usuario permanecen visibles en su formulario.
  - **Por qué importa:** Sin este test, las actualizaciones concurrentes pueden sobreescribirse silenciosamente, generando pérdida de datos sin que ningún usuario lo sepa.

#### H-03-S3: Cambio de estado concurrente

- **Escenario:** Dos usuarios envían simultáneamente un cambio de estado para el mismo ticket.
  - **Given:** Dos usuarios intentan cambiar el estado del mismo ticket al mismo tiempo.
  - **When:** Ambos envían el cambio simultáneamente.
  - **Then:** Solo uno de los cambios se aplica y el otro usuario recibe la notificación de conflicto.
  - **Por qué importa:** Es el escenario de race condition más probable en el día a día de un equipo; sin test de integración, solo se detecta en producción bajo carga real.

---

### EC-01: Notificación sobre comentario archivado antes del envío

#### EC-01-S1: Notificación enviada cuando el comentario sigue activo

- **Escenario:** El sistema procesa la cola de emails y el comentario original sigue activo.
  - **Given:** Existe un ticket con asignado, el sistema tiene cola de envío con retardo mínimo y se agregó un comentario no archivado.
  - **When:** El sistema procesa la cola de notificaciones.
  - **Then:** El asignado recibe un email con el contenido del comentario.
  - **Por qué importa:** Sin este test, una regresión en el worker de emails podría silenciar todas las notificaciones sin errores visibles.

#### EC-01-S2: Notificación cancelada por comentario archivado antes del envío

- **Escenario:** El autor archiva su comentario antes de que se despache el email.
  - **Given:** Existe un comentario en cola de envío que es archivado antes del despacho.
  - **When:** El sistema procesa la cola de notificaciones.
  - **Then:** No se envía ningún email al asignado y la cancelación es silenciosa (sin error registrado).
  - **Por qué importa:** Sin este test, el usuario recibiría emails con enlaces a contenido inexistente, erosionando la confianza en la herramienta.

#### EC-01-S3: Mención con @handle en comentario archivado antes del envío

- **Escenario:** Un comentario con mención @handle es archivado antes de que se despache el email de mención.
  - **Given:** Existe un comentario con mención @handle en cola de envío que es archivado antes del despacho.
  - **When:** El sistema procesa la cola de notificaciones.
  - **Then:** El usuario mencionado no recibe ningún email.
  - **Por qué importa:** Sin este test, el código de menciones y el de notificaciones generales podrían tratarse en ramas separadas, y la cancelación por archivo podría aplicarse solo a una de ellas.

---

### EC-02: Exportación de métricas CSV con datos inválidos o vacíos

#### EC-02-S1: Exportar con filtros sin resultados

- **Escenario:** El usuario ve el dashboard con filtros que no corresponden a ningún ticket.
  - **Given:** Los filtros activos no corresponden a ningún ticket.
  - **Then:** El botón "Exportar CSV" está deshabilitado, se muestra el tooltip "No hay datos para el rango seleccionado" y no se realiza ninguna petición al servidor.
  - **Por qué importa:** Sin este test, el botón podría ejecutar una petición que retorna un CSV vacío sin avisar al usuario, o peor, lanzar un error no manejado.

#### EC-02-S2: Exportar con rango de fechas inválido

- **Escenario:** El filtro de fecha tiene "desde" posterior a "hasta".
  - **Given:** El filtro de fecha tiene "desde" posterior a "hasta".
  - **When:** El usuario intenta exportar.
  - **Then:** El servidor responde con HTTP 400, se muestra un mensaje de error de rango inválido y no se descarga ningún archivo.
  - **Por qué importa:** Sin este test, el servidor podría retornar un CSV vacío (200 OK) en lugar de un error explícito, ocultando el problema al usuario.

#### EC-02-S3: Exportar con sesión expirada

- **Escenario:** El usuario intenta exportar con el token de sesión expirado.
  - **Given:** El token de sesión ha expirado.
  - **When:** El usuario hace clic en "Exportar CSV".
  - **Then:** El servidor responde con HTTP 401, el usuario es redirigido a la pantalla de login y no se descarga ningún archivo.
  - **Por qué importa:** Sin este test, un 401 no interceptado podría mostrar un error técnico crudo al usuario en lugar de redirigirlo al login.

#### EC-02-S4: Exportar volumen grande sin error de memoria

- **Escenario:** El rango de fechas contiene miles de tickets y el servidor debe hacer streaming.
  - **Given:** El rango seleccionado contiene miles de tickets.
  - **When:** El usuario hace clic en "Exportar CSV".
  - **Then:** El archivo comienza a descargarse progresivamente, el servidor no acumula todos los registros en memoria y el archivo cumple el formato RFC 4180.
  - **Por qué importa:** Sin este test, una exportación masiva puede causar un OOM (Out of Memory) en el servidor, afectando a todos los usuarios de la instancia.

---

## Sección 3 — Deuda técnica de testing (top 3 por criticidad de negocio)

### 🔴 #1 — Autorización horizontal: edición de tickets ajenos (IDOR)

- **Historia(s) afectada(s):** H-02-S5
- **Riesgo en producción:** Un usuario con rol `member` puede modificar o archivar tickets creados por otros usuarios si el backend no valida la propiedad del ticket en cada endpoint de actualización. Sin test, este bug puede existir desde el día 1 sin que nadie lo detecte, comprometiendo la integridad de todo el tablero.
- **Tipo de test recomendado:** Integration (backend) — requiere levantar la base de datos en memoria y hacer una petición HTTP real con un JWT de usuario distinto al creador.
- **Sugerencia de implementación:**

```typescript
// backend/src/modules/tickets/__tests__/ticket-authorization.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { app } from '../../../app';
import { db } from '../../../db';
import { tickets, users } from '../../../db/schema';
import { signToken } from '../../../lib/auth';

describe('Ticket authorization — IDOR prevention', () => {
  let ownerToken: string;
  let memberToken: string;
  let ticketId: string;

  beforeEach(async () => {
    // Crear usuario propietario y miembro en la base de datos de test
    const [owner] = await db.insert(users).values({ id: 'owner-1', email: 'owner@corp.com', role: 'member' }).returning();
    const [member] = await db.insert(users).values({ id: 'member-1', email: 'member@corp.com', role: 'member' }).returning();
    const [ticket] = await db.insert(tickets).values({ title: 'Ticket del owner', createdBy: owner.id, status: 'todo' }).returning();

    ownerToken = signToken({ sub: owner.id, role: owner.role });
    memberToken = signToken({ sub: member.id, role: member.role });
    ticketId = ticket.id;
  });

  it('should reject a PATCH from a member who is not the ticket owner', async () => {
    const response = await request(app)
      .patch(`/api/tickets/${ticketId}`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ title: 'Titulo modificado por intruso' });

    expect(response.status).toBe(403);
    const unchanged = await db.query.tickets.findFirst({ where: (t, { eq }) => eq(t.id, ticketId) });
    expect(unchanged?.title).toBe('Ticket del owner');
  });

  it('should allow the ticket owner to PATCH their own ticket', async () => {
    const response = await request(app)
      .patch(`/api/tickets/${ticketId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ title: 'Nuevo título del owner' });

    expect(response.status).toBe(200);
  });
});
```

---

### 🟠 #2 — Optimistic Locking: guardar sobre versión desactualizada

- **Historia(s) afectada(s):** H-03-S2, H-03-S3
- **Riesgo en producción:** Si dos usuarios editan el mismo ticket simultáneamente y el backend no implementa o no testea el control de versión, el último en guardar sobreescribe silenciosamente los cambios del primero. Esto produce pérdida de datos sin ningún mensaje de error, y el equipo no se enterará hasta que note discrepancias en el historial.
- **Tipo de test recomendado:** Integration (backend) — simular dos peticiones PATCH con la misma versión de ticket; la segunda debe fallar con 409 Conflict.
- **Sugerencia de implementación:**

```typescript
// backend/src/modules/tickets/__tests__/optimistic-locking.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../../../app';
import { db } from '../../../db';
import { tickets, users } from '../../../db/schema';
import { signToken } from '../../../lib/auth';

describe('Optimistic Locking — concurrent ticket updates', () => {
  let token1: string;
  let token2: string;
  let ticketId: string;
  const INITIAL_VERSION = 1;

  beforeEach(async () => {
    const [u1] = await db.insert(users).values({ id: 'u1', email: 'u1@corp.com', role: 'member' }).returning();
    const [u2] = await db.insert(users).values({ id: 'u2', email: 'u2@corp.com', role: 'member' }).returning();
    const [ticket] = await db.insert(tickets).values({
      title: 'Ticket concurrente',
      createdBy: u1.id,
      status: 'todo',
      version: INITIAL_VERSION,
    }).returning();

    token1 = signToken({ sub: u1.id, role: u1.role });
    token2 = signToken({ sub: u2.id, role: u2.role });
    ticketId = ticket.id;
  });

  it('first save succeeds and increments version', async () => {
    const res = await request(app)
      .patch(`/api/tickets/${ticketId}`)
      .set('Authorization', `Bearer ${token1}`)
      .send({ title: 'Cambio del usuario 1', version: INITIAL_VERSION });

    expect(res.status).toBe(200);
    expect(res.body.version).toBe(INITIAL_VERSION + 1);
  });

  it('second save with stale version returns 409 Conflict', async () => {
    // Usuario 1 guarda primero
    await request(app)
      .patch(`/api/tickets/${ticketId}`)
      .set('Authorization', `Bearer ${token1}`)
      .send({ title: 'Cambio del usuario 1', version: INITIAL_VERSION });

    // Usuario 2 intenta guardar con la versión antigua
    const res = await request(app)
      .patch(`/api/tickets/${ticketId}`)
      .set('Authorization', `Bearer ${token2}`)
      .send({ title: 'Cambio del usuario 2', version: INITIAL_VERSION });

    expect(res.status).toBe(409);
    expect(res.body).toMatchObject({ error: expect.stringContaining('conflict') });
  });
});
```

---

### 🟡 #3 — Autenticación OAuth: acceso con cuenta no aprovisionada

- **Historia(s) afectada(s):** H-01-S2, H-01-S3
- **Riesgo en producción:** Si el callback de OAuth no valida correctamente que el usuario existe en la base de datos local (aprovisionado por admin), cualquier persona con una cuenta del proveedor corporativo podría acceder al sistema. Adicionalmente, si la redirección post-expiración no funciona, el usuario queda en un estado indefinido con peticiones 401 continuas.
- **Tipo de test recomendado:** Unit (backend, middleware de autenticación) + Integration (flujo de callback OAuth con proveedor mockeado).
- **Sugerencia de implementación:**

```typescript
// backend/src/middlewares/__tests__/auth-middleware.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { requireAuth } from '../auth';
import { db } from '../../db';
import { users } from '../../db/schema';
import { signToken } from '../../lib/auth';

vi.mock('../../db');

describe('requireAuth middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRes = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    mockNext = vi.fn();
  });

  it('rejects request when user exists in OAuth provider but is not provisioned in DB', async () => {
    const tokenForUnprovisionedUser = signToken({ sub: 'ghost-user-id', role: 'member' });
    mockReq = { headers: { authorization: `Bearer ${tokenForUnprovisionedUser}` } };

    vi.mocked(db.query.users.findFirst).mockResolvedValueOnce(undefined); // no está en BD

    await requireAuth(mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(403);
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.any(String) }));
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('calls next() when user is provisioned and token is valid', async () => {
    const provisionedUser = { id: 'user-1', email: 'user@corp.com', role: 'member' };
    const validToken = signToken({ sub: provisionedUser.id, role: provisionedUser.role });
    mockReq = { headers: { authorization: `Bearer ${validToken}` } };

    vi.mocked(db.query.users.findFirst).mockResolvedValueOnce(provisionedUser as any);

    await requireAuth(mockReq as Request, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalledOnce();
  });

  it('returns 401 when Authorization header is missing', async () => {
    mockReq = { headers: {} };

    await requireAuth(mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockNext).not.toHaveBeenCalled();
  });
});
```

---

## Sección 4 — Estado de la infraestructura de testing

| Elemento | Esperado | Estado encontrado |
|----------|----------|-------------------|
| Carpeta `backend/src/test/` | Existe | ❌ No existe |
| Carpeta `frontend/src/test/` | Existe | ✅ Existe (subdirs: `unit/`, `e2e/`) |
| `vitest.config.ts` (frontend) | Existe | ❌ No existe (vite.config.ts sin sección test) |
| Runner configurado (backend) | jest o vitest | ❌ No configurado (ni en scripts ni en devDependencies) |
| Runner configurado (frontend) | vitest | ⚠️ `vitest` instalado como devDependency pero sin `vitest.config.ts` ni scripts de test |
| Archivos `*.test.ts` encontrados | ≥ 1 | **0** |
| Archivos `*.spec.ts` encontrados | ≥ 1 | **0** |
| Archivos `*.test.tsx` encontrados | ≥ 1 | **0** |
| `@playwright/test` instalado | — | ✅ v1.59.1 (frontend devDependencies) |
| `@testing-library/react` instalado | — | ✅ v16.3.2 (frontend devDependencies) |
| `msw` instalado | — | ✅ v2.13.4 (frontend devDependencies) |

---

## Notas

1. **Se encontraron 0 archivos de test en todo el proyecto.** La carpeta `frontend/src/test/` existe con subdirectorios `unit/` y `e2e/`, pero ambos estaban vacíos al momento de la auditoría.

2. **Rutas buscadas:**
   - `C:/Users/DGUTIERREZ/Documents/cursos/ejercicio3/MiniJira_Curso/**/*.test.ts` (excl. node_modules)
   - `C:/Users/DGUTIERREZ/Documents/cursos/ejercicio3/MiniJira_Curso/**/*.spec.ts` (excl. node_modules)
   - `C:/Users/DGUTIERREZ/Documents/cursos/ejercicio3/MiniJira_Curso/**/*.test.tsx` (excl. node_modules)
   - `C:/Users/DGUTIERREZ/Documents/cursos/ejercicio3/MiniJira_Curso/**/*.spec.tsx` (excl. node_modules)

3. **Corrección de rutas aplicada:** El prompt original referenciaba `@Specs-MiniJira/backlog.md` (no existe) → corregido a `backlog.md` (raíz del proyecto). También referenciaba `apps/api/` (no existe) → corregido a `backend/` y `frontend/` según la estructura real del monorepo.

4. **Infraestructura de testing parcialmente preparada:** El frontend tiene instaladas las dependencias de testing (`vitest`, `@testing-library/react`, `@playwright/test`, `msw`) y la estructura de carpetas, pero falta `vitest.config.ts` y los scripts `test` en `package.json`. El backend no tiene ningún runner configurado: para añadir vitest se requiere instalarlo como devDependency y crear `vitest.config.ts`.
