#!/bin/bash
# =============================================================================
# scripts/cleanup.sh — MiniJira test cleanup
#
# Trunca las tablas de test en orden correcto de FK y borra tmp/.
#
# Orden de truncado (respetando dependencias FK):
#   notification_queue → comments → ticket_labels → ticket_assignees
#   → refresh_tokens → tickets → labels → users
#
# Uso:
#   ./scripts/cleanup.sh
#   ./scripts/cleanup.sh --dry-run
#   ./scripts/cleanup.sh --tables-only    # solo trunca, no borra tmp/
#   ./scripts/cleanup.sh --tmp-only       # solo borra tmp/, no trunca
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

log_info()  { printf "${CYAN}${BOLD}[cleanup]${RESET} %s\n" "$*"; }
log_ok()    { printf "${GREEN}${BOLD}  ✓${RESET}  %s\n" "$*"; }
log_warn()  { printf "${YELLOW}${BOLD}  ⚠${RESET}  %s\n" "$*"; }
log_step()  { printf "\n${BLUE}${BOLD}──▶${RESET} ${BOLD}%s${RESET}\n" "$*"; }
log_dry()   { printf "${YELLOW}${DIM}[dry-run]${RESET} %s\n" "$*"; }
log_err()   { printf "${RED}${BOLD}  ✗  %s${RESET}\n" "$*" >&2; }
log_sql()   { printf "${DIM}%s${RESET}\n" "$*"; }
log_hr()    { printf "${DIM}%s${RESET}\n" "─────────────────────────────────────────────────────"; }

# ── Argumentos ────────────────────────────────────────────────────────────────
DRY_RUN=false
TABLES_ONLY=false
TMP_ONLY=false

for arg in "$@"; do
  case "$arg" in
    --dry-run)    DRY_RUN=true ;;
    --tables-only) TABLES_ONLY=true ;;
    --tmp-only)   TMP_ONLY=true ;;
    --help|-h)
      echo "Uso: $0 [--dry-run] [--tables-only] [--tmp-only]"
      echo ""
      echo "  --dry-run      Muestra qué se haría sin hacer nada"
      echo "  --tables-only  Solo trunca tablas, no borra tmp/"
      echo "  --tmp-only     Solo borra tmp/, no trunca tablas"
      exit 0
      ;;
    *) log_err "Argumento desconocido: $arg"; echo "Usa --help para ver opciones" >&2; exit 1 ;;
  esac
done

if $TABLES_ONLY && $TMP_ONLY; then
  log_err "--tables-only y --tmp-only son mutuamente excluyentes"
  exit 1
fi

# ── Rutas ─────────────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
TMP_DIR="$ROOT_DIR/tmp"

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
printf "${BOLD}║         MiniJira — Cleanup Script           ║${RESET}\n"
printf "${BOLD}╚════════════════════════════════════════════╝${RESET}\n\n"
log_info "Modo    : ${BOLD}$MODE${RESET}"
[[ "$MODE" == "sqlite" ]] && log_info "Archivo : ${BOLD}$DATABASE_URL${RESET}"
$DRY_RUN && log_warn "DRY-RUN — no se modificará nada"
$TABLES_ONLY && log_info "Alcance : ${BOLD}solo tablas${RESET}"
$TMP_ONLY    && log_info "Alcance : ${BOLD}solo tmp/${RESET}"

# ── Verificar dependencias (solo si vamos a tocar BD) ────────────────────────
if ! $TMP_ONLY; then
  log_step "Verificando dependencias"
  if [[ "$MODE" == "sqlite" ]]; then
    if ! command -v sqlite3 &>/dev/null; then
      $DRY_RUN && log_warn "sqlite3 no instalado — dry-run continúa" || { log_err "sqlite3 requerido"; exit 1; }
    else
      log_ok "sqlite3 $(sqlite3 --version | cut -d' ' -f1)"
    fi
    if ! $DRY_RUN && [[ ! -f "$DATABASE_URL" ]]; then
      log_warn "BD no encontrada: $DATABASE_URL — truncado omitido"
      # No abortamos: si no hay BD no hay nada que limpiar
      SKIP_DB=true
    else
      SKIP_DB=false
    fi
  else
    if ! command -v psql &>/dev/null; then
      $DRY_RUN && log_warn "psql no instalado — dry-run continúa" || { log_err "psql requerido"; exit 1; }
    else
      log_ok "psql $(psql --version | awk '{print $3}')"
    fi
    SKIP_DB=false
  fi
fi

# ── Función SQL ───────────────────────────────────────────────────────────────
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
# A. Truncar tablas
# =============================================================================
if ! $TMP_ONLY; then

  if [[ "${SKIP_DB:-false}" == "true" ]]; then
    log_step "Truncar tablas"
    log_warn "BD no encontrada — truncado omitido (nada que limpiar)"
  else
    # Orden inverso a las FK del schema.ts/migration:
    #   notification_queue  refs: users, comments, tickets
    #   comments            refs: tickets, users
    #   ticket_labels       refs: tickets, labels
    #   ticket_assignees    refs: tickets, users
    #   refresh_tokens      refs: users
    #   tickets             refs: users
    #   labels              (sin FK entrantes excepto las tablas ya limpias)
    #   users               (raíz del grafo)

    if [[ "$MODE" == "sqlite" ]]; then
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
    else
      SQL_TRUNCATE='TRUNCATE TABLE notification_queue, comments, ticket_labels,
  ticket_assignees, refresh_tokens, tickets, labels, users CASCADE;'
    fi

    run_sql "Truncar tablas (8 tablas en orden FK inverso)" "$SQL_TRUNCATE"

    # Confirmar conteos tras truncado (solo en modo real sqlite)
    if ! $DRY_RUN && [[ "$MODE" == "sqlite" ]]; then
      log_step "Verificar conteos post-truncado"
      TABLES=(users labels tickets ticket_assignees ticket_labels refresh_tokens comments notification_queue)
      ALL_ZERO=true
      for tbl in "${TABLES[@]}"; do
        COUNT=$(sqlite3 "$DATABASE_URL" "SELECT COUNT(*) FROM $tbl;" 2>/dev/null || echo "ERR")
        if [[ "$COUNT" != "0" ]]; then
          log_warn "$tbl tiene $COUNT filas — no se truncó correctamente"
          ALL_ZERO=false
        else
          printf "  ${DIM}%-28s${RESET} ${GREEN}0 filas${RESET}\n" "$tbl"
        fi
      done
      $ALL_ZERO && log_ok "Todas las tablas vacías"
    fi
  fi

fi  # end !TMP_ONLY

# =============================================================================
# B. Limpiar tmp/
# =============================================================================
if ! $TABLES_ONLY; then

  log_step "Limpiar tmp/"

  if [[ ! -d "$TMP_DIR" ]]; then
    log_warn "Directorio tmp/ no existe ($TMP_DIR) — omitiendo"
  else
    # Contar antes de borrar para el reporte
    TMP_COUNT=$(find "$TMP_DIR" -mindepth 1 -maxdepth 1 | wc -l | tr -d ' ')

    if [[ "$TMP_COUNT" -eq 0 ]]; then
      log_ok "tmp/ ya está vacío"
    else
      if $DRY_RUN; then
        log_dry "Borraría $TMP_COUNT entradas en tmp/"
        find "$TMP_DIR" -mindepth 1 -maxdepth 1 | while IFS= read -r f; do
          log_dry "  rm -rf $f"
        done
      else
        find "$TMP_DIR" -mindepth 1 -maxdepth 1 -exec rm -rf {} +
        log_ok "tmp/ limpiado ($TMP_COUNT entradas borradas)"
      fi
    fi
  fi

fi  # end !TABLES_ONLY

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
  printf "${GREEN}${BOLD}║           Cleanup completado con éxito      ║${RESET}\n"
  printf "${GREEN}${BOLD}╚════════════════════════════════════════════╝${RESET}\n"
fi
echo ""
