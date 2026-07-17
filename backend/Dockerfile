# =============================================================================
# Stage 1: Restore — cache NuGet packages
# =============================================================================
FROM mcr.microsoft.com/dotnet/sdk:9.0-alpine AS restore
WORKDIR /src

# Copy project files for dependency resolution
COPY NuGet.Config ./
COPY src/BuildingBlocks/HMS.Contracts/HMS.Contracts.csproj src/BuildingBlocks/HMS.Contracts/
COPY src/BuildingBlocks/HMS.SharedKernel/HMS.SharedKernel.csproj src/BuildingBlocks/HMS.SharedKernel/
COPY src/Services/Identity/HMS.Identity.Infrastructure/HMS.Identity.Infrastructure.csproj src/Services/Identity/HMS.Identity.Infrastructure/
COPY src/Services/Identity/HMS.Identity.Api/HMS.Identity.Api.csproj src/Services/Identity/HMS.Identity.Api/
COPY src/Services/Patients/HMS.Patients.Infrastructure/HMS.Patients.Infrastructure.csproj src/Services/Patients/HMS.Patients.Infrastructure/
COPY src/Services/Patients/HMS.Patients.Api/HMS.Patients.Api.csproj src/Services/Patients/HMS.Patients.Api/
COPY src/Services/Clinical/HMS.Clinical.Infrastructure/HMS.Clinical.Infrastructure.csproj src/Services/Clinical/HMS.Clinical.Infrastructure/
COPY src/Services/Clinical/HMS.Clinical.Api/HMS.Clinical.Api.csproj src/Services/Clinical/HMS.Clinical.Api/
COPY src/Services/Billing/HMS.Billing.Infrastructure/HMS.Billing.Infrastructure.csproj src/Services/Billing/HMS.Billing.Infrastructure/
COPY src/Services/Billing/HMS.Billing.Api/HMS.Billing.Api.csproj src/Services/Billing/HMS.Billing.Api/
COPY src/ApiGateway/HMS.ApiGateway/HMS.ApiGateway.csproj src/ApiGateway/HMS.ApiGateway/

# Restore all projects in one layer
RUN dotnet restore HMS.sln --configfile NuGet.Config

# =============================================================================
# Stage 2: Build — compile all projects
# =============================================================================
FROM restore AS build
WORKDIR /src

# Copy all source code
COPY . .

# Build and publish the requested service
ARG SERVICE_PROJECT
ARG SERVICE_DLL=HMS.Service.dll
RUN dotnet publish "$SERVICE_PROJECT" -c Release -o /app/publish --no-restore

# =============================================================================
# Stage 3: Runtime — minimal ASP.NET image
# =============================================================================
FROM mcr.microsoft.com/dotnet/aspnet:9.0-alpine AS runtime
WORKDIR /app

# Create non-root user for security
RUN addgroup -S hms && adduser -S hms -G hms
USER hms

# Default port (override via --urls or ASPNETCORE_URLS)
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=10s --retries=3 --start-period=15s \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

COPY --from=build --chown=hms:hms /app/publish .

ENTRYPOINT dotnet "/app/$SERVICE_DLL"
