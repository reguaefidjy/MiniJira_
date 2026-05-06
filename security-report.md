# Reporte de Auditoría de Seguridad — MiniJira
**Fecha:** 2026-05-04  
**Auditor:** Especialista en Seguridad OWASP  
**Alcance:** `frontend/src/api/`, `backend/src/` (toda la capa API y configuración)  
**Framework de referencia:** OWASP Top 10 2021

---

## Resumen Ejecutivo

| Severidad | Cantidad |
|-----------|----------|
| CRÍTICO   | 3        |
| ALTO      | 5        |
| MEDIO     | 5        |
| BAJO      | 3        |
| **Total** | **16**   |

La aplicación tiene **tres vulnerabilidades críticas** que combinadas anulan completamente el modelo de seguridad: los middlewares de autenticación y autorización son funciones vacías que siempre aprueban cualquier petición, y el sistema JWT no está implementado. Cualquier atacante puede acceder a todos los endpoints de la API —incluyendo los de administración— sin credenciales.

---

## CRÍTICO

---

### C-01 — Middleware de Autenticación es un No-Op Total
**OWASP:** A07:2021 – Identification and Authentication Failures  
**Archivo:** `backend/src/middlewares/authenticate.ts:3`

**Evidencia:**
```typescript
// TODO: verify JWT from httpOnly cookie and attach req.user
export const authenticate: RequestHandler = (_req, _res, next) => next();
```

**Impacto real:**  
Cada ruta que usa `authenticate` como guardia —tickets, comentarios, usuarios, labels, métricas, admin— es completamente pública. Cualquier petición HTTP anónima tiene acceso total a todos los datos de la aplicación sin necesidad de ninguna credencial. No existe ninguna barrera de autenticación en producción.

---

### C-02 — Middleware de Autorización es un No-Op Total
**OWASP:** A01:2021 – Broken Access Control  
**Archivo:** `backend/src/middlewares/authorize.ts:4-5`

**Evidencia:**
```typescript
// TODO: check req.user.role against required roles
export const authorize = (..._roles: UserRole[]): RequestHandler =>
  (_req, _res, next) => next();
```

**Impacto real:**  
Los endpoints de administración (`POST /api/admin/users`, `PATCH /api/admin/users/:id`, `PATCH /api/admin/users/:id/deactivate`) y los de gestión de labels (crear, modificar, eliminar) están marcados con `authorize('admin')`, pero ese guardia no hace nada. Cualquier usuario —o atacante sin autenticar, dado C-01— puede crear, modificar o desactivar usuarios y manipular el catálogo de labels.

**Rutas afectadas:**
```
POST   /api/admin/users                    → authorize('admin') ← inoperante
PATCH  /api/admin/users/:id               → authorize('admin') ← inoperante
PATCH  /api/admin/users/:id/deactivate    → authorize('admin') ← inoperante
POST   /api/labels                        → authorize('admin') ← inoperante
PATCH  /api/labels/:id                    → authorize('admin') ← inoperante
DELETE /api/labels/:id                    → authorize('admin') ← inoperante
```

---

### C-03 — JWT Completamente No Implementado
**OWASP:** A07:2021 – Identification and Authentication Failures  
**Archivo:** `backend/src/lib/jwt.ts:5-6`

**Evidencia:**
```typescript
export const signAccessToken  = (_payload: Omit<JwtPayload, 'iat' | 'exp'>): string => {
  throw new Error('Not implemented');
};
export const verifyAccessToken = (_token: string): JwtPayload => {
  throw new Error('Not implemented');
};
```

**Impacto real:**  
Aunque se corrigiesen C-01 y C-02, el sistema de tokens JWT no puede firmar ni verificar ningún token. Cualquier llamada real a `signAccessToken` o `verifyAccessToken` lanza una excepción no controlada que derrumbaría el servidor. La autenticación completa es inoperante de extremo a extremo.

---

## ALTO

---

### A-01 — Acceso a `req.user` con Non-Null Assertion sobre Valor Siempre Undefined
**OWASP:** A01:2021 – Broken Access Control  
**Archivo:** `backend/src/modules/tickets/tickets.controller.ts:103`

**Evidencia:**
```typescript
const ticket = await service.createTicket(
  { ... },
  req.user!.sub,   // ← req.user es siempre undefined porque authenticate es un no-op
);
```

**Impacto real:**  
Cuando se invoque `POST /api/tickets`, TypeScript suprime el error de compilación con `!` pero en runtime `req.user` es `undefined`. La expresión `undefined.sub` lanza `TypeError: Cannot read properties of undefined`, resultando en un error 500 no controlado. El servidor puede crashear o comportarse de forma impredecible en producción.

---

### A-02 — CORS con `origin: undefined` Puede Permitir Todos los Orígenes
**OWASP:** A05:2021 – Security Misconfiguration  
**Archivo:** `backend/src/app.ts:16`

**Evidencia:**
```typescript
app.use(cors({ origin: process.env.CORS_ORIGIN, credentials: true }));
```

**Impacto real:**  
Si `CORS_ORIGIN` no está definida en el entorno (variable de entorno ausente), `origin` vale `undefined`. En la librería `cors` de npm, `origin: undefined` hace que el middleware omita la validación y refleje el origen de cada petición en el header `Access-Control-Allow-Origin`. Combinado con `credentials: true`, cualquier sitio web malicioso puede hacer peticiones cross-origin con cookies. Esto facilita ataques CSRF y robo de sesión desde dominios arbitrarios.

---

### A-03 — Flujo OAuth sin Validación de Parámetro `state` (CSRF en OAuth)
**OWASP:** A01:2021 – Broken Access Control  
**Archivos:** `frontend/src/pages/AuthCallbackPage.tsx:14`, `frontend/src/api/auth.ts:9-16`

**Evidencia:**
```typescript
// AuthCallbackPage.tsx
const code = params.get('code')   // solo se valida el code, nunca el state
postAuthCallback(code)

// api/auth.ts
export async function postAuthCallback(code: string): Promise<void> {
  const res = await fetch('/api/auth/callback', {
    method: 'POST',
    body: JSON.stringify({ code }),   // state nunca se envía ni verifica
  })
}
```

**Impacto real:**  
Un atacante puede iniciar un flujo OAuth legítimo, detenerlo antes del intercambio de código, y redirigir a la víctima a `/auth/callback?code=<código_del_atacante>`. Sin un parámetro `state` CSRF aleatorio vinculado a la sesión del usuario, la víctima quedará autenticada con la cuenta del atacante (login CSRF), entregando acceso no autorizado a los datos de la aplicación.

---

### A-04 — Header Injection en `Content-Disposition` del Export CSV
**OWASP:** A03:2021 – Injection  
**Archivo:** `backend/src/lib/csv.ts:7`

**Evidencia:**
```typescript
export const startCsvStream = (res: Response, filename: string): void => {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  //                                                       ^^^^^^^^^^^^
  //                                         sin sanitizar: \n, \r, " sin escapar
};
```

**Impacto real:**  
Si el valor de `filename` proviene de datos de usuario o de la base de datos (p.ej. nombre de un proyecto exportado), un valor como `report.csv"\r\nX-Injected-Header: malicious` inyecta cabeceras HTTP adicionales. Esto puede usarse para ataques de response splitting, bypass de políticas de seguridad o envenenamiento de caché de proxies intermedios.

---

### A-05 — Secretos JWT con Valores Débiles por Defecto
**OWASP:** A02:2021 – Cryptographic Failures  
**Archivo:** `backend/.env.example:6-7`

**Evidencia:**
```
JWT_ACCESS_SECRET=change-me-access
JWT_REFRESH_SECRET=change-me-refresh
```

**Impacto real:**  
Si el fichero `.env` se genera copiando `.env.example` sin modificar los secretos, los tokens JWT estarán firmados con claves conocidas públicamente. Un atacante que conozca el secreto puede forjar tokens JWT válidos para cualquier usuario, incluyendo administradores, sin necesidad de credenciales. Este patrón es uno de los vectores más comunes en filtraciones de repositorios.

---

## MEDIO

---

### M-01 — Sin Rate Limiting en Endpoints de Autenticación
**OWASP:** A04:2021 – Insecure Design  
**Archivo:** `backend/src/app.ts` (ausencia de middleware)

**Evidencia:**  
No existe ninguna referencia a `express-rate-limit`, `rate-limiter-flexible` u otro mecanismo de limitación de tasa en toda la base de código del backend.

**Impacto real:**  
Los endpoints `POST /api/auth/callback` y `POST /api/auth/refresh` pueden recibir peticiones ilimitadas. Un atacante puede realizar ataques de fuerza bruta contra tokens de refresco, o saturar el servicio OAuth externo con intercambios de código masivos, degradando la disponibilidad del sistema.

---

### M-02 — Error Handler Expone Mensajes Internos en Respuestas
**OWASP:** A09:2021 – Security Logging and Monitoring Failures  
**Archivo:** `backend/src/middlewares/errorHandler.ts:6`

**Evidencia:**
```typescript
const message = status === 500
  ? 'An unexpected error occurred'
  : String(err.message ?? err);   // ← errores de BD, Drizzle, OAuth se exponen directamente
```

**Impacto real:**  
Errores de Drizzle/SQLite (p.ej. `UNIQUE constraint failed: users.email`), mensajes de OAuth o rutas de ficheros internas pueden exponerse al cliente en errores 4xx. Esta información ayuda a un atacante a mapear la estructura interna de la base de datos, el proveedor de OAuth y la arquitectura del sistema.

---

### M-03 — Sin Límite de Longitud en Campo `description` de Tickets
**OWASP:** A03:2021 – Injection  
**Archivo:** `backend/src/modules/tickets/tickets.controller.ts:70-72`

**Evidencia:**
```typescript
if (b.description !== undefined && b.description !== null && typeof b.description !== 'string') {
  return next(validationError('description must be a string or null'));
}
// ← sin validación de longitud máxima
```

**Impacto real:**  
Un atacante puede enviar payloads de megabytes en el campo `description`. Esto puede saturar la memoria del servidor Node.js, degradar el rendimiento de SQLite en operaciones de inserción/actualización, y potencialmente provocar denegación de servicio. El campo `title` tiene límite de 120 caracteres pero `description` no tiene ninguno.

---

### M-04 — Base de Datos SQLite Incluida en el Repositorio
**OWASP:** A02:2021 – Cryptographic Failures  
**Archivo:** `backend/minijira.db` (fichero binario presente en el árbol git)

**Evidencia:**  
El fichero `backend/minijira.db` existe en el directorio de trabajo y no aparece en `.gitignore`, lo que indica que está (o estuvo) tracked por git.

**Impacto real:**  
Cualquier persona con acceso al repositorio (colaboradores, empleados con acceso pasado, o en caso de repositorio público) puede descargar la base de datos completa con todos los tickets, comentarios, usuarios, hashes de tokens de refresco y cualquier dato sensible almacenado durante el desarrollo.

---

### M-05 — Sin Headers de Seguridad HTTP
**OWASP:** A05:2021 – Security Misconfiguration  
**Archivo:** `backend/src/app.ts` (ausencia de middleware)

**Evidencia:**  
No existe ninguna referencia a `helmet` ni configuración manual de headers de seguridad en `app.ts`.

**Impacto real:**  
La ausencia de los siguientes headers expone a los usuarios a ataques evitables:
- Sin `Content-Security-Policy` → XSS desde recursos externos
- Sin `X-Frame-Options` / `frame-ancestors` → clickjacking
- Sin `X-Content-Type-Options: nosniff` → MIME sniffing
- Sin `Strict-Transport-Security` → downgrade a HTTP
- Sin `Referrer-Policy` → fuga de URLs internas a terceros

---

## BAJO

---

### B-01 — Sin Atributo `SameSite` Configurado Explícitamente en Cookies
**OWASP:** A01:2021 – Broken Access Control  
**Archivo:** `backend/src/modules/auth/auth.controller.ts` (ausencia de configuración)

**Evidencia:**  
Los controladores de auth son stubs no implementados. No hay ninguna llamada a `res.cookie()` con los atributos `httpOnly`, `secure` y `sameSite` definidos explícitamente.

**Impacto real:**  
Cuando se implemente la emisión de cookies de sesión/refresco, si no se configura `SameSite=Strict` o `SameSite=Lax`, el navegador enviará las cookies en peticiones cross-site, facilitando ataques CSRF incluso si el backend implementa correctamente la autenticación.

---

### B-02 — Controladores Implementados como Stubs que Llaman `next()` sin Respuesta
**OWASP:** A04:2021 – Insecure Design  
**Archivos:** `backend/src/modules/comments/comments.controller.ts:3-5`, `backend/src/modules/auth/auth.controller.ts:3-6`, `backend/src/modules/users/users.controller.ts:3`, `backend/src/modules/metrics/metrics.controller.ts:3-4`, `backend/src/modules/admin/admin.controller.ts:3-5`

**Evidencia:**
```typescript
// Patrón repetido en múltiples controladores:
export const list: RequestHandler = async (_req, _res, next) => next();
```

**Impacto real:**  
Llamar a `next()` sin enviar respuesta ni pasar un error deja la petición HTTP sin respuesta, lo que en Express resulta en un timeout colgante. En un entorno de producción con proxies inversos, esto puede interpretarse como un error 502/504, causar agotamiento del pool de conexiones o filtrarse información a través de tiempos de respuesta inconsistentes.

---

### B-03 — `DATABASE_URL` con Ruta Relativa sin Validación
**OWASP:** A05:2021 – Security Misconfiguration  
**Archivo:** `backend/drizzle.config.ts:8`, `backend/.env.example:3`

**Evidencia:**
```typescript
// drizzle.config.ts
url: process.env.DATABASE_URL ?? './minijira.db',

// .env.example
DATABASE_URL=./minijira.db
```

**Impacto real:**  
Una ruta relativa como `DATABASE_URL` depende del directorio de trabajo actual del proceso. Si el servidor se inicia desde un directorio diferente (contenedor, systemd con `WorkingDirectory` incorrecto), SQLite creará una nueva base de datos vacía en lugar de usar la correcta, resultando en pérdida de datos silenciosa. Adicionalmente, si `DATABASE_URL` se manipula mediante variables de entorno en pipelines CI/CD comprometidos, podría apuntar a una ruta arbitraria del sistema de ficheros.

---

## Matriz de Riesgo

| ID   | Título                                      | OWASP  | Severidad | Probabilidad | Impacto  |
|------|---------------------------------------------|--------|-----------|--------------|----------|
| C-01 | authenticate es no-op                       | A07    | CRÍTICO   | Certeza      | Crítico  |
| C-02 | authorize es no-op                          | A01    | CRÍTICO   | Certeza      | Crítico  |
| C-03 | JWT no implementado                         | A07    | CRÍTICO   | Certeza      | Crítico  |
| A-01 | req.user! con valor undefined               | A01    | ALTO      | Alta         | Alto     |
| A-02 | CORS origin undefined                       | A05    | ALTO      | Media        | Alto     |
| A-03 | OAuth sin state CSRF                        | A01    | ALTO      | Media        | Alto     |
| A-04 | Header injection Content-Disposition        | A03    | ALTO      | Media        | Alto     |
| A-05 | Secretos JWT débiles por defecto            | A02    | ALTO      | Alta         | Crítico  |
| M-01 | Sin rate limiting en auth                   | A04    | MEDIO     | Alta         | Medio    |
| M-02 | Error handler expone mensajes internos      | A09    | MEDIO     | Alta         | Medio    |
| M-03 | Sin límite de longitud en description       | A03    | MEDIO     | Media        | Medio    |
| M-04 | Base de datos en repositorio                | A02    | MEDIO     | Alta         | Alto     |
| M-05 | Sin headers de seguridad HTTP               | A05    | MEDIO     | Certeza      | Medio    |
| B-01 | Sin SameSite en cookies                     | A01    | BAJO      | Media        | Bajo     |
| B-02 | Stubs que llaman next() sin respuesta       | A04    | BAJO      | Alta         | Bajo     |
| B-03 | DATABASE_URL con ruta relativa              | A05    | BAJO      | Baja         | Medio    |
