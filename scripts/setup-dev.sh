#!/bin/bash
# =============================================================================
# scripts/setup-dev.sh — MiniJira dev environment setup
#
# Pasos:
#   1. Verifica pnpm
#   2. Instala dependencias: backend/ y frontend/
#   3. Crea backend/.env desde .env.example si no existe
#   4. Corre migraciones Drizzle (drizzle-kit migrate)
#   5. Verifica que la BD responde
#
# Uso:
#   ./scripts/setup-dev.sh
#   ./scripts/setup-dev.sh --dry-run
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

log_info()  { printf "${CYAN}${BOLD}[setup]${RESET} %s\n" "$*"; }
log_ok()    { printf "${GREEN}${BOLD}  ✓${RESET}  %s\n" "$*"; }
log_warn()  { printf "${YELLOW}${BOLD}  ⚠${RESET}  %s\n" "$*"; }
log_step()  { printf "\n${BLUE}${BOLD}──▶${RESET} ${BOLD}%s${RESET}\n" "$*"; }
log_dry()   { printf "${YELLOW}${DIM}[dry-run]${RESET} %s\n" "$*"; }
log_err()   { printf "${RED}${BOLD}  ✗  %s${RESET}\n" "$*" >&2; }

# ── Argumentos ────────────────────────────────────────────────────────────────
DRY_RUN=false
for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=true ;;
    --help|-h) echo "Uso: $0 [--dry-run]"; exit 0 ;;
    *) log_err "Argumento desconocido: $arg"; exit 1 ;;
  esac
done

# ── Rutas ─────────────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"

# ── Cabecera ──────────────────────────────────────────────────────────────────
echo ""
printf "${BOLD}╔════════════════════════════════════════════╗${RESET}\n"
printf "${BOLD}║       MiniJira — Setup Dev Environment      ║${RESET}\n"
printf "${BOLD}╚════════════════════════════════════════════╝${RESET}\n\n"
log_info "Raíz    : ${BOLD}$ROOT_DIR${RESET}"
$DRY_RUN && log_warn "DRY-RUN — no se ejecutará ningún comando"

# ── Helper: ejecutar o simular ────────────────────────────────────────────────
run_cmd() {
  local desc="$1"; shift
  if $DRY_RUN; then
    log_dry "$desc"
    log_dry "  cmd: $*"
  else
    "$@"
    log_ok "$desc"
  fi
}

# =============================================================================
# 1. Verificar pnpm
# =============================================================================
log_step "1 / 5 — Verificar pnpm"

if ! command -v pnpm &>/dev/null; then
  log_err "pnpm no encontrado."
  printf "  Instálalo con: npm install -g pnpm\n"
  printf "  O desde:       https://pnpm.io/installation\n"
  exit 1
fi

PNPM_VER="$(pnpm --version)"
log_ok "pnpm $PNPM_VER"

if ! command -v node &>/dev/null; then
  log_err "node no encontrado. Instala Node.js >= 20."
  exit 1
fi
log_ok "node $(node --version)"

# =============================================================================
# 2. Instalar dependencias
# =============================================================================
log_step "2 / 5 — Instalar dependencias"

if [[ ! -d "$BACKEND_DIR" ]]; then
  log_err "backend/ no encontrado en: $BACKEND_DIR"
  exit 1
fi
if [[ ! -d "$FRONTEND_DIR" ]]; then
  log_err "frontend/ no encontrado en: $FRONTEND_DIR"
  exit 1
fi

if $DRY_RUN; then
  log_dry "pnpm install  (en backend/)"
  log_dry "pnpm install  (en frontend/)"
else
  log_info "Instalando backend/..."
  (cd "$BACKEND_DIR" && pnpm install)
  log_ok "backend/ — dependencias listas"

  log_info "Instalando frontend/..."
  (cd "$FRONTEND_DIR" && pnpm install)
  log_ok "frontend/ — dependencias listas"
fi

# =============================================================================
# 3. Crear .env desde .env.example (idempotente)
# =============================================================================
log_step "3 / 5 — Configurar backend/.env"

ENV_FILE="$BACKEND_DIR/.env"
ENV_EXAMPLE="$BACKEND_DIR/.env.example"

if [[ ! -f "$ENV_EXAMPLE" ]]; then
  log_err ".env.example no encontrado en backend/"
  exit 1
fi

if [[ -f "$ENV_FILE" ]]; then
  log_ok ".env ya existe — no se sobreescribe"
else
  if $DRY_RUN; then
    log_dry "cp $ENV_EXAMPLE $ENV_FILE"
  else
    cp "$ENV_EXAMPLE" "$ENV_FILE"
    log_ok ".env creado desde .env.example"
    log_warn "Edita backend/.env con tus credenciales reales antes de arrancar"
  fi
fi

# Cargar DATABASE_URL para la verificación posterior
if [[ -f "$ENV_FILE" ]]; then
  while IFS='=' read -r key value; do
    [[ -z "$key" || "$key" == \#* ]] && continue
    key="${key%%[[:space:]]*}"; value="${value%%[[:space:]]*}"
    value="${value#\"}"; value="${value%\"}"
    value="${value#\'}"; value="${value%\'}"
    [[ -z "${!key:-}" ]] && export "$key=$value"
  done < "$ENV_FILE"
fi

DATABASE_URL="${DATABASE_URL:-./minijira.db}"
[[ "$DATABASE_URL" != /* ]] && DB_ABS_PATH="$BACKEND_DIR/$DATABASE_URL" || DB_ABS_PATH="$DATABASE_URL"

# =============================================================================
# 4. Correr migraciones Drizzle
# =============================================================================
log_step "4 / 5 — Migraciones Drizzle (drizzle-kit migrate)"

if ! $DRY_RUN && [[ ! -d "$BACKEND_DIR/node_modules" ]]; then
  log_err "node_modules no encontrado en backend/. El paso 2 falló."
  exit 1
fi

if $DRY_RUN; then
  log_dry "pnpm db:migrate  (en backend/)"
else
  log_info "Ejecutando drizzle-kit migrate..."
  (cd "$BACKEND_DIR" && pnpm run db:migrate)
  log_ok "Migraciones aplicadas"
fi

# =============================================================================
# 5. Verificar que la BD responde
# =============================================================================
log_step "5 / 5 — Verificar base de datos"

if $DRY_RUN; then
  log_dry "sqlite3 $DB_ABS_PATH 'SELECT COUNT(*) FROM sqlite_master;'"
else
  if ! command -v sqlite3 &>/dev/null; then
    log_warn "sqlite3 no instalado — no se puede verificar la BD"
    log_warn "Instálalo con: brew install sqlite  |  apt-get install sqlite3"
  else
    if [[ ! -f "$DB_ABS_PATH" ]]; then
      log_err "BD no encontrada tras migrar: $DB_ABS_PATH"
      exit 1
    fi

    TABLE_COUNT=$(sqlite3 "$DB_ABS_PATH" "SELECT COUNT(*) FROM sqlite_master WHERE type='table';")

    if [[ "$TABLE_COUNT" -lt 7 ]]; then
      log_err "BD responde pero tiene solo $TABLE_COUNT tablas (se esperan ≥7)"
      log_err "Verifica que la migración se aplicó correctamente"
      exit 1
    fi

    log_ok "BD responde — $TABLE_COUNT tablas encontradas"

    # Listar tablas para confirmación visual
    echo ""
    log_info "Tablas en la BD:"
    sqlite3 "$DB_ABS_PATH" "SELECT '  ' || name FROM sqlite_master WHERE type='table' ORDER BY name;" | while IFS= read -r line; do
      printf "${DIM}%s${RESET}\n" "$line"
    done
  fi
fi

# =============================================================================
# Resumen
# =============================================================================
echo ""
if $DRY_RUN; then
  printf "${YELLOW}${BOLD}╔════════════════════════════════════════════╗${RESET}\n"
  printf "${YELLOW}${BOLD}║    DRY-RUN completado — 0 comandos reales  ║${RESET}\n"
  printf "${YELLOW}${BOLD}╚════════════════════════════════════════════╝${RESET}\n"
else
  printf "${GREEN}${BOLD}╔════════════════════════════════════════════╗${RESET}\n"
  printf "${GREEN}${BOLD}║       Entorno dev listo para arrancar       ║${RESET}\n"
  printf "${GREEN}${BOLD}╚════════════════════════════════════════════╝${RESET}\n\n"
  log_info "Próximos pasos:"
  printf "  ${DIM}1.${RESET} Edita ${BOLD}backend/.env${RESET} con tus credenciales OAuth y JWT\n"
  printf "  ${DIM}2.${RESET} Ejecuta el seed:    ${BOLD}./scripts/seed.sh${RESET}\n"
  printf "  ${DIM}3.${RESET} Arranca el backend: ${BOLD}cd backend && pnpm dev${RESET}\n"
  printf "  ${DIM}4.${RESET} Arranca el frontend:${BOLD}cd frontend && pnpm dev${RESET}\n"
fi
echo ""
