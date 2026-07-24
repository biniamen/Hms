#!/usr/bin/env bash
# HMS Platform Startup Script
# Usage: ./start-hms.sh           (start)
#        ./start-hms.sh stop      (stop)
#        ./start-hms.sh restart   (restart)

set +e  # Don't exit on error — we handle errors gracefully

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND="$ROOT/backend"
FRONTEND="$ROOT/newfrontend"
LOG_DIR="$ROOT/.runtime-logs"
LOCAL_CONFIG="$ROOT/hms.local.sh"
PID_FILE="$LOG_DIR/.pids"
DOTNET_HOME="$BACKEND/.dotnet-home"
DOTNET_APPDATA="$BACKEND/.appdata"

# Set dotnet home to reduce memory issues with MSBuild nodes
export DOTNET_CLI_HOME="$DOTNET_HOME"
export APPDATA="$DOTNET_APPDATA"
export MSBUILDDISABLENODEREUSE=1

mkdir -p "$DOTNET_HOME" "$DOTNET_APPDATA"

# ---------------------------------------------------------------------------
# Helper functions
# ---------------------------------------------------------------------------
info()  { printf "\033[36m[INFO]\033[0m  %s\n" "$*"; }
warn()  { printf "\033[33m[WARN]\033[0m  %s\n" "$*"; }
err()   { printf "\033[31m[ERROR]\033[0m %s\n" "$*"; }
ok()    { printf "\033[32m[OK]\033[0m    %s\n" "$*"; }

cleanup() {
    info "Shutting down HMS services..."
    if [ -f "$PID_FILE" ]; then
        while IFS= read -r pid; do
            if kill -0 "$pid" 2>/dev/null; then
                kill "$pid" 2>/dev/null || true
                info "Stopped PID $pid"
            fi
        done < "$PID_FILE"
        rm -f "$PID_FILE"
    fi
    info "All services stopped."
    exit 0
}

create_database() {
    local db_name="$1"
    local exists
    exists=$(PGPASSWORD="$HMS_POSTGRES_PASSWORD" psql -h "$HMS_POSTGRES_HOST" -p "$HMS_POSTGRES_PORT" -U "$HMS_POSTGRES_USER" -tAc "SELECT 1 FROM pg_database WHERE datname='$db_name'" 2>/dev/null)
    if [ "$exists" != "1" ]; then
        info "Creating database: $db_name"
        PGPASSWORD="$HMS_POSTGRES_PASSWORD" psql -h "$HMS_POSTGRES_HOST" -p "$HMS_POSTGRES_PORT" -U "$HMS_POSTGRES_USER" -c "CREATE DATABASE \"$db_name\";" > /dev/null 2>&1
        ok "Database $db_name created."
    else
        ok "Database $db_name already exists."
    fi
}

start_service() {
    local name="$1"
    local project_dir="$2"
    local port="$3"
    local out_log="$LOG_DIR/${name}.out.log"
    local err_log="$LOG_DIR/${name}.err.log"

    info "Starting $name on port $port ..."
    # Use nohup and redirect to log files
    (cd "$project_dir" && nohup dotnet run --no-build --urls "http://localhost:$port" > "$out_log" 2> "$err_log" &)
    local pid=$!
    echo "$pid" >> "$PID_FILE"
    ok "$name started (PID $pid) — logs: $LOG_DIR/$name.*.log"
}

# ---------------------------------------------------------------------------
# Parse commands
# ---------------------------------------------------------------------------
case "${1:-start}" in
    stop)
        cleanup
        ;;
    restart)
        cleanup
        sleep 2
        exec "$0"
        ;;
    start|*)
        # Continue below
        ;;
esac

# ---------------------------------------------------------------------------
# Ensure log directory
# ---------------------------------------------------------------------------
mkdir -p "$LOG_DIR"
> "$PID_FILE"

# ---------------------------------------------------------------------------
# Source local config (if it exists)
# ---------------------------------------------------------------------------
if [ -f "$LOCAL_CONFIG" ]; then
    source "$LOCAL_CONFIG"
    info "Loaded configuration from $LOCAL_CONFIG"
else
    warn "No $LOCAL_CONFIG found. Copy hms.local.example.ps1 to hms.local.sh and fill in your credentials."
    # Try reading from deploy/.env for Docker users who already set it
    if [ -f "$ROOT/deploy/.env" ]; then
        warn "Falling back to deploy/.env for PostgreSQL credentials..."
        export HMS_POSTGRES_PASSWORD=$(grep '^HMS_POSTGRES_PASSWORD=' "$ROOT/deploy/.env" 2>/dev/null | head -1 | cut -d= -f2-)
        export HMS_POSTGRES_USER=$(grep '^HMS_POSTGRES_USER=' "$ROOT/deploy/.env" 2>/dev/null | head -1 | cut -d= -f2- || echo "postgres")
        export HMS_POSTGRES_HOST="${HMS_POSTGRES_HOST:-localhost}"
        export HMS_POSTGRES_PORT="${HMS_POSTGRES_PORT:-5432}"
    fi
fi

# ---------------------------------------------------------------------------
# Defaults and secrets
# ---------------------------------------------------------------------------
HMS_POSTGRES_HOST="${HMS_POSTGRES_HOST:-localhost}"
HMS_POSTGRES_PORT="${HMS_POSTGRES_PORT:-5432}"
HMS_POSTGRES_USER="${HMS_POSTGRES_USER:-postgres}"

# Generate a JWT signing key if not provided
if [ -z "${Security__Jwt__SigningKey:-}" ]; then
    Security__Jwt__SigningKey=$(openssl rand -base64 48 | tr -d '\n')
    warn "Security__Jwt__SigningKey was not configured. Generated a temporary key for this run."
fi

# Generate a default seed password if not provided
if [ -z "${Seed__DefaultPassword:-}" ]; then
    Seed__DefaultPassword="Hms-$(openssl rand -hex 6)-A1"
    warn "Seed__DefaultPassword was not configured. Temporary development password: $Seed__DefaultPassword"
fi

export Security__Jwt__SigningKey
export Seed__DefaultPassword

# ---------------------------------------------------------------------------
# Validate PostgreSQL password
# ---------------------------------------------------------------------------
if [ -z "${HMS_POSTGRES_PASSWORD:-}" ]; then
    err "PostgreSQL password is not configured."
    err "Copy hms.local.example.ps1 to hms.local.sh and set HMS_POSTGRES_PASSWORD."
    exit 1
fi

# ---------------------------------------------------------------------------
# Connection strings
# ---------------------------------------------------------------------------
export ConnectionStrings__IdentityDb="${ConnectionStrings__IdentityDb:-Host=$HMS_POSTGRES_HOST;Port=$HMS_POSTGRES_PORT;Database=hms_identity_db;Username=$HMS_POSTGRES_USER;Password=$HMS_POSTGRES_PASSWORD}"
export ConnectionStrings__PatientManagementDb="${ConnectionStrings__PatientManagementDb:-Host=$HMS_POSTGRES_HOST;Port=$HMS_POSTGRES_PORT;Database=hms_patient_management_db;Username=$HMS_POSTGRES_USER;Password=$HMS_POSTGRES_PASSWORD}"
export ConnectionStrings__ClinicalDb="${ConnectionStrings__ClinicalDb:-Host=$HMS_POSTGRES_HOST;Port=$HMS_POSTGRES_PORT;Database=hms_clinical_db;Username=$HMS_POSTGRES_USER;Password=$HMS_POSTGRES_PASSWORD}"
export ConnectionStrings__BillingDb="${ConnectionStrings__BillingDb:-Host=$HMS_POSTGRES_HOST;Port=$HMS_POSTGRES_PORT;Database=hms_billing_db;Username=$HMS_POSTGRES_USER;Password=$HMS_POSTGRES_PASSWORD}"

# Optional RabbitMQ
if [ -n "${HMS_RABBITMQ_HOST:-}" ]; then
    export RabbitMq__HostName="$HMS_RABBITMQ_HOST"
    export RabbitMq__Port="${HMS_RABBITMQ_PORT:-5672}"
    export RabbitMq__Username="$HMS_RABBITMQ_USERNAME"
    export RabbitMq__Password="$HMS_RABBITMQ_PASSWORD"
    info "RabbitMQ configured at $HMS_RABBITMQ_HOST:$HMS_RABBITMQ_PORT"
fi

# Optional SMTP (default to expose local setup links)
export Email__FromName="${Email__FromName:-HMS Platform}"
export Email__Smtp__Host="${Email__Smtp__Host:-smtp.gmail.com}"
export Email__Smtp__Port="${Email__Smtp__Port:-587}"
export Email__Smtp__EnableSsl="${Email__Smtp__EnableSsl:-true}"
export Email__ExposeLocalSetupLinks="${Email__ExposeLocalSetupLinks:-true}"

if [ -n "${Email__Smtp__Password:-}" ]; then
    Email__Smtp__Password="${Email__Smtp__Password// /}"
    if [ -z "${Email__FromAddress:-}" ] && [ -n "${Email__Smtp__Username:-}" ]; then
        export Email__FromAddress="$Email__Smtp__Username"
    fi
    info "SMTP email configured for ${Email__Smtp__Username:-}"
else
    export Email__ExposeLocalSetupLinks="true"
    warn "SMTP not configured. Local setup links will appear in the Email Outbox."
fi

export ASPNETCORE_ENVIRONMENT="${ASPNETCORE_ENVIRONMENT:-Development}"

# ---------------------------------------------------------------------------
# Trap Ctrl+C and cleanup
# ---------------------------------------------------------------------------
trap cleanup SIGINT SIGTERM

# ---------------------------------------------------------------------------
# Create databases if they don't exist
# ---------------------------------------------------------------------------
info "Ensuring PostgreSQL databases exist..."
create_database "hms_identity_db"
create_database "hms_patient_management_db"
create_database "hms_clinical_db"
create_database "hms_billing_db"

# ---------------------------------------------------------------------------
# Build backend
# ---------------------------------------------------------------------------
info "Restoring .NET packages..."
cd "$BACKEND"
dotnet restore HMS.sln --configfile NuGet.Config

info "Building .NET solution..."
dotnet build HMS.sln --no-restore
ok "Backend build complete."

cd "$ROOT"

# ---------------------------------------------------------------------------
# Install frontend packages if needed
# ---------------------------------------------------------------------------
if [ ! -d "$FRONTEND/node_modules" ]; then
    info "Installing frontend packages (npm install)..."
    cd "$FRONTEND"
    npm install --cache .npm-cache
    cd "$ROOT"
    ok "Frontend packages installed."
else
    ok "Frontend packages already installed."
fi

# ---------------------------------------------------------------------------
# Start backend services
# ---------------------------------------------------------------------------
info "Starting all backend services..."

start_service "identity"   "$BACKEND/src/Services/Identity/HMS.Identity.Api"   5101
start_service "patients"   "$BACKEND/src/Services/Patients/HMS.Patients.Api"   5102
start_service "clinical"   "$BACKEND/src/Services/Clinical/HMS.Clinical.Api"   5104
start_service "billing"    "$BACKEND/src/Services/Billing/HMS.Billing.Api"     5105
start_service "gateway"    "$BACKEND/src/ApiGateway/HMS.ApiGateway"            5200

# ---------------------------------------------------------------------------
# Start Angular frontend
# ---------------------------------------------------------------------------
info "Starting Angular frontend on port 4200..."
cd "$FRONTEND"
nohup npx ng serve --host 0.0.0.0 --port 4200 > "$LOG_DIR/frontend.out.log" 2> "$LOG_DIR/frontend.err.log" &
pid=$!
echo "$pid" >> "$PID_FILE"
cd "$ROOT"
ok "Angular started (PID $pid)"

# ---------------------------------------------------------------------------
# Done
# ---------------------------------------------------------------------------
echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║           HMS Platform is starting up!                      ║"
echo "╠══════════════════════════════════════════════════════════════╣"
echo "║  Frontend:    http://localhost:4200                          ║"
echo "║  API Gateway: http://localhost:5200                          ║"
echo "║                                                              ║"
echo "║  Logs:       $LOG_DIR                        ║"
echo "║                                                              ║"
echo "║  Wait 60-90 seconds for Angular to compile, then open        ║"
echo "║  http://localhost:4200 in your browser.                      ║"
echo "║                                                              ║"
echo "║  To stop:  ./start-hms.sh stop                               ║"
echo "║                                                              ║"
echo "║  Seed admin: admin@hms.local                                 ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Wait briefly to make sure no immediate startup errors
sleep 3

# Check that services are running (not crashed immediately)
if [ -f "$PID_FILE" ]; then
    alive=0
    while IFS= read -r pid; do
        if kill -0 "$pid" 2>/dev/null; then
            alive=$((alive + 1))
        fi
    done < "$PID_FILE"
    info "$alive process(es) running."
fi

# Wait forever (or until Ctrl+C)
wait
