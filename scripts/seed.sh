#!/bin/bash
# =============================================================================
# scripts/seed.sh — MiniJira development seed
#
# Inserta: 3 usuarios, 5 labels (agrupadores de proyecto) y 5 tickets
# con status variado (todo, in_progress x2, review, done).
#
# NOTA: el schema Drizzle no tiene tabla `projects`. Los labels actúan
# como agrupadores temáticos equivalentes a proyectos (auth, kanban,
# api, metrics, devops).
#
# Detección de modo:
#   SUPABASE_DB_URL definida  →  psql (Supabase / PostgreSQL)
#   Sin SUPABASE_DB_URL       →  sqlite3  (default local)
#
# Uso:
#   ./scripts/seed.sh
#   ./scripts/seed.sh --dry-run
# =============================================================================
set -e

# ── Colores ───────────────────────────────────────────────────────────────────
RED=$'\033[0;31m'
GREEN=$'\033[0;32m'
YELLOW=$'\033[1;33m'
BLUE=$'\033[0;34m'
CYAN=$'\033[0;36m'
BOLD=$'\033[1m'
DIM=$'\033[2m'
RESET=$'\033[0m'

log_info()  { printf "${CYAN}${BOLD}[seed]${RESET}  %s\n" "$*"; }
log_ok()    { printf "${GREEN}${BOLD}  ✓${RESET}  %s\n" "$*"; }
log_warn()  { printf "${YELLOW}${BOLD}  ⚠${RESET}  %s\n" "$*"; }
log_step()  { printf "\n${BLUE}${BOLD}──▶${RESET} ${BOLD}%s${RESET}\n" "$*"; }
log_dry()   { printf "${YELLOW}${DIM}[dry-run]${RESET} %s\n" "$*"; }
log_err()   { printf "${RED}${BOLD}  ✗  %s${RESET}\n" "$*" >&2; }
log_sql()   { printf "${DIM}%s${RESET}\n" "$*"; }
log_hr()    { printf "${DIM}%s${RESET}\n" "─────────────────────────────────────────────────────"; }

# ── Argumentos ────────────────────────────────────────────────────────────────
DRY_RUN=false
for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=true ;;
    --help|-h) echo "Uso: $0 [--dry-run]"; exit 0 ;;
    *) log_err "Argumento desconocido: $arg"; echo "Uso: $0 [--dry-run]" >&2; exit 1 ;;
  esac
done

# ── Resolver rutas ────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"

# ── Cargar .env ───────────────────────────────────────────────────────────────
ENV_FILE="$BACKEND_DIR/.env"
[[ -f "$ENV_FILE" ]] || ENV_FILE="$BACKEND_DIR/.env.example"
if [[ -f "$ENV_FILE" ]]; then
  while IFS='=' read -r key value; do
    [[ -z "$key" || "$key" == \#* ]] && continue
    key="${key%%[[:space:]]*}"; value="${value%%[[:space:]]*}"
    value="${value#\"}"; value="${value%\"}"
    value="${value#\'}"; value="${value%\'}"
    [[ -z "${!key:-}" ]] && export "$key=$value"
  done < "$ENV_FILE"
fi

# ── Detección de modo ─────────────────────────────────────────────────────────
SUPABASE_DB_URL="${SUPABASE_DB_URL:-}"
DATABASE_URL="${DATABASE_URL:-./minijira.db}"

if [[ -n "$SUPABASE_DB_URL" ]]; then
  MODE="supabase"
else
  MODE="sqlite"
  [[ "$DATABASE_URL" != /* ]] && DATABASE_URL="$BACKEND_DIR/$DATABASE_URL"
fi

# ── Cabecera ──────────────────────────────────────────────────────────────────
echo ""
printf "${BOLD}╔════════════════════════════════════════════╗${RESET}\n"
printf "${BOLD}║        MiniJira — Seed  (3u · 5l · 5t)     ║${RESET}\n"
printf "${BOLD}╚════════════════════════════════════════════╝${RESET}\n\n"
log_info "Modo    : ${BOLD}$MODE${RESET}"
[[ "$MODE" == "sqlite" ]] && log_info "Archivo : ${BOLD}$DATABASE_URL${RESET}"
[[ "$MODE" == "supabase" ]] && log_info "Host    : ${BOLD}${SUPABASE_DB_URL%%@*}@...${RESET}"
$DRY_RUN && log_warn "DRY-RUN — no se modificará la base de datos"

# ── Verificar dependencias ────────────────────────────────────────────────────
log_step "Verificando dependencias"
if [[ "$MODE" == "sqlite" ]]; then
  if ! command -v sqlite3 &>/dev/null; then
    if $DRY_RUN; then
      log_warn "sqlite3 no instalado — dry-run continúa igualmente"
    else
      log_err "sqlite3 no encontrado. Instálalo con:"
      printf "  macOS  → brew install sqlite\n"
      printf "  Ubuntu → apt-get install sqlite3\n"
      exit 1
    fi
  else
    log_ok "sqlite3 $(sqlite3 --version | cut -d' ' -f1)"
  fi
  if ! $DRY_RUN; then
    [[ -f "$DATABASE_URL" ]] || {
      log_err "BD no encontrada: $DATABASE_URL"
      log_err "Ejecuta primero: ./scripts/setup-dev.sh"
      exit 1
    }
    log_ok "Archivo BD encontrado"
  fi
else
  if ! command -v psql &>/dev/null; then
    $DRY_RUN && log_warn "psql no instalado — dry-run continúa" || { log_err "psql requerido para modo Supabase"; exit 1; }
  else
    log_ok "psql $(psql --version | awk '{print $3}')"
  fi
fi

# ── Función de ejecución ──────────────────────────────────────────────────────
run_sql() {
  local desc="$1"
  local sql="$2"
  log_step "$desc"
  if $DRY_RUN; then
    log_hr; log_sql "$sql"; log_hr
    log_dry "$desc → omitido"
    return
  fi
  if [[ "$MODE" == "sqlite" ]]; then
    printf '%s\n' "$sql" | sqlite3 "$DATABASE_URL"
  else
    printf '%s\n' "$sql" | psql "$SUPABASE_DB_URL" --no-password --set ON_ERROR_STOP=1 --quiet
  fi
  log_ok "$desc"
}

# =============================================================================
# SQL — SQLite  (boolean = INTEGER 0/1)
# =============================================================================
if [[ "$MODE" == "sqlite" ]]; then

# ── Truncar en orden inverso a FK ─────────────────────────────────────────────
SQL_TRUNCATE='PRAGMA foreign_keys = OFF;
DELETE FROM notification_queue;
DELETE FROM comments;
DELETE FROM ticket_labels;
DELETE FROM ticket_assignees;
DELETE FROM refresh_tokens;
DELETE FROM tickets;
DELETE FROM labels;
DELETE FROM users;
PRAGMA foreign_keys = ON;'

# ── 3 Usuarios ────────────────────────────────────────────────────────────────
SQL_USERS="INSERT INTO users (id, name, email, role, is_active, created_at, updated_at) VALUES
  ('a1000000-0000-0000-0000-000000000001', 'Laura García',     'laura.garcia@empresa.com',   'admin',  1, '2026-04-01T09:00:00Z', '2026-04-01T09:00:00Z'),
  ('a1000000-0000-0000-0000-000000000002', 'Marcos Rodríguez', 'marcos.rodriguez@empresa.com','member', 1, '2026-04-01T09:05:00Z', '2026-04-01T09:05:00Z'),
  ('a1000000-0000-0000-0000-000000000003', 'Sofía Martínez',   'sofia.martinez@empresa.com', 'member', 1, '2026-04-01T09:10:00Z', '2026-04-01T09:10:00Z');"

# ── 5 Labels (agrupadores de proyecto) ───────────────────────────────────────
# label = "proyecto". No existe tabla projects en schema.ts.
SQL_LABELS="INSERT INTO labels (id, name, color, created_at, updated_at) VALUES
  ('11000000-0000-0000-0000-000000000001', 'auth',     '#6366f1', '2026-04-01T09:15:00Z', '2026-04-01T09:15:00Z'),
  ('11000000-0000-0000-0000-000000000002', 'kanban',   '#0ea5e9', '2026-04-01T09:15:00Z', '2026-04-01T09:15:00Z'),
  ('11000000-0000-0000-0000-000000000003', 'api',      '#8b5cf6', '2026-04-01T09:15:00Z', '2026-04-01T09:15:00Z'),
  ('11000000-0000-0000-0000-000000000004', 'metrics',  '#10b981', '2026-04-01T09:15:00Z', '2026-04-01T09:15:00Z'),
  ('11000000-0000-0000-0000-000000000005', 'devops',   '#f59e0b', '2026-04-01T09:15:00Z', '2026-04-01T09:15:00Z');"

# ── 5 Tickets con status variado ──────────────────────────────────────────────
SQL_TICKETS="INSERT INTO tickets
  (id, title, description, status, priority, is_blocked, version, created_by, archived_at, created_at, updated_at)
VALUES
  ('b2000000-0000-0000-0000-000000000001',
   'Configurar autenticación OAuth 2.0',
   'Integrar Google Workspace. Registrar la app, configurar redirect URIs y validar el flujo Authorization Code con JWT de acceso y refresco.',
   'todo', 'high', 0, 1,
   'a1000000-0000-0000-0000-000000000001',
   NULL, '2026-04-10T10:00:00Z', '2026-04-10T10:00:00Z'),

  ('b2000000-0000-0000-0000-000000000002',
   'Implementar tablero Kanban con drag-and-drop',
   'Crear las 4 columnas con tarjetas arrastrables usando @hello-pangea/dnd. El badge Bloqueado coexiste en cualquier columna.',
   'in_progress', 'high', 0, 3,
   'a1000000-0000-0000-0000-000000000002',
   NULL, '2026-04-11T08:30:00Z', '2026-04-14T16:00:00Z'),

  ('b2000000-0000-0000-0000-000000000003',
   'Crear endpoint PATCH /api/tickets/:id',
   'Validación de version para Optimistic Locking. Devolver 409 si la versión del cliente no coincide con la BD.',
   'in_progress', 'high', 1, 2,
   'a1000000-0000-0000-0000-000000000002',
   NULL, '2026-04-12T09:00:00Z', '2026-04-15T11:30:00Z'),

  ('b2000000-0000-0000-0000-000000000004',
   'Diseñar dashboard de métricas',
   'Mostrar: tickets cerrados por mes, por estado y por miembro. Sin tabla de hechos separada.',
   'review', 'medium', 0, 4,
   'a1000000-0000-0000-0000-000000000003',
   NULL, '2026-04-13T10:15:00Z', '2026-04-17T09:45:00Z'),

  ('b2000000-0000-0000-0000-000000000005',
   'Exportación de métricas a CSV',
   'GET /api/metrics/export con streaming fila a fila. Soportar filtros: rango de fechas, estado y asignado. Cumplir RFC 4180.',
   'done', 'medium', 0, 5,
   'a1000000-0000-0000-0000-000000000001',
   NULL, '2026-04-14T11:00:00Z', '2026-04-18T17:00:00Z');"

# ── Ticket assignees ──────────────────────────────────────────────────────────
SQL_ASSIGNEES="INSERT INTO ticket_assignees (ticket_id, user_id) VALUES
  ('b2000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000002'),
  ('b2000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000002'),
  ('b2000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000003'),
  ('b2000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000002'),
  ('b2000000-0000-0000-0000-000000000004', 'a1000000-0000-0000-0000-000000000003'),
  ('b2000000-0000-0000-0000-000000000005', 'a1000000-0000-0000-0000-000000000003');"

# ── Ticket labels ─────────────────────────────────────────────────────────────
SQL_TICKET_LABELS="INSERT INTO ticket_labels (ticket_id, label_id) VALUES
  ('b2000000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000001'),
  ('b2000000-0000-0000-0000-000000000002', '11000000-0000-0000-0000-000000000002'),
  ('b2000000-0000-0000-0000-000000000003', '11000000-0000-0000-0000-000000000003'),
  ('b2000000-0000-0000-0000-000000000004', '11000000-0000-0000-0000-000000000004'),
  ('b2000000-0000-0000-0000-000000000005', '11000000-0000-0000-0000-000000000004'),
  ('b2000000-0000-0000-0000-000000000005', '11000000-0000-0000-0000-000000000005');"

# ── Comentarios ───────────────────────────────────────────────────────────────
SQL_COMMENTS="INSERT INTO comments (id, ticket_id, author_id, body, archived_at, created_at) VALUES
  ('c3000000-0000-0000-0000-000000000001',
   'b2000000-0000-0000-0000-000000000002',
   'a1000000-0000-0000-0000-000000000001',
   'Revisé el prototipo. Las 4 columnas se ven bien. Confirmar comportamiento del badge Bloqueado en modo oscuro.',
   NULL, '2026-04-15T10:00:00Z'),

  ('c3000000-0000-0000-0000-000000000002',
   'b2000000-0000-0000-0000-000000000003',
   'a1000000-0000-0000-0000-000000000002',
   'Bloqueado hasta que @laura.garcia confirme la matriz de permisos para tickets ajenos.',
   NULL, '2026-04-15T11:00:00Z'),

  ('c3000000-0000-0000-0000-000000000003',
   'b2000000-0000-0000-0000-000000000005',
   'a1000000-0000-0000-0000-000000000001',
   'Export validado contra RFC 4180. Campos con comas y saltos de línea correctamente entre comillas.',
   NULL, '2026-04-18T16:45:00Z');"

# =============================================================================
# SQL — Supabase / PostgreSQL  (boolean = TRUE/FALSE, TRUNCATE CASCADE)
# =============================================================================
else

SQL_TRUNCATE='TRUNCATE TABLE notification_queue, comments, ticket_labels,
  ticket_assignees, refresh_tokens, tickets, labels, users CASCADE;'

SQL_USERS="INSERT INTO users (id, name, email, role, is_active, created_at, updated_at) VALUES
  ('a1000000-0000-0000-0000-000000000001', 'Laura García',     'laura.garcia@empresa.com',    'admin',  true, '2026-04-01T09:00:00Z', '2026-04-01T09:00:00Z'),
  ('a1000000-0000-0000-0000-000000000002', 'Marcos Rodríguez', 'marcos.rodriguez@empresa.com','member', true, '2026-04-01T09:05:00Z', '2026-04-01T09:05:00Z'),
  ('a1000000-0000-0000-0000-000000000003', 'Sofía Martínez',   'sofia.martinez@empresa.com',  'member', true, '2026-04-01T09:10:00Z', '2026-04-01T09:10:00Z');"

SQL_LABELS="INSERT INTO labels (id, name, color, created_at, updated_at) VALUES
  ('11000000-0000-0000-0000-000000000001', 'auth',    '#6366f1', '2026-04-01T09:15:00Z', '2026-04-01T09:15:00Z'),
  ('11000000-0000-0000-0000-000000000002', 'kanban',  '#0ea5e9', '2026-04-01T09:15:00Z', '2026-04-01T09:15:00Z'),
  ('11000000-0000-0000-0000-000000000003', 'api',     '#8b5cf6', '2026-04-01T09:15:00Z', '2026-04-01T09:15:00Z'),
  ('11000000-0000-0000-0000-000000000004', 'metrics', '#10b981', '2026-04-01T09:15:00Z', '2026-04-01T09:15:00Z'),
  ('11000000-0000-0000-0000-000000000005', 'devops',  '#f59e0b', '2026-04-01T09:15:00Z', '2026-04-01T09:15:00Z');"

SQL_TICKETS="INSERT INTO tickets
  (id, title, description, status, priority, is_blocked, version, created_by, archived_at, created_at, updated_at)
VALUES
  ('b2000000-0000-0000-0000-000000000001',
   'Configurar autenticación OAuth 2.0',
   'Integrar Google Workspace. Registrar la app, configurar redirect URIs y validar el flujo Authorization Code con JWT de acceso y refresco.',
   'todo', 'high', false, 1,
   'a1000000-0000-0000-0000-000000000001',
   NULL, '2026-04-10T10:00:00Z', '2026-04-10T10:00:00Z'),
  ('b2000000-0000-0000-0000-000000000002',
   'Implementar tablero Kanban con drag-and-drop',
   'Crear las 4 columnas con tarjetas arrastrables usando @hello-pangea/dnd.',
   'in_progress', 'high', false, 3,
   'a1000000-0000-0000-0000-000000000002',
   NULL, '2026-04-11T08:30:00Z', '2026-04-14T16:00:00Z'),
  ('b2000000-0000-0000-0000-000000000003',
   'Crear endpoint PATCH /api/tickets/:id',
   'Validación de version para Optimistic Locking. Devolver 409 si la versión no coincide.',
   'in_progress', 'high', true, 2,
   'a1000000-0000-0000-0000-000000000002',
   NULL, '2026-04-12T09:00:00Z', '2026-04-15T11:30:00Z'),
  ('b2000000-0000-0000-0000-000000000004',
   'Diseñar dashboard de métricas',
   'Tickets cerrados por mes, por estado y por miembro. Sin tabla de hechos separada.',
   'review', 'medium', false, 4,
   'a1000000-0000-0000-0000-000000000003',
   NULL, '2026-04-13T10:15:00Z', '2026-04-17T09:45:00Z'),
  ('b2000000-0000-0000-0000-000000000005',
   'Exportación de métricas a CSV',
   'GET /api/metrics/export con streaming. Filtros: rango de fechas, estado y asignado. RFC 4180.',
   'done', 'medium', false, 5,
   'a1000000-0000-0000-0000-000000000001',
   NULL, '2026-04-14T11:00:00Z', '2026-04-18T17:00:00Z');"

SQL_ASSIGNEES="INSERT INTO ticket_assignees (ticket_id, user_id) VALUES
  ('b2000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000002'),
  ('b2000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000002'),
  ('b2000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000003'),
  ('b2000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000002'),
  ('b2000000-0000-0000-0000-000000000004', 'a1000000-0000-0000-0000-000000000003'),
  ('b2000000-0000-0000-0000-000000000005', 'a1000000-0000-0000-0000-000000000003');"

SQL_TICKET_LABELS="INSERT INTO ticket_labels (ticket_id, label_id) VALUES
  ('b2000000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000001'),
  ('b2000000-0000-0000-0000-000000000002', '11000000-0000-0000-0000-000000000002'),
  ('b2000000-0000-0000-0000-000000000003', '11000000-0000-0000-0000-000000000003'),
  ('b2000000-0000-0000-0000-000000000004', '11000000-0000-0000-0000-000000000004'),
  ('b2000000-0000-0000-0000-000000000005', '11000000-0000-0000-0000-000000000004'),
  ('b2000000-0000-0000-0000-000000000005', '11000000-0000-0000-0000-000000000005');"

SQL_COMMENTS="INSERT INTO comments (id, ticket_id, author_id, body, archived_at, created_at) VALUES
  ('c3000000-0000-0000-0000-000000000001',
   'b2000000-0000-0000-0000-000000000002',
   'a1000000-0000-0000-0000-000000000001',
   'Revisé el prototipo. Las 4 columnas se ven bien. Confirmar badge Bloqueado en modo oscuro.',
   NULL, '2026-04-15T10:00:00Z'),
  ('c3000000-0000-0000-0000-000000000002',
   'b2000000-0000-0000-0000-000000000003',
   'a1000000-0000-0000-0000-000000000002',
   'Bloqueado hasta que @laura.garcia confirme la matriz de permisos para tickets ajenos.',
   NULL, '2026-04-15T11:00:00Z'),
  ('c3000000-0000-0000-0000-000000000003',
   'b2000000-0000-0000-0000-000000000005',
   'a1000000-0000-0000-0000-000000000001',
   'Export validado contra RFC 4180. Campos con comas y saltos de línea correctamente entre comillas.',
   NULL, '2026-04-18T16:45:00Z');"

fi  # end MODE branching

# =============================================================================
# Ejecución
# =============================================================================
log_info "Iniciando seed..."

run_sql "Truncar tablas (orden FK inverso)"      "$SQL_TRUNCATE"
run_sql "Insertar 3 usuarios"                    "$SQL_USERS"
run_sql "Insertar 5 labels (agrupadores)"        "$SQL_LABELS"
run_sql "Insertar 5 tickets (status variado)"    "$SQL_TICKETS"
run_sql "Insertar asignados (6 filas)"           "$SQL_ASSIGNEES"
run_sql "Insertar ticket_labels (6 filas)"       "$SQL_TICKET_LABELS"
run_sql "Insertar 3 comentarios"                 "$SQL_COMMENTS"

# =============================================================================
# Resumen
# =============================================================================
echo ""
if $DRY_RUN; then
  printf "${YELLOW}${BOLD}╔════════════════════════════════════════════╗${RESET}\n"
  printf "${YELLOW}${BOLD}║    DRY-RUN completado — 0 cambios reales   ║${RESET}\n"
  printf "${YELLOW}${BOLD}╚════════════════════════════════════════════╝${RESET}\n"
else
  printf "${GREEN}${BOLD}╔════════════════════════════════════════════╗${RESET}\n"
  printf "${GREEN}${BOLD}║          Seed completado con éxito          ║${RESET}\n"
  printf "${GREEN}${BOLD}╚════════════════════════════════════════════╝${RESET}\n\n"
  log_info "Filas insertadas:"
  printf "  ${DIM}%-22s${RESET} %s\n" "users"           "3  (1 admin · 2 members)"
  printf "  ${DIM}%-22s${RESET} %s\n" "labels"          "5  (auth · kanban · api · metrics · devops)"
  printf "  ${DIM}%-22s${RESET} %s\n" "tickets"         "5  (todo · in_progress×2 · review · done)"
  printf "  ${DIM}%-22s${RESET} %s\n" "ticket_assignees""6"
  printf "  ${DIM}%-22s${RESET} %s\n" "ticket_labels"   "6"
  printf "  ${DIM}%-22s${RESET} %s\n" "comments"        "3"
fi
echo ""
