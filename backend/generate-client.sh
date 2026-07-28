#!/usr/bin/env bash
set -euo pipefail

# Generates TypeScript API client from running backend OpenAPI specs.
# Prerequisites: 
#   - dotnet tool install --global NSwag.ConsoleCore
#   - Backend services running (e.g., docker compose up -d)
#
# Usage: ./generate-client.sh [gateway-url]
#   gateway-url defaults to http://localhost:5200

GATEWAY_URL="${1:-http://localhost:5200}"

echo "Fetching OpenAPI spec from ${GATEWAY_URL}/openapi/v1.json..."
curl -s "${GATEWAY_URL}/openapi/v1.json" -o /tmp/hms-openapi.json

echo "Generating TypeScript client..."
nswag run nswag.json /variables:swaggerUrl=/tmp/hms-openapi.json

echo "Done. Generated TypeScript client at ../newfrontend/src/app/core/models/generated.ts"
