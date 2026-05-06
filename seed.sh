#!/usr/bin/env bash
# =============================================================================
# seed.sh — MiniJira development seed
#
# Uso:
#   ./seed.sh             → ejecuta el seed
#   ./seed.sh --dry-run   → imprime el SQL sin ejecutar nada
#
# Modos de ejecución (detección automática):
#   1. Supabase  →  SUPABASE_DB_URL presente en el entorno
#   2. SQLite    →  DATABASE_URL (default: ./minijira.db)
# =============================================================================
set -euo pipefail
IFS=$'\n\t'

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
    --help|-h)
      echo "Uso: $0 [--dry-run]"
      echo "  --dry-run   Muestra el SQL generado sin ejecutar nada"
      exit 0
      ;;
    *)
      log_err "Argumento desconocido: $arg"
      echo "Uso: $0 [--dry-run]" >&2
      exit 1
      ;;
  esac
done

# ── Cargar .env ───────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/backend"

ENV_FILE="$BACKEND_DIR/.env"
if [[ ! -f "$ENV_FILE" ]]; then
  ENV_FILE="$BACKEND_DIR/.env.example"
fi

if [[ -f "$ENV_FILE" ]]; then
  # Exporta variables sin sobrescribir las del entorno actual
  while IFS='=' read -r key value; do
    [[ -z "$key" || "$key" == \#* ]] && continue
    key="${key%%[[:space:]]*}"
    value="${value%%[[:space:]]*}"
    value="${value#\"}"
    value="${value%\"}"
    value="${value#\'}"
    value="${value%\'}"
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
  # Resolver ruta relativa desde backend/
  if [[ "$DATABASE_URL" != /* && "$DATABASE_URL" != :* ]]; then
    DATABASE_URL="$BACKEND_DIR/$DATABASE_URL"
  fi
fi

# ── Cabecera ──────────────────────────────────────────────────────────────────
echo ""
printf "${BOLD}╔══════════════════════════════════════════╗${RESET}\n"
printf "${BOLD}║       MiniJira — Seed Script  v1.0       ║${RESET}\n"
printf "${BOLD}╚══════════════════════════════════════════╝${RESET}\n"
echo ""

if [[ "$MODE" == "supabase" ]]; then
  log_info "Modo   : ${BOLD}Supabase (psql)${RESET}"
  log_info "DB     : ${BOLD}${SUPABASE_DB_URL%%@*}@...${RESET}"
else
  log_info "Modo   : ${BOLD}SQLite${RESET}"
  log_info "Archivo: ${BOLD}$DATABASE_URL${RESET}"
fi

$DRY_RUN && log_warn "DRY-RUN activo — no se modificará la base de datos"
echo ""

# ── Verificar dependencias ────────────────────────────────────────────────────
log_step "Verificando dependencias"

if [[ "$MODE" == "sqlite" ]]; then
  if ! command -v sqlite3 &>/dev/null; then
    if $DRY_RUN; then
      log_warn "sqlite3 no instalado — dry-run continúa de todas formas"
    else
      log_err "sqlite3 no encontrado. Instálalo con:"
      echo "  macOS  → brew install sqlite"
      echo "  Ubuntu → apt-get install sqlite3"
      echo "  Arch   → pacman -S sqlite"
      exit 1
    fi
  else
    SQLITE_VER="$(sqlite3 --version | cut -d' ' -f1)"
    log_ok "sqlite3 $SQLITE_VER"
  fi

  if ! $DRY_RUN; then
    [[ -f "$DATABASE_URL" ]] || {
      log_err "Base de datos no encontrada: $DATABASE_URL"
      log_err "Ejecuta primero: cd backend && npm run db:migrate"
      exit 1
    }
    log_ok "Archivo DB encontrado"
  fi
else
  if ! command -v psql &>/dev/null; then
    if $DRY_RUN; then
      log_warn "psql no instalado — dry-run continúa de todas formas"
    else
      log_err "psql no encontrado. Instala PostgreSQL client tools."
      exit 1
    fi
  else
    log_ok "psql $(psql --version | awk '{print $3}')"
  fi
fi

# ── Función de ejecución ──────────────────────────────────────────────────────
# $1 = descripción  $2 = SQL
run_sql() {
  local desc="$1"
  local sql="$2"

  log_step "$desc"

  if $DRY_RUN; then
    log_hr
    log_sql "$sql"
    log_hr
    log_dry "$desc → omitido"
    return
  fi

  if [[ "$MODE" == "sqlite" ]]; then
    echo "$sql" | sqlite3 "$DATABASE_URL"
  else
    echo "$sql" | psql "$SUPABASE_DB_URL" \
      --no-password \
      --set ON_ERROR_STOP=1 \
      --quiet
  fi

  log_ok "$desc"
}

# =============================================================================
# SQL — SQLite
# =============================================================================
if [[ "$MODE" == "sqlite" ]]; then

# ── 1. Truncar (orden inverso a FK) ──────────────────────────────────────────
SQL_TRUNCATE=$(cat <<'SQL'
PRAGMA foreign_keys = OFF;
DELETE FROM notification_queue;
DELETE FROM comments;
DELETE FROM ticket_labels;
DELETE FROM ticket_assignees;
DELETE FROM refresh_tokens;
DELETE FROM tickets;
DELETE FROM labels;
DELETE FROM users;
PRAGMA foreign_keys = ON;
SQL
)

# ── 2. Usuarios ───────────────────────────────────────────────────────────────
SQL_USERS=$(cat <<'SQL'
INSERT INTO users (id, name, email, role, is_active, created_at, updated_at) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Alice García',  'alice@minijira.dev',  'admin',  1, '2024-01-10T09:00:00Z', '2024-01-10T09:00:00Z'),
  ('00000000-0000-0000-0000-000000000002', 'Bob Martínez',  'bob@minijira.dev',    'member', 1, '2024-01-10T09:05:00Z', '2024-01-10T09:05:00Z'),
  ('00000000-0000-0000-0000-000000000003', 'Carlos López',  'carlos@minijira.dev', 'member', 1, '2024-01-10T09:10:00Z', '2024-01-10T09:10:00Z'),
  ('00000000-0000-0000-0000-000000000004', 'Diana Ruiz',    'diana@minijira.dev',  'member', 1, '2024-01-10T09:15:00Z', '2024-01-10T09:15:00Z');
SQL
)

# ── 3. Etiquetas ──────────────────────────────────────────────────────────────
SQL_LABELS=$(cat <<'SQL'
INSERT INTO labels (id, name, color, created_at, updated_at) VALUES
  ('11111111-0000-0000-0000-000000000001', 'bug',         '#ef4444', '2024-01-10T09:20:00Z', '2024-01-10T09:20:00Z'),
  ('11111111-0000-0000-0000-000000000002', 'feature',     '#3b82f6', '2024-01-10T09:20:00Z', '2024-01-10T09:20:00Z'),
  ('11111111-0000-0000-0000-000000000003', 'enhancement', '#22c55e', '2024-01-10T09:20:00Z', '2024-01-10T09:20:00Z'),
  ('11111111-0000-0000-0000-000000000004', 'docs',        '#eab308', '2024-01-10T09:20:00Z', '2024-01-10T09:20:00Z'),
  ('11111111-0000-0000-0000-000000000005', 'urgent',      '#f97316', '2024-01-10T09:20:00Z', '2024-01-10T09:20:00Z');
SQL
)

# ── 4. Tickets ────────────────────────────────────────────────────────────────
SQL_TICKETS=$(cat <<'SQL'
INSERT INTO tickets
  (id, title, description, status, priority, is_blocked, version, created_by, archived_at, created_at, updated_at)
VALUES
  -- TODO
  ('22222222-0000-0000-0000-000000000001',
   'Configurar pipeline de CI/CD',
   'Integrar GitHub Actions para ejecutar tests y build en cada PR.',
   'todo', 'high', 0, 1,
   '00000000-0000-0000-0000-000000000001',
   NULL, '2024-01-15T10:00:00Z', '2024-01-15T10:00:00Z'),

  ('22222222-0000-0000-0000-000000000002',
   'Redactar guía de contribución',
   'Documentar convenciones de ramas, commits y proceso de revisión.',
   'todo', 'low', 0, 1,
   '00000000-0000-0000-0000-000000000002',
   NULL, '2024-01-16T11:00:00Z', '2024-01-16T11:00:00Z'),

  -- IN PROGRESS
  ('22222222-0000-0000-0000-000000000003',
   'Implementar endpoint PATCH /tickets/:id',
   'Actualizar status, prioridad, asignados y etiquetas con optimistic locking.',
   'in_progress', 'high', 0, 2,
   '00000000-0000-0000-0000-000000000001',
   NULL, '2024-01-17T08:00:00Z', '2024-01-20T14:30:00Z'),

  ('22222222-0000-0000-0000-000000000004',
   'Tablero Kanban — drag and drop',
   'Mover tarjetas entre columnas con @hello-pangea/dnd.',
   'in_progress', 'medium', 1, 1,
   '00000000-0000-0000-0000-000000000003',
   NULL, '2024-01-18T09:00:00Z', '2024-01-21T10:00:00Z'),

  -- REVIEW
  ('22222222-0000-0000-0000-000000000005',
   'Dashboard de métricas — gráfico por mes',
   'Tickets cerrados por mes en los últimos 6 meses.',
   'review', 'medium', 0, 3,
   '00000000-0000-0000-0000-000000000002',
   NULL, '2024-01-12T12:00:00Z', '2024-01-22T09:00:00Z'),

  ('22222222-0000-0000-0000-000000000006',
   'Exportar métricas a CSV',
   'Botón de descarga directa con filtros activos aplicados.',
   'review', 'low', 0, 2,
   '00000000-0000-0000-0000-000000000004',
   NULL, '2024-01-13T15:00:00Z', '2024-01-23T11:00:00Z'),

  -- DONE
  ('22222222-0000-0000-0000-000000000007',
   'Schema Drizzle y migraciones iniciales',
   'Definir todas las tablas, índices y constraints del proyecto.',
   'done', 'high', 0, 1,
   '00000000-0000-0000-0000-000000000001',
   NULL, '2024-01-08T08:00:00Z', '2024-01-09T17:00:00Z'),

  ('22222222-0000-0000-0000-000000000008',
   'Login con OAuth — flujo completo',
   'Callback, generación de refresh token y cookie httpOnly.',
   'done', 'high', 0, 1,
   '00000000-0000-0000-0000-000000000001',
   NULL, '2024-01-09T08:00:00Z', '2024-01-11T16:00:00Z');
SQL
)

# ── 5. Asignados ──────────────────────────────────────────────────────────────
SQL_ASSIGNEES=$(cat <<'SQL'
INSERT INTO ticket_assignees (ticket_id, user_id) VALUES
  ('22222222-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002'),
  ('22222222-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003'),
  ('22222222-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000002'),
  ('22222222-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000003'),
  ('22222222-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000004'),
  ('22222222-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000004'),
  ('22222222-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000001'),
  ('22222222-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000001');
SQL
)

# ── 6. Etiquetas de tickets ───────────────────────────────────────────────────
SQL_TICKET_LABELS=$(cat <<'SQL'
INSERT INTO ticket_labels (ticket_id, label_id) VALUES
  ('22222222-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000002'),
  ('22222222-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000004'),
  ('22222222-0000-0000-0000-000000000003', '11111111-0000-0000-0000-000000000002'),
  ('22222222-0000-0000-0000-000000000003', '11111111-0000-0000-0000-000000000005'),
  ('22222222-0000-0000-0000-000000000004', '11111111-0000-0000-0000-000000000003'),
  ('22222222-0000-0000-0000-000000000005', '11111111-0000-0000-0000-000000000002'),
  ('22222222-0000-0000-0000-000000000006', '11111111-0000-0000-0000-000000000003'),
  ('22222222-0000-0000-0000-000000000007', '11111111-0000-0000-0000-000000000002'),
  ('22222222-0000-0000-0000-000000000008', '11111111-0000-0000-0000-000000000002');
SQL
)

# ── 7. Comentarios ────────────────────────────────────────────────────────────
SQL_COMMENTS=$(cat <<'SQL'
INSERT INTO comments (id, ticket_id, author_id, body, archived_at, created_at) VALUES
  ('33333333-0000-0000-0000-000000000001',
   '22222222-0000-0000-0000-000000000003',
   '00000000-0000-0000-0000-000000000002',
   'Empecé la implementación. El campo `version` necesita validarse antes del UPDATE.',
   NULL, '2024-01-20T14:00:00Z'),

  ('33333333-0000-0000-0000-000000000002',
   '22222222-0000-0000-0000-000000000003',
   '00000000-0000-0000-0000-000000000001',
   'Exacto, devuelve 409 si el `version` del body no coincide con el de la DB.',
   NULL, '2024-01-20T14:45:00Z'),

  ('33333333-0000-0000-0000-000000000003',
   '22222222-0000-0000-0000-000000000004',
   '00000000-0000-0000-0000-000000000003',
   'DnD funcionando. Queda sincronizar el status con el nombre de la columna.',
   NULL, '2024-01-21T10:30:00Z'),

  ('33333333-0000-0000-0000-000000000004',
   '22222222-0000-0000-0000-000000000005',
   '00000000-0000-0000-0000-000000000004',
   'Revisé la query de métricas. El GROUP BY por mes funciona bien con strftime.',
   NULL, '2024-01-22T09:30:00Z'),

  ('33333333-0000-0000-0000-000000000005',
   '22222222-0000-0000-0000-000000000005',
   '00000000-0000-0000-0000-000000000002',
   'Falta el filtro por `assignee_id` en el endpoint /metrics. @diana ¿lo agregas?',
   NULL, '2024-01-22T11:00:00Z');
SQL
)

# ── 8. Cola de notificaciones ─────────────────────────────────────────────────
SQL_NOTIFICATIONS=$(cat <<'SQL'
INSERT INTO notification_queue
  (id, recipient_id, comment_id, ticket_id, event_type, status, attempts, max_attempts, next_attempt_at, last_error, created_at, updated_at)
VALUES
  ('44444444-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000001',
   '33333333-0000-0000-0000-000000000001',
   '22222222-0000-0000-0000-000000000003',
   'comment_added', 'pending', 0, 3,
   '2024-01-20T14:01:00Z', NULL,
   '2024-01-20T14:00:00Z', '2024-01-20T14:00:00Z'),

  ('44444444-0000-0000-0000-000000000002',
   '00000000-0000-0000-0000-000000000004',
   '33333333-0000-0000-0000-000000000005',
   '22222222-0000-0000-0000-000000000005',
   'mention', 'pending', 0, 3,
   '2024-01-22T11:01:00Z', NULL,
   '2024-01-22T11:00:00Z', '2024-01-22T11:00:00Z'),

  ('44444444-0000-0000-0000-000000000003',
   '00000000-0000-0000-0000-000000000003',
   '33333333-0000-0000-0000-000000000003',
   '22222222-0000-0000-0000-000000000004',
   'ticket_assigned', 'sent', 1, 3,
   '2024-01-21T10:31:00Z', NULL,
   '2024-01-21T10:30:00Z', '2024-01-21T10:32:00Z');
SQL
)

# =============================================================================
# SQL — Supabase / PostgreSQL
# =============================================================================
else

SQL_TRUNCATE=$(cat <<'SQL'
TRUNCATE TABLE
  notification_queue,
  comments,
  ticket_labels,
  ticket_assignees,
  refresh_tokens,
  tickets,
  labels,
  users
CASCADE;
SQL
)

SQL_USERS=$(cat <<'SQL'
INSERT INTO users (id, name, email, role, is_active, created_at, updated_at) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Alice García',  'alice@minijira.dev',  'admin',  true, '2024-01-10T09:00:00Z', '2024-01-10T09:00:00Z'),
  ('00000000-0000-0000-0000-000000000002', 'Bob Martínez',  'bob@minijira.dev',    'member', true, '2024-01-10T09:05:00Z', '2024-01-10T09:05:00Z'),
  ('00000000-0000-0000-0000-000000000003', 'Carlos López',  'carlos@minijira.dev', 'member', true, '2024-01-10T09:10:00Z', '2024-01-10T09:10:00Z'),
  ('00000000-0000-0000-0000-000000000004', 'Diana Ruiz',    'diana@minijira.dev',  'member', true, '2024-01-10T09:15:00Z', '2024-01-10T09:15:00Z');
SQL
)

SQL_LABELS=$(cat <<'SQL'
INSERT INTO labels (id, name, color, created_at, updated_at) VALUES
  ('11111111-0000-0000-0000-000000000001', 'bug',         '#ef4444', '2024-01-10T09:20:00Z', '2024-01-10T09:20:00Z'),
  ('11111111-0000-0000-0000-000000000002', 'feature',     '#3b82f6', '2024-01-10T09:20:00Z', '2024-01-10T09:20:00Z'),
  ('11111111-0000-0000-0000-000000000003', 'enhancement', '#22c55e', '2024-01-10T09:20:00Z', '2024-01-10T09:20:00Z'),
  ('11111111-0000-0000-0000-000000000004', 'docs',        '#eab308', '2024-01-10T09:20:00Z', '2024-01-10T09:20:00Z'),
  ('11111111-0000-0000-0000-000000000005', 'urgent',      '#f97316', '2024-01-10T09:20:00Z', '2024-01-10T09:20:00Z');
SQL
)

SQL_TICKETS=$(cat <<'SQL'
INSERT INTO tickets
  (id, title, description, status, priority, is_blocked, version, created_by, archived_at, created_at, updated_at)
VALUES
  ('22222222-0000-0000-0000-000000000001',
   'Configurar pipeline de CI/CD',
   'Integrar GitHub Actions para ejecutar tests y build en cada PR.',
   'todo', 'high', false, 1,
   '00000000-0000-0000-0000-000000000001',
   NULL, '2024-01-15T10:00:00Z', '2024-01-15T10:00:00Z'),

  ('22222222-0000-0000-0000-000000000002',
   'Redactar guía de contribución',
   'Documentar convenciones de ramas, commits y proceso de revisión.',
   'todo', 'low', false, 1,
   '00000000-0000-0000-0000-000000000002',
   NULL, '2024-01-16T11:00:00Z', '2024-01-16T11:00:00Z'),

  ('22222222-0000-0000-0000-000000000003',
   'Implementar endpoint PATCH /tickets/:id',
   'Actualizar status, prioridad, asignados y etiquetas con optimistic locking.',
   'in_progress', 'high', false, 2,
   '00000000-0000-0000-0000-000000000001',
   NULL, '2024-01-17T08:00:00Z', '2024-01-20T14:30:00Z'),

  ('22222222-0000-0000-0000-000000000004',
   'Tablero Kanban — drag and drop',
   'Mover tarjetas entre columnas con @hello-pangea/dnd.',
   'in_progress', 'medium', true, 1,
   '00000000-0000-0000-0000-000000000003',
   NULL, '2024-01-18T09:00:00Z', '2024-01-21T10:00:00Z'),

  ('22222222-0000-0000-0000-000000000005',
   'Dashboard de métricas — gráfico por mes',
   'Tickets cerrados por mes en los últimos 6 meses.',
   'review', 'medium', false, 3,
   '00000000-0000-0000-0000-000000000002',
   NULL, '2024-01-12T12:00:00Z', '2024-01-22T09:00:00Z'),

  ('22222222-0000-0000-0000-000000000006',
   'Exportar métricas a CSV',
   'Botón de descarga directa con filtros activos aplicados.',
   'review', 'low', false, 2,
   '00000000-0000-0000-0000-000000000004',
   NULL, '2024-01-13T15:00:00Z', '2024-01-23T11:00:00Z'),

  ('22222222-0000-0000-0000-000000000007',
   'Schema Drizzle y migraciones iniciales',
   'Definir todas las tablas, índices y constraints del proyecto.',
   'done', 'high', false, 1,
   '00000000-0000-0000-0000-000000000001',
   NULL, '2024-01-08T08:00:00Z', '2024-01-09T17:00:00Z'),

  ('22222222-0000-0000-0000-000000000008',
   'Login con OAuth — flujo completo',
   'Callback, generación de refresh token y cookie httpOnly.',
   'done', 'high', false, 1,
   '00000000-0000-0000-0000-000000000001',
   NULL, '2024-01-09T08:00:00Z', '2024-01-11T16:00:00Z');
SQL
)

SQL_ASSIGNEES=$(cat <<'SQL'
INSERT INTO ticket_assignees (ticket_id, user_id) VALUES
  ('22222222-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002'),
  ('22222222-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003'),
  ('22222222-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000002'),
  ('22222222-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000003'),
  ('22222222-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000004'),
  ('22222222-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000004'),
  ('22222222-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000001'),
  ('22222222-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000001');
SQL
)

SQL_TICKET_LABELS=$(cat <<'SQL'
INSERT INTO ticket_labels (ticket_id, label_id) VALUES
  ('22222222-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000002'),
  ('22222222-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000004'),
  ('22222222-0000-0000-0000-000000000003', '11111111-0000-0000-0000-000000000002'),
  ('22222222-0000-0000-0000-000000000003', '11111111-0000-0000-0000-000000000005'),
  ('22222222-0000-0000-0000-000000000004', '11111111-0000-0000-0000-000000000003'),
  ('22222222-0000-0000-0000-000000000005', '11111111-0000-0000-0000-000000000002'),
  ('22222222-0000-0000-0000-000000000006', '11111111-0000-0000-0000-000000000003'),
  ('22222222-0000-0000-0000-000000000007', '11111111-0000-0000-0000-000000000002'),
  ('22222222-0000-0000-0000-000000000008', '11111111-0000-0000-0000-000000000002');
SQL
)

SQL_COMMENTS=$(cat <<'SQL'
INSERT INTO comments (id, ticket_id, author_id, body, archived_at, created_at) VALUES
  ('33333333-0000-0000-0000-000000000001',
   '22222222-0000-0000-0000-000000000003',
   '00000000-0000-0000-0000-000000000002',
   'Empecé la implementación. El campo `version` necesita validarse antes del UPDATE.',
   NULL, '2024-01-20T14:00:00Z'),

  ('33333333-0000-0000-0000-000000000002',
   '22222222-0000-0000-0000-000000000003',
   '00000000-0000-0000-0000-000000000001',
   'Exacto, devuelve 409 si el `version` del body no coincide con el de la DB.',
   NULL, '2024-01-20T14:45:00Z'),

  ('33333333-0000-0000-0000-000000000003',
   '22222222-0000-0000-0000-000000000004',
   '00000000-0000-0000-0000-000000000003',
   'DnD funcionando. Queda sincronizar el status con el nombre de la columna.',
   NULL, '2024-01-21T10:30:00Z'),

  ('33333333-0000-0000-0000-000000000004',
   '22222222-0000-0000-0000-000000000005',
   '00000000-0000-0000-0000-000000000004',
   'Revisé la query de métricas. El GROUP BY por mes funciona bien con strftime.',
   NULL, '2024-01-22T09:30:00Z'),

  ('33333333-0000-0000-0000-000000000005',
   '22222222-0000-0000-0000-000000000005',
   '00000000-0000-0000-0000-000000000002',
   'Falta el filtro por `assignee_id` en el endpoint /metrics. @diana lo agregas?',
   NULL, '2024-01-22T11:00:00Z');
SQL
)

SQL_NOTIFICATIONS=$(cat <<'SQL'
INSERT INTO notification_queue
  (id, recipient_id, comment_id, ticket_id, event_type, status, attempts, max_attempts, next_attempt_at, last_error, created_at, updated_at)
VALUES
  ('44444444-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000001',
   '33333333-0000-0000-0000-000000000001',
   '22222222-0000-0000-0000-000000000003',
   'comment_added', 'pending', 0, 3,
   '2024-01-20T14:01:00Z', NULL,
   '2024-01-20T14:00:00Z', '2024-01-20T14:00:00Z'),

  ('44444444-0000-0000-0000-000000000002',
   '00000000-0000-0000-0000-000000000004',
   '33333333-0000-0000-0000-000000000005',
   '22222222-0000-0000-0000-000000000005',
   'mention', 'pending', 0, 3,
   '2024-01-22T11:01:00Z', NULL,
   '2024-01-22T11:00:00Z', '2024-01-22T11:00:00Z'),

  ('44444444-0000-0000-0000-000000000003',
   '00000000-0000-0000-0000-000000000003',
   '33333333-0000-0000-0000-000000000003',
   '22222222-0000-0000-0000-000000000004',
   'ticket_assigned', 'sent', 1, 3,
   '2024-01-21T10:31:00Z', NULL,
   '2024-01-21T10:30:00Z', '2024-01-21T10:32:00Z');
SQL
)

fi  # end MODE branching

# =============================================================================
# Ejecución paso a paso
# =============================================================================
echo ""
log_info "Iniciando seed..."

run_sql "Truncar tablas (idempotencia)"     "$SQL_TRUNCATE"
run_sql "Insertar usuarios (4)"             "$SQL_USERS"
run_sql "Insertar etiquetas (5)"            "$SQL_LABELS"
run_sql "Insertar tickets (8)"              "$SQL_TICKETS"
run_sql "Insertar asignados (8 filas)"      "$SQL_ASSIGNEES"
run_sql "Insertar etiquetas de ticket (9)"  "$SQL_TICKET_LABELS"
run_sql "Insertar comentarios (5)"          "$SQL_COMMENTS"
run_sql "Insertar notificaciones (3)"       "$SQL_NOTIFICATIONS"

# =============================================================================
# Resumen final
# =============================================================================
echo ""
if $DRY_RUN; then
  printf "${YELLOW}${BOLD}╔══════════════════════════════════════════╗${RESET}\n"
  printf "${YELLOW}${BOLD}║   DRY-RUN completado — 0 cambios reales  ║${RESET}\n"
  printf "${YELLOW}${BOLD}╚══════════════════════════════════════════╝${RESET}\n"
else
  printf "${GREEN}${BOLD}╔══════════════════════════════════════════╗${RESET}\n"
  printf "${GREEN}${BOLD}║         Seed completado con éxito        ║${RESET}\n"
  printf "${GREEN}${BOLD}╚══════════════════════════════════════════╝${RESET}\n"
  echo ""
  log_info "Datos insertados:"
  printf "  ${DIM}%-30s${RESET} %s\n" "users"              "4  (1 admin, 3 members)"
  printf "  ${DIM}%-30s${RESET} %s\n" "labels"             "5  (bug, feature, enhancement, docs, urgent)"
  printf "  ${DIM}%-30s${RESET} %s\n" "tickets"            "8  (2 todo / 2 in_progress / 2 review / 2 done)"
  printf "  ${DIM}%-30s${RESET} %s\n" "ticket_assignees"   "8"
  printf "  ${DIM}%-30s${RESET} %s\n" "ticket_labels"      "9"
  printf "  ${DIM}%-30s${RESET} %s\n" "comments"           "5"
  printf "  ${DIM}%-30s${RESET} %s\n" "notification_queue" "3  (2 pending, 1 sent)"
fi
echo ""
