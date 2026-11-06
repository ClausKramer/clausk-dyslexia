#!/usr/bin/env bash
# Engangsopsætning: giver GitHub Actions lov til at deploye til ressourcegruppen via OIDC (ingen gemte nøgler).
# Opretter en user-assigned managed identity, en federated credential for GitHub og Contributor-rolle på ressourcegruppen.
# Kræver: az CLI logget ind (az login) med rettigheder til at tildele roller i ressourcegruppen.
# Valgfrit: gh CLI logget ind, så secrets sættes automatisk i repoet.
set -euo pipefail

RG="${RG:-rg-clausk-dyslexia}"
REPO="${REPO:-ClausKramer/ClausK-dyslexia}"
ID_NAME="${ID_NAME:-id-clausk-dyslexia-github}"
BRANCH="${BRANCH:-main}"

SUB=$(az account show --query id -o tsv)
TENANT=$(az account show --query tenantId -o tsv)
LOC=$(az group show -n "$RG" --query location -o tsv)
echo "Abonnement: $SUB  Ressourcegruppe: $RG ($LOC)"

echo "→ Opretter managed identity $ID_NAME"
az identity create -g "$RG" -n "$ID_NAME" -l "$LOC" -o none
CLIENT_ID=$(az identity show -g "$RG" -n "$ID_NAME" --query clientId -o tsv)
PRINCIPAL_ID=$(az identity show -g "$RG" -n "$ID_NAME" --query principalId -o tsv)

echo "→ Giver Contributor på ressourcegruppen"
az role assignment create \
  --assignee-object-id "$PRINCIPAL_ID" --assignee-principal-type ServicePrincipal \
  --role Contributor --scope "/subscriptions/$SUB/resourceGroups/$RG" -o none

echo "→ Federated credential for GitHub ($REPO, branch $BRANCH)"
az identity federated-credential create -g "$RG" --identity-name "$ID_NAME" -n "github-$BRANCH" \
  --issuer https://token.actions.githubusercontent.com \
  --subject "repo:$REPO:ref:refs/heads/$BRANCH" \
  --audiences api://AzureADTokenExchange -o none

echo
echo "Sæt disse secrets i GitHub-repoet (Settings → Secrets and variables → Actions):"
echo "  AZURE_CLIENT_ID=$CLIENT_ID"
echo "  AZURE_TENANT_ID=$TENANT"
echo "  AZURE_SUBSCRIPTION_ID=$SUB"

if command -v gh >/dev/null 2>&1 && gh auth status >/dev/null 2>&1; then
  echo "→ gh CLI fundet – sætter secrets automatisk"
  gh secret set AZURE_CLIENT_ID -R "$REPO" -b "$CLIENT_ID"
  gh secret set AZURE_TENANT_ID -R "$REPO" -b "$TENANT"
  gh secret set AZURE_SUBSCRIPTION_ID -R "$REPO" -b "$SUB"
  echo "Secrets sat. Push til $BRANCH (eller kør workflowen manuelt) for at deploye."
fi
