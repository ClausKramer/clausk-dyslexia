#!/usr/bin/env bash
# Manuelt deploy fra din egen maskine: infrastruktur (Bicep) + upload af spillet til Static Web App.
# Kræver: az CLI logget ind, Node.js. SWA CLI hentes automatisk via npx.
set -euo pipefail

RG="${RG:-rg-clausk-dyslexia}"
SWA_NAME="${SWA_NAME:-swa-clausk-dyslexia}"
cd "$(dirname "$0")/.."

echo "→ Infrastruktur (Bicep) i $RG"
az deployment group create -g "$RG" -f infra/main.bicep -p infra/main.bicepparam -p name="$SWA_NAME" -o none

echo "→ Bygger dist/"
node scripts/build.js

echo "→ Henter deployment-token og uploader"
TOKEN=$(az staticwebapp secrets list -n "$SWA_NAME" -g "$RG" --query properties.apiKey -o tsv)
npx --yes @azure/static-web-apps-cli@2 deploy ./dist --deployment-token "$TOKEN" --env production

URL=$(az staticwebapp show -n "$SWA_NAME" -g "$RG" --query defaultHostname -o tsv)
echo
echo "Lydøen kører på https://$URL"
