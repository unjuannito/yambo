#!/usr/bin/env bash
# =============================================================================
# anonymize-dump.sh
# =============================================================================
# Generates a safe, anonymized dump from the production database for PR preview
# environments.
#
# The script:
#   1. Connects to production and clones schema plus data into a temporary DB
#   2. Restores the dump into a temporary local database
#   3. Runs anonymization UPDATE statements (replaces PII with safe fakes)
#   4. Exports either a data-only seed file or a full bootstrap SQL dump
#   5. Writes the result to the requested output path
#
# Modes:
#   - seed-data          (default) → data-only SQL for an already migrated DB
#   - database-bootstrap           → full schema+data SQL for restoring a
#                                    preview DB before backend deployment
#
# Requirements:
#   - psql and pg_dump in PATH (matching prod Postgres version, ideally ≥15)
#   - A local PostgreSQL instance accessible via the socket (for the temp DB)
#   - Read access to the production database
#
# Usage:
#   export PROD_DB_HOST=prod-host
#   export PROD_DB_PORT=5432          # optional, default 5432
#   export PROD_DB_USER=yambo_user
#   export PROD_DB_PASS=secret
#   export PROD_DB_NAME=yambo_db      # optional, default yambo_db
#   ./scripts/anonymize-dump.sh
#   ANONYMIZE_DUMP_MODE=database-bootstrap ./scripts/anonymize-dump.sh /tmp/preview-bootstrap.sql
#
# Override output path:
#   ./scripts/anonymize-dump.sh /path/to/output.sql
# =============================================================================

set -euo pipefail

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
PROD_HOST="${PROD_DB_HOST:?Set PROD_DB_HOST to the production database hostname}"
PROD_PORT="${PROD_DB_PORT:-5432}"
PROD_USER="${PROD_DB_USER:?Set PROD_DB_USER}"
PROD_DB="${PROD_DB_NAME:-yambo_db}"
OUTPUT="${1:-backend/src/main/resources/db/scripts/preview-seed.sql}"
MODE="${ANONYMIZE_DUMP_MODE:-seed-data}"

# Temp database name  includes the PID so parallel runs don't collide
TEMP_DB="yambo_anon_$$"

# Tables with user data to export (excludes audit/session tables)
DATA_TABLES=(
    user
    user_profile
    user_project
    project
    family_product
    family_product_profile
    family_product_project
    product
    '"order"'
    order_product
    order_status_history
    issue
    issue_comment
    invitations
    invitation_profile
    nominative_invitations
    nominative_invitation_profile
    settings
    profile
    permission
    "profile_permission"
    "user_permission"
)

# bcrypt("preview123") — computed offline, never changes
PREVIEW_PASS='$2a$12$S0KapdLdqT.R2EVj6mLgBu4LTMlB7Ikxa3ApmIJhrVPO9v9TL/qd2'

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
log()  { echo "[anonymize-dump] $*" >&2; }
fail() { echo "[anonymize-dump] ERROR: $*" >&2; exit 1; }

cleanup() {
    log "Dropping temp database ${TEMP_DB} …"
    psql -q -c "DROP DATABASE IF EXISTS ${TEMP_DB};" postgres 2>/dev/null || true
}
trap cleanup EXIT

case "${MODE}" in
    seed-data|database-bootstrap)
        ;;
    *)
        fail "Unsupported ANONYMIZE_DUMP_MODE: ${MODE}"
        ;;
esac

# ---------------------------------------------------------------------------
# 1. Verify connectivity to production
# ---------------------------------------------------------------------------
log "Testing connection to production (${PROD_HOST}:${PROD_PORT}/${PROD_DB}) …"
PGPASSWORD="${PROD_DB_PASS:?Set PROD_DB_PASS}" \
    psql -h "${PROD_HOST}" -p "${PROD_PORT}" -U "${PROD_USER}" \
         -d "${PROD_DB}" -c "SELECT 1;" -q --no-align -t > /dev/null \
    || fail "Cannot connect to production database"

# ---------------------------------------------------------------------------
# 2. Create temp local database
# ---------------------------------------------------------------------------
log "Creating temporary database ${TEMP_DB} …"
psql -q -c "CREATE DATABASE ${TEMP_DB};" postgres

# ---------------------------------------------------------------------------
# 3. Dump production schema into temp DB (Liquibase tables included so FKs work)
# ---------------------------------------------------------------------------
log "Cloning schema from production into ${TEMP_DB} …"
PGPASSWORD="${PROD_DB_PASS}" \
    pg_dump \
        -h "${PROD_HOST}" -p "${PROD_PORT}" -U "${PROD_USER}" "${PROD_DB}" \
        --schema-only --no-acl --no-owner \
    | psql -q -d "${TEMP_DB}"

# ---------------------------------------------------------------------------
# 4. Dump production data into temp DB
# ---------------------------------------------------------------------------
log "Copying data from production into ${TEMP_DB} …"
PGPASSWORD="${PROD_DB_PASS}" \
    pg_dump \
        -h "${PROD_HOST}" -p "${PROD_PORT}" -U "${PROD_USER}" "${PROD_DB}" \
        --data-only --no-acl --no-owner \
        --exclude-table='password_reset_token' \
        --exclude-table='user_login_history' \
    | psql -q -d "${TEMP_DB}"

# ---------------------------------------------------------------------------
# 5. Anonymize PII in the temp database
# ---------------------------------------------------------------------------
log "Anonymizing PII …"
psql -q -d "${TEMP_DB}" -v preview_pass="${PREVIEW_PASS}" <<'ANON_SQL'
-- ── users ──────────────────────────────────────────────────────────────────
-- Replace real emails with deterministic preview addresses
UPDATE public."user"
SET
    email    = 'user-' || LOWER(id) || '@preview.invalid',
    name     = 'Preview User ' || LOWER(id),
    password = :'preview_pass',
    photo    = NULL,
    bio      = NULL,
    fun_fact = NULL,
    last_login_at           = NULL,
    notification_preferences = NULL
WHERE system = false;

-- Keep system users untouched (system=true rows are Liquibase-seeded accounts)

-- ── nominative invitations ─────────────────────────────────────────────────
UPDATE public.nominative_invitations
SET
    email      = 'invited-' || id || '@preview.invalid',
    token      = 'ANON-' || id || '-TOKEN';

-- ── open invitations ───────────────────────────────────────────────────────
UPDATE public.invitations
SET
    token      = 'ANON-INV-' || id || '-TOKEN',
    invited_by = NULL;

-- ── invitation_registration ────────────────────────────────────────────────
-- Wipe registration events (they contain the original email used to register)
DELETE FROM public.invitation_registration;

-- ── promotion_invitation_registration ─────────────────────────────────────
DO $$
BEGIN
    DELETE FROM public.promotion_invitation_registration;
EXCEPTION WHEN undefined_table THEN NULL;
END
$$;

-- ── order product configurations with personal names ─────────────────────
-- Strip free-text "Nombre" field from JSON configurations
UPDATE public.order_product
SET configuration = configuration::jsonb - 'Nombre'
WHERE configuration IS NOT NULL
  AND configuration::jsonb ? 'Nombre';

-- ── issue / comment descriptions ─────────────────────────────────────────
-- Keep realistic structure but scrub any free text that may contain names
UPDATE public.issue
SET description = '[Preview] ' || LEFT(description, 80)
WHERE description IS NOT NULL;

DO $$
BEGIN
    EXECUTE 'UPDATE public.issue_comment SET content = ''[Preview] '' || LEFT(content, 80) WHERE content IS NOT NULL';
EXCEPTION WHEN undefined_column THEN
    EXECUTE 'UPDATE public.issue_comment SET comment = ''[Preview] '' || LEFT(comment, 80) WHERE comment IS NOT NULL';
END
$$;

-- ── liquibase metadata ────────────────────────────────────────────────────
-- Ensure preview restores never start with a stale lock copied from prod.
UPDATE public.databasechangeloglock
SET locked = false,
    lockgranted = NULL,
    lockedby = NULL;

-- ── settings: wipe any stored credentials ────────────────────────────────
UPDATE public.settings
SET value = ''
WHERE category IN ('email', 'ollama')
  AND (
      key LIKE '%.password%'
      OR key LIKE '%.secret%'
      OR key LIKE '%.token%'
  );
ANON_SQL

# ---------------------------------------------------------------------------
# 6. Export anonymized SQL
# ---------------------------------------------------------------------------
log "Exporting anonymized SQL in ${MODE} mode …"

if [[ "${MODE}" == "seed-data" ]]; then
    TABLES_ARGS=()
    for t in "${DATA_TABLES[@]}"; do
        TABLES_ARGS+=(--table="${t}")
    done

    pg_dump -d "${TEMP_DB}" \
        --data-only --column-inserts --no-acl --no-owner \
        --exclude-table='databasechangelog' \
        --exclude-table='databasechangeloglock' \
        "${TABLES_ARGS[@]}" \
        > "${OUTPUT}.raw"

    log "Writing ${OUTPUT} …"
    cat > "${OUTPUT}" <<'HEADER'
-- =============================================================================
-- PREVIEW ENVIRONMENT SEED DATA  (auto-generated — do not edit by hand)
-- Generated by: scripts/anonymize-dump.sh
-- =============================================================================
-- Anonymized copy of production data.
-- All emails use @preview.invalid  |  All passwords = "preview123"
-- =============================================================================
SET session_replication_role = replica;  -- disable FK checks during load
HEADER

    cat "${OUTPUT}.raw" >> "${OUTPUT}"

    cat >> "${OUTPUT}" <<'FOOTER'
SET session_replication_role = DEFAULT; -- re-enable FK checks
FOOTER
else
    log "Writing ${OUTPUT} …"
    cat > "${OUTPUT}" <<'HEADER'
-- =============================================================================
-- PREVIEW DATABASE BOOTSTRAP  (auto-generated — do not edit by hand)
-- Generated by: scripts/anonymize-dump.sh
-- =============================================================================
-- Restores a preview database with anonymized production schema and data.
-- Backend deployment should happen only after this dump has been restored.
-- =============================================================================
HEADER

    pg_dump -d "${TEMP_DB}" \
        --schema-only --clean --if-exists --no-acl --no-owner \
        >> "${OUTPUT}"

    cat >> "${OUTPUT}" <<'HEADER'

SET session_replication_role = replica;
HEADER

    pg_dump -d "${TEMP_DB}" \
        --data-only --column-inserts --no-acl --no-owner \
        >> "${OUTPUT}"

    cat >> "${OUTPUT}" <<'FOOTER'
SET session_replication_role = DEFAULT;
FOOTER
fi

rm -f "${OUTPUT}.raw"

log "Done → ${OUTPUT}"
