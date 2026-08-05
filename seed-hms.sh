#!/usr/bin/env bash
# HMS Database Seed Script (Linux / macOS)
# Usage: ./seed-hms.sh                 (restore, build, run each service once to migrate + seed)
#        ./seed-hms.sh -SkipBuild      (skip the .NET restore/build step)
#        ./seed-hms.sh -TimeoutSeconds 120
#
# Runs each backend service once on its seed port; the service applies its EF Core
# migrations and seeds master data on startup, then the script stops it again.
# Credentials come from hms.local.sh (see hms.local.example.sh).

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND="$ROOT/backend"
LOG_DIR="$ROOT/.runtime-logs"
TEMP_DIR="$ROOT/.runtime-tmp"
LOCAL_CONFIG="$ROOT/hms.local.sh"
PS1_LOCAL_CONFIG="$ROOT/hms.local.ps1"
DOTNET_HOME="$BACKEND/.dotnet-home"
DOTNET_APPDATA="$BACKEND/.appdata"

# ---------------------------------------------------------------------------
# Helper functions
# ---------------------------------------------------------------------------
info() { printf "\033[36m[INFO]\033[0m  %s\n" "$*"; }
warn() { printf "\033[33m[WARN]\033[0m  %s\n" "$*"; }
err()  { printf "\033[31m[ERROR]\033[0m %s\n" "$*"; }
ok()   { printf "\033[32m[OK]\033[0m    %s\n" "$*"; }

cleanup() {
    warn "Interrupted — stopping seed service processes..."
    if [ -n "${CURRENT_PORT:-}" ]; then
        if command -v lsof >/dev/null 2>&1; then
            for listener in $(lsof -ti tcp:"$CURRENT_PORT" 2>/dev/null); do
                kill "$listener" 2>/dev/null || true
            done
        fi
    fi
    exit 130
}
trap cleanup SIGINT SIGTERM

create_database() {
    local db_name="$1"
    if ! command -v psql >/dev/null 2>&1; then
        warn "psql not found — skipping database existence check for $db_name."
        return 0
    fi
    local exists
    exists=$(PGPASSWORD="$HMS_POSTGRES_PASSWORD" psql -h "$HMS_POSTGRES_HOST" -p "$HMS_POSTGRES_PORT" -U "$HMS_POSTGRES_USER" -tAc "SELECT 1 FROM pg_database WHERE datname='$db_name'" 2>/dev/null)
    if [ "$exists" = "1" ]; then
        ok "Database $db_name already exists."
    else
        info "Creating database: $db_name"
        if PGPASSWORD="$HMS_POSTGRES_PASSWORD" psql -h "$HMS_POSTGRES_HOST" -p "$HMS_POSTGRES_PORT" -U "$HMS_POSTGRES_USER" -c "CREATE DATABASE \"$db_name\";" >/dev/null 2>&1; then
            ok "Database $db_name created."
        else
            warn "Could not create database $db_name. EF Core migrations may fail if the database does not already exist."
        fi
    fi
}

wait_health() {
    local name="$1" health_url="$2" pid="$3" timeout_seconds="$4" err_log="$5"
    local deadline=$(( $(date +%s) + timeout_seconds ))
    while [ "$(date +%s)" -lt "$deadline" ]; do
        if ! kill -0 "$pid" 2>/dev/null; then
            err "$name stopped before becoming healthy. Check $err_log."
            return 1
        fi
        if command -v curl >/dev/null 2>&1; then
            if curl -fsS --max-time 5 "$health_url" >/dev/null 2>&1; then
                return 0
            fi
        elif wget -q --spider --timeout=5 "$health_url" 2>/dev/null; then
            return 0
        fi
        sleep 2
    done
    err "$name did not become healthy within $timeout_seconds seconds. Check $err_log."
    return 1
}

stop_service() {
    local port="$1" pid="$2"
    # Stop the `dotnet run` parent and any process actually listening on the seed port.
    kill "$pid" 2>/dev/null || true
    if command -v lsof >/dev/null 2>&1; then
        for listener in $(lsof -ti tcp:"$port" 2>/dev/null); do
            kill "$listener" 2>/dev/null || true
        done
    elif command -v fuser >/dev/null 2>&1; then
        fuser -k "$port/tcp" >/dev/null 2>&1 || true
    fi
    sleep 2
}

# ---------------------------------------------------------------------------
# Parse arguments
# ---------------------------------------------------------------------------
SKIP_BUILD=false
TIMEOUT_SECONDS=90

while [ $# -gt 0 ]; do
    case "$1" in
        -SkipBuild|-skipbuild|--skip-build|--skipbuild)
            SKIP_BUILD=true
            shift
            ;;
        -TimeoutSeconds|-timeoutseconds|--timeout|-t)
            TIMEOUT_SECONDS="${2:-90}"
            shift 2
            ;;
        -TimeoutSeconds=*|--timeout=*)
            TIMEOUT_SECONDS="${1#*=}"
            shift
            ;;
        -h|--help|help)
            echo "Usage: ./seed-hms.sh [-SkipBuild] [-TimeoutSeconds <seconds>]"
            exit 0
            ;;
        *)
            err "Unknown argument: $1"
            echo "Usage: ./seed-hms.sh [-SkipBuild] [-TimeoutSeconds <seconds>]"
            exit 1
            ;;
    esac
done

case "$TIMEOUT_SECONDS" in
    ''|*[!0-9]*)
        err "TimeoutSeconds must be a positive integer."
        exit 1
        ;;
esac

# ---------------------------------------------------------------------------
# Prerequisites
# ---------------------------------------------------------------------------
if ! command -v dotnet >/dev/null 2>&1; then
    err "dotnet is not installed or not on PATH. Install the .NET SDK first."
    exit 1
fi
if ! command -v curl >/dev/null 2>&1 && ! command -v wget >/dev/null 2>&1; then
    err "curl or wget is required for service health checks."
    exit 1
fi

mkdir -p "$LOG_DIR" "$TEMP_DIR" "$DOTNET_HOME" "$DOTNET_APPDATA"

# ---------------------------------------------------------------------------
# .NET environment (isolated home reduces memory and flakiness)
# ---------------------------------------------------------------------------
export DOTNET_CLI_HOME="$DOTNET_HOME"
export APPDATA="$DOTNET_APPDATA"
export DOTNET_NOLOGO="true"
export DOTNET_SKIP_FIRST_TIME_EXPERIENCE="1"
export DOTNET_CLI_TELEMETRY_OPTOUT="1"
export DOTNET_CLI_WORKLOAD_UPDATE_NOTIFY_DISABLE="1"
export MSBUILDDISABLENODEREUSE=1
export TMPDIR="$TEMP_DIR"
export ASPNETCORE_ENVIRONMENT="${ASPNETCORE_ENVIRONMENT:-Development}"

NUGET_CONFIG_DIR="$DOTNET_APPDATA/NuGet"
mkdir -p "$NUGET_CONFIG_DIR"
cp -f "$BACKEND/NuGet.Config" "$NUGET_CONFIG_DIR/NuGet.Config"

# ---------------------------------------------------------------------------
# Local configuration
# ---------------------------------------------------------------------------
if [ -f "$LOCAL_CONFIG" ]; then
    source "$LOCAL_CONFIG"
    info "Loaded configuration from $LOCAL_CONFIG"
elif [ -f "$PS1_LOCAL_CONFIG" ]; then
    warn "No $LOCAL_CONFIG found, but hms.local.ps1 exists. Reading its \$env: assignments..."
    while IFS= read -r line; do
        line="${line//$'\r'/}"
        if [[ "$line" =~ ^\$env:([A-Za-z0-9_]+)[[:space:]]*=[[:space:]]*(.*)$ ]]; then
            key="${BASH_REMATCH[1]}"
            val="${BASH_REMATCH[2]}"
            # Strip one surrounding pair of double or single quotes, if present.
            if [[ "${val:0:1}" == '"' && "${val: -1}" == '"' ]]; then
                val="${val:1:${#val}-2}"
            elif [[ "${val:0:1}" == "'" && "${val: -1}" == "'" ]]; then
                val="${val:1:${#val}-2}"
            fi
export "$key=$val"
        fi
    done < "$PS1_LOCAL_CONFIG"
    info "Loaded configuration from $PS1_LOCAL_CONFIG (converted)."
elif [ -f "$ROOT/deploy/.env" ]; then
    warn "No $LOCAL_CONFIG found. Falling back to deploy/.env for PostgreSQL credentials..."
    export HMS_POSTGRES_PASSWORD=$(grep '^HMS_POSTGRES_PASSWORD=' "$ROOT/deploy/.env" 2>/dev/null | head -1 | cut -d= -f2-)
    export HMS_POSTGRES_USER=$(grep '^HMS_POSTGRES_USER=' "$ROOT/deploy/.env" 2>/dev/null | head -1 | cut -d= -f2-)
else
    warn "No $LOCAL_CONFIG found. Copy hms.local.example.sh to hms.local.sh and fill in your credentials."
fi

HMS_POSTGRES_HOST="${HMS_POSTGRES_HOST:-localhost}"
HMS_POSTGRES_PORT="${HMS_POSTGRES_PORT:-5432}"
HMS_POSTGRES_USER="${HMS_POSTGRES_USER:-postgres}"

# ---------------------------------------------------------------------------
# Secrets
# ---------------------------------------------------------------------------
if [ -z "${Security__Jwt__SigningKey:-}" ]; then
    Security__Jwt__SigningKey=$(openssl rand -base64 48 | tr -d '\n')
    warn "Security__Jwt__SigningKey was not configured. A temporary development signing key was generated for this seed run."
fi
export Security__Jwt__SigningKey

if [ -z "${Seed__DefaultPassword:-}" ]; then
    err "Seed__DefaultPassword is required. Copy hms.local.example.sh to hms.local.sh and set Seed__DefaultPassword before running this script."
    exit 1
fi
export Seed__DefaultPassword

# ---------------------------------------------------------------------------
# Connection strings
# ---------------------------------------------------------------------------
if [ -z "${ConnectionStrings__IdentityDb:-}" ] ||
   [ -z "${ConnectionStrings__PatientManagementDb:-}" ] ||
   [ -z "${ConnectionStrings__ClinicalDb:-}" ] ||
   [ -z "${ConnectionStrings__BillingDb:-}" ]; then

    if [ -z "${HMS_POSTGRES_PASSWORD:-}" ]; then
        err "Database password is not configured. Set HMS_POSTGRES_PASSWORD in hms.local.sh, or set the ConnectionStrings__* environment variables."
        exit 1
    fi

    export ConnectionStrings__IdentityDb="Host=$HMS_POSTGRES_HOST;Port=$HMS_POSTGRES_PORT;Database=hms_identity_db;Username=$HMS_POSTGRES_USER;Password=$HMS_POSTGRES_PASSWORD"
    export ConnectionStrings__PatientManagementDb="Host=$HMS_POSTGRES_HOST;Port=$HMS_POSTGRES_PORT;Database=hms_patient_management_db;Username=$HMS_POSTGRES_USER;Password=$HMS_POSTGRES_PASSWORD"
    export ConnectionStrings__ClinicalDb="Host=$HMS_POSTGRES_HOST;Port=$HMS_POSTGRES_PORT;Database=hms_clinical_db;Username=$HMS_POSTGRES_USER;Password=$HMS_POSTGRES_PASSWORD"
    export ConnectionStrings__BillingDb="Host=$HMS_POSTGRES_HOST;Port=$HMS_POSTGRES_PORT;Database=hms_billing_db;Username=$HMS_POSTGRES_USER;Password=$HMS_POSTGRES_PASSWORD"
fi

export Database__ResetLegacySchemaOnStartup="${Database__ResetLegacySchemaOnStartup:-true}"
export Email__ExposeLocalSetupLinks="true"

# ---------------------------------------------------------------------------
# Ensure databases exist (matches start-hms.sh; skipped when psql is missing)
# ---------------------------------------------------------------------------
info "Ensuring PostgreSQL databases exist..."
create_database "hms_identity_db"
create_database "hms_patient_management_db"
create_database "hms_clinical_db"
create_database "hms_billing_db"

# ---------------------------------------------------------------------------
# Build backend
# ---------------------------------------------------------------------------
if [ "$SKIP_BUILD" = "true" ]; then
    info "Skipping backend build (-SkipBuild)."
else
    info "Restoring .NET packages..."
    (cd "$BACKEND" && dotnet restore HMS.sln --configfile NuGet.Config -p:NuGetAudit=false)
    info "Building .NET solution..."
    (cd "$BACKEND" && dotnet build HMS.sln --no-restore -p:NuGetAudit=false)
    ok "Backend build complete."
fi

# ---------------------------------------------------------------------------
# Run each service once (migrate + seed), wait for health, then stop it
# ---------------------------------------------------------------------------
SERVICES=(
    "Identity/Admin|src/Services/Identity/HMS.Identity.Api/HMS.Identity.Api.csproj|http://localhost:5501"
    "Patient Management|src/Services/Patients/HMS.Patients.Api/HMS.Patients.Api.csproj|http://localhost:5502"
    "Clinical|src/Services/Clinical/HMS.Clinical.Api/HMS.Clinical.Api.csproj|http://localhost:5504"
    "Billing|src/Services/Billing/HMS.Billing.Api/HMS.Billing.Api.csproj|http://localhost:5505"
)

for entry in "${SERVICES[@]}"; do
    IFS='|' read -r NAME PROJECT URL <<< "$entry"
    SAFE_NAME=$(printf '%s' "$NAME" | tr -c 'A-Za-z0-9' '-')
    PORT=$(printf '%s' "$URL" | sed -E 's|.*:([0-9]+)$|\1|')
    OUT="$LOG_DIR/seed-$SAFE_NAME.out.log"
    ERR="$LOG_DIR/seed-$SAFE_NAME.err.log"
    rm -f "$OUT" "$ERR"

    info "Migrating and seeding $NAME..."
    CURRENT_PORT="$PORT"
    cd "$BACKEND"
    dotnet run --project "$PROJECT" --no-build --urls "$URL" > "$OUT" 2> "$ERR" &
    PID=$!
    cd "$ROOT"
    CURRENT_PID="$PID"

    if ! wait_health "$NAME" "$URL/health" "$PID" "$TIMEOUT_SECONDS" "$ERR"; then
        stop_service "$PORT" "$PID"
        exit 1
    fi
    ok "$NAME database migrated and seeded."
    stop_service "$PORT" "$PID"
    CURRENT_PID=""
    CURRENT_PORT=""
done

# ---------------------------------------------------------------------------
# Done
# ---------------------------------------------------------------------------
echo ""
echo "HMS database seed completed successfully."
echo ""
echo "Databases prepared:"
echo "  - hms_identity_db"
echo "  - hms_patient_management_db"
echo "  - hms_clinical_db"
echo "  - hms_billing_db"
echo ""
echo "Seed login users use the password from Seed__DefaultPassword in hms.local.sh."
echo "Example users:"
echo "  - admin@hms.local"
echo "  - doctor@hms.local"
echo "  - receptionist@hms.local"
echo "  - nurse@hms.local"
echo "  - pharmacist@hms.local"
echo "  - lab@hms.local"
echo "  - accountant@hms.local"
