# Prompt de Correcciones de Seguridad — MiniJira

Eres un ingeniero de seguridad backend senior. Tu misión es aplicar todas las correcciones de seguridad listadas a continuación en el repositorio MiniJira, en estricto orden de severidad (CRÍTICO → ALTO → MEDIO → BAJO). No modifiques ninguna lógica de negocio existente. No añadas funcionalidades nuevas. Aplica solo lo necesario para corregir cada vulnerabilidad.

Antes de comenzar, lee los siguientes archivos para entender el contexto:
- `backend/src/middlewares/authenticate.ts`
- `backend/src/middlewares/authorize.ts`
- `backend/src/lib/jwt.ts`
- `backend/src/modules/tickets/tickets.controller.ts`
- `backend/src/app.ts`
- `backend/src/lib/csv.ts`
- `backend/.env.example`
- `backend/src/middlewares/errorHandler.ts`
- `backend/src/types/index.ts`
- `frontend/src/pages/AuthCallbackPage.tsx`
- `frontend/src/api/auth.ts`

---

## Correcciones CRÍTICAS (aplicar primero)

### C-01: Implementar el middleware `authenticate`
**Archivo:** `backend/src/middlewares/authenticate.ts`

Reemplaza el stub actual con la implementación real:

1. Leer el access token desde la cookie `access_token` (httpOnly).
2. Llamar a `verifyAccessToken(token)` (de `../lib/jwt`).
3. Si el token es válido, asignar el payload a `req.user` y llamar a `next()`.
4. Si el token falta o es inválido, responder con `401 Unauthorized` y el cuerpo `{ error: 'unauthorized', message: 'Authentication required' }`. No llamar a `next()`.
5. Manejar el caso en que la cookie no existe (también 401).

```typescript
// Firma esperada del resultado:
import { RequestHandler } from 'express';
import { verifyAccessToken } from '../lib/jwt';

export const authenticate: RequestHandler = (req, res, next) => {
  const token = req.cookies?.access_token as string | undefined;
  if (!token) {
    res.status(401).json({ error: 'unauthorized', message: 'Authentication required' });
    return;
  }
  try {
    req.user = verifyAccessToken(token);
    next();
  } catch {
    res.status(401).json({ error: 'unauthorized', message: 'Invalid or expired token' });
  }
};
```

---

### C-02: Implementar el middleware `authorize`
**Archivo:** `backend/src/middlewares/authorize.ts`

Reemplaza el stub actual con la implementación real:

1. Verificar que `req.user` existe (si no existe, responder 401).
2. Verificar que `req.user.role` está en la lista de `roles` permitidos.
3. Si el rol no está permitido, responder con `403 Forbidden` y el cuerpo `{ error: 'forbidden', message: 'Insufficient permissions' }`.
4. Si está permitido, llamar a `next()`.

```typescript
import { RequestHandler } from 'express';
import { UserRole } from '../types';

export const authorize = (...roles: UserRole[]): RequestHandler =>
  (req, res, next) => {
    if (!req.user) {
      res.status(401).json({ error: 'unauthorized', message: 'Authentication required' });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: 'forbidden', message: 'Insufficient permissions' });
      return;
    }
    next();
  };
```

---

### C-03: Implementar `signAccessToken` y `verifyAccessToken` en `jwt.ts`
**Archivo:** `backend/src/lib/jwt.ts`

Reemplaza los stubs que lanzan `Error('Not implemented')`:

1. `signAccessToken(payload)`: firma el payload con `process.env.JWT_ACCESS_SECRET` y expiración `process.env.JWT_ACCESS_EXPIRES_IN` (default `'15m'`). Usar algoritmo `HS256`.
2. `verifyAccessToken(token)`: verifica y decodifica el token con `process.env.JWT_ACCESS_SECRET`. Si falla, relanzar el error (será capturado por `authenticate`).
3. Añadir también `signRefreshToken(payload)` usando `JWT_REFRESH_SECRET` y `JWT_REFRESH_EXPIRES_IN` (default `'7d'`).
4. Validar que los secretos existen al inicializar (lanzar error en startup si no están definidos o tienen los valores por defecto `change-me-*`).

```typescript
import jwt from 'jsonwebtoken';
import { JwtPayload } from '../types';

function requireSecret(name: string, value: string | undefined, forbidden: string[]): string {
  if (!value || forbidden.includes(value)) {
    throw new Error(`${name} env var is missing or uses an insecure default value`);
  }
  return value;
}

const ACCESS_SECRET  = requireSecret('JWT_ACCESS_SECRET',  process.env.JWT_ACCESS_SECRET,  ['change-me-access']);
const REFRESH_SECRET = requireSecret('JWT_REFRESH_SECRET', process.env.JWT_REFRESH_SECRET, ['change-me-refresh']);
const ACCESS_EXP     = process.env.JWT_ACCESS_EXPIRES_IN  ?? '15m';
const REFRESH_EXP    = process.env.JWT_REFRESH_EXPIRES_IN ?? '7d';

export const signAccessToken  = (payload: Omit<JwtPayload, 'iat' | 'exp'>): string =>
  jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_EXP, algorithm: 'HS256' });

export const signRefreshToken = (payload: Omit<JwtPayload, 'iat' | 'exp'>): string =>
  jwt.sign(payload, REFRESH_SECRET, { expiresIn: REFRESH_EXP, algorithm: 'HS256' });

export const verifyAccessToken = (token: string): JwtPayload =>
  jwt.verify(token, ACCESS_SECRET) as JwtPayload;

export const verifyRefreshToken = (token: string): JwtPayload =>
  jwt.verify(token, REFRESH_SECRET) as JwtPayload;
```

---

## Correcciones ALTAS (aplicar tras los críticos)

### A-01: Eliminar non-null assertion sobre `req.user` en tickets controller
**Archivo:** `backend/src/modules/tickets/tickets.controller.ts:103`

Localiza esta línea:
```typescript
req.user!.sub,
```

Reemplázala por una guarda explícita. En el handler `create`, antes de acceder a `req.user`, añade:
```typescript
if (!req.user) {
  res.status(401).json({ error: 'unauthorized', message: 'Authentication required' });
  return;
}
const ticket = await service.createTicket({ ... }, req.user.sub);
```

Aplica el mismo patrón en cualquier otro controlador que acceda a `req.user!` con non-null assertion.

---

### A-02: Proteger CORS contra `origin: undefined`
**Archivo:** `backend/src/app.ts:16`

Reemplaza:
```typescript
app.use(cors({ origin: process.env.CORS_ORIGIN, credentials: true }));
```

Por:
```typescript
const allowedOrigin = process.env.CORS_ORIGIN;
if (!allowedOrigin) throw new Error('CORS_ORIGIN env var must be defined');

app.use(cors({
  origin: allowedOrigin,
  credentials: true,
}));
```

La validación debe ocurrir durante el startup (antes de `app.listen`), no silenciosamente en runtime.

---

### A-03: Añadir validación del parámetro `state` en el flujo OAuth (CSRF)
**Archivos:** `frontend/src/pages/AuthCallbackPage.tsx` y `frontend/src/api/auth.ts`

**Paso 1 — Generar y almacenar el `state` al iniciar el login:**  
En `frontend/src/pages/LoginPage.tsx`, antes de redirigir al proveedor OAuth:
```typescript
const state = crypto.randomUUID();
sessionStorage.setItem('oauth_state', state);
// Añadir &state=<state> a la URL de autorización OAuth
```

**Paso 2 — Validar el `state` en el callback:**  
En `frontend/src/pages/AuthCallbackPage.tsx`, añadir:
```typescript
const code  = params.get('code');
const state = params.get('state');
const savedState = sessionStorage.getItem('oauth_state');
sessionStorage.removeItem('oauth_state');

if (!code || !state || state !== savedState) {
  navigate('/login', { replace: true });
  return;
}
```

**Paso 3 — El backend también debe validar el state** si el proveedor OAuth lo soporta. En `backend/src/lib/oauth.ts`, `exchangeCode` debe aceptar y validar el `state` contra el valor esperado de la sesión del servidor.

---

### A-04: Sanitizar el `filename` en el header `Content-Disposition`
**Archivo:** `backend/src/lib/csv.ts:7`

Reemplaza:
```typescript
res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
```

Por:
```typescript
// Eliminar caracteres de control, comillas y caracteres no ASCII del filename
const safeFilename = filename
  .replace(/[^\w\s.-]/g, '_')   // solo alfanuméricos, espacios, puntos y guiones
  .replace(/\s+/g, '_')
  .slice(0, 200);               // limitar longitud

res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
```

---

### A-05: Prevenir uso de secretos JWT por defecto en producción
**Archivo:** `backend/src/lib/jwt.ts` (incluido en la corrección C-03)

La validación ya está incluida en la implementación de C-03:
```typescript
function requireSecret(name: string, value: string | undefined, forbidden: string[]): string {
  if (!value || forbidden.includes(value)) {
    throw new Error(`${name} env var is missing or uses an insecure default value`);
  }
  return value;
}
```

Adicionalmente, actualiza `.env.example` para indicar claramente que los valores deben cambiarse:
```
# IMPORTANTE: Generar valores seguros con: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_ACCESS_SECRET=REEMPLAZAR_CON_SECRETO_ALEATORIO_64_BYTES
JWT_REFRESH_SECRET=REEMPLAZAR_CON_SECRETO_ALEATORIO_64_BYTES
```

Y añade `minijira.db` al `.gitignore` del backend si no está ya:
```
# backend/.gitignore
*.db
*.sqlite
```

---

## Correcciones MEDIAS (aplicar tras las altas)

### M-01: Añadir rate limiting a los endpoints de autenticación
**Archivo:** `backend/src/app.ts`

Instala la dependencia:
```bash
pnpm add express-rate-limit --filter backend
```

Añade el middleware antes de las rutas de auth:
```typescript
import rateLimit from 'express-rate-limit';

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutos
  max: 20,                    // máximo 20 intentos por ventana
  message: { error: 'too_many_requests', message: 'Too many attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/auth', authLimiter);
// Registrar las rutas después del limiter
app.use('/api', authRouter);
```

---

### M-02: Sanitizar mensajes de error en el error handler
**Archivo:** `backend/src/middlewares/errorHandler.ts:6`

Reemplaza:
```typescript
const message = status === 500 ? 'An unexpected error occurred' : String(err.message ?? err);
```

Por:
```typescript
const SAFE_MESSAGES: Record<string, string> = {
  invalid_input:     'The provided data is invalid',
  invalid_date_range:'The date range is invalid',
  not_found:         'Resource not found',
  conflict:          'A conflict occurred with the current state of the resource',
  forbidden:         'Insufficient permissions',
  unauthorized:      'Authentication required',
};

const message = SAFE_MESSAGES[error] ?? (status === 500
  ? 'An unexpected error occurred'
  : 'Request could not be processed');
```

Esto evita filtrar mensajes de Drizzle/SQLite. Los errores conocidos usan mensajes predefinidos; los desconocidos reciben un mensaje genérico.

---

### M-03: Añadir límite de longitud al campo `description`
**Archivo:** `backend/src/modules/tickets/tickets.controller.ts:70-72`

Localiza el bloque de validación de `description`:
```typescript
if (b.description !== undefined && b.description !== null && typeof b.description !== 'string') {
  return next(validationError('description must be a string or null'));
}
```

Añade inmediatamente después:
```typescript
if (typeof b.description === 'string' && b.description.length > 10_000) {
  return next(validationError('description must not exceed 10,000 characters'));
}
```

---

### M-04: Excluir la base de datos SQLite del repositorio
**Archivos:** `backend/.gitignore`, y eliminar del tracking de git

1. Asegúrate de que `backend/.gitignore` contiene:
   ```
   *.db
   *.sqlite
   minijira.db
   ```

2. Si el fichero ya está tracked por git, ejecutar:
   ```bash
   git rm --cached backend/minijira.db
   git commit -m "chore(security): remove SQLite DB from version control"
   ```

3. Si el repositorio es privado, considera rotar todos los datos sensibles que pudiesen estar en la base de datos (hashes de tokens, emails, etc.).

---

### M-05: Añadir headers de seguridad HTTP con Helmet
**Archivo:** `backend/src/app.ts`

Instala la dependencia:
```bash
pnpm add helmet --filter backend
```

Añade al inicio del archivo, antes de cualquier otro middleware:
```typescript
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc:  ["'self'"],
      styleSrc:   ["'self'", "'unsafe-inline'"],
      imgSrc:     ["'self'", 'data:'],
      connectSrc: ["'self'"],
      frameSrc:   ["'none'"],
    },
  },
  hsts: { maxAge: 31536000, includeSubDomains: true },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}));
```

---

## Correcciones BAJAS (aplicar al final)

### B-01: Configurar atributos de seguridad en las cookies de sesión
**Archivo:** `backend/src/modules/auth/auth.controller.ts` (cuando se implemente)

Cuando la función `callback` emita las cookies de acceso y refresco, usar siempre:
```typescript
const isProduction = process.env.NODE_ENV === 'production';

res.cookie('access_token', accessToken, {
  httpOnly: true,
  secure: isProduction,
  sameSite: 'strict',
  maxAge: 15 * 60 * 1000,  // 15 minutos en ms
  path: '/api',
});

res.cookie('refresh_token', refreshToken, {
  httpOnly: true,
  secure: isProduction,
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000,  // 7 días en ms
  path: '/api/auth/refresh',         // restringir path
});
```

---

### B-02: Corregir los stubs de controladores que llaman `next()` sin respuesta
**Archivos múltiples:** todos los controladores con el patrón `async (_req, _res, next) => next()`

Localiza todos los controladores que usan este patrón y reemplázalos por uno que devuelva un error `501 Not Implemented` mientras se desarrolla la implementación real:
```typescript
export const nombreHandler: RequestHandler = (_req, res, _next) => {
  res.status(501).json({ error: 'not_implemented', message: 'This endpoint is not yet available' });
};
```

Archivos afectados:
- `backend/src/modules/comments/comments.controller.ts` (list, create, archive)
- `backend/src/modules/auth/auth.controller.ts` (callback, refresh, logout, me)
- `backend/src/modules/users/users.controller.ts` (list)
- `backend/src/modules/metrics/metrics.controller.ts` (snapshot, exportCsv)
- `backend/src/modules/admin/admin.controller.ts` (createUser, updateUser, deactivateUser)
- `backend/src/modules/tickets/tickets.controller.ts` (getOne, update, archive)

---

### B-03: Usar ruta absoluta para `DATABASE_URL` y validar en startup
**Archivos:** `backend/drizzle.config.ts`, `backend/src/db/index.ts`

En el módulo que inicializa la conexión a la base de datos, añadir:
```typescript
import path from 'path';

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) throw new Error('DATABASE_URL env var must be defined');

// Si es una ruta relativa, resolverla desde la raíz del proyecto
const resolvedUrl = dbUrl.startsWith('.')
  ? path.resolve(process.cwd(), dbUrl)
  : dbUrl;
```

Documentar en `.env.example` que se prefiere una ruta absoluta en producción:
```
# Usar ruta absoluta en producción: /var/data/minijira.db
DATABASE_URL=./minijira.db
```

---

## Orden de ejecución recomendado

```
1. C-03 (implementar JWT)           → prerequisito de C-01 y C-02
2. C-01 (implementar authenticate)  → prerequisito de todos los endpoints
3. C-02 (implementar authorize)     → prerequisito de rutas admin
4. A-01 (eliminar req.user!)        → depende de C-01
5. A-05 (validar secretos JWT)      → incluido en C-03
6. M-04 (excluir DB del repo)       → independiente, hacerlo cuanto antes
7. A-02 (CORS origin)               → independiente
8. A-03 (OAuth state CSRF)          → independiente
9. A-04 (Content-Disposition)       → independiente
10. M-05 (Helmet)                   → independiente
11. M-01 (rate limiting)            → después de tener rutas estables
12. M-02 (error handler)            → después de conocer todos los error codes
13. M-03 (description length)       → trivial, cualquier momento
14. B-01 (cookie attributes)        → al implementar auth.controller
15. B-02 (stubs → 501)              → al implementar cada controlador
16. B-03 (DATABASE_URL absoluta)    → al preparar despliegue
```
