#!/usr/bin/env bash
# Engangsopsætning: giver GitHub Actions lov til at deploye til ressourcegruppen via OIDC (ingen gemte nøgler).
# Opretter en user-assigned managed identity, en federated credential for GitHub og Contributor-rolle på ressourcegruppen.
# Kræver: az CLI logget ind (az login) med rettigheder til at tildele roller i ressourcegruppen.
# Valgfrit: gh CLI logget ind, så secrets sættes automatisk i repoet.
set -euo pipefail

RG="${RG:-rg-clausk-dyslexia}"
REPO="${REPO:-ClausKramer/clausk-dyslexia}"   # ejer/navn, præcis som på GitHub
ID_NAME="${ID_NAME:-id-clausk-dyslexia-github}"
BRANCH="${BRANCH:-main}"
[[ "$REPO" == */* ]] || { echo "REPO skal være ejer/navn, fx ClausKramer/clausk-dyslexia (fik '$REPO')" >&2; exit 1; }

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

# GitHub sender forskelligt "subject" alt efter, om jobbet bruger et environment eller ej:
#   uden environment:  repo:EJER/NAVN:ref:refs/heads/main
#   med environment:   repo:EJER/NAVN:environment:production   (deploy-jobbet i workflowen bruger dette)
set_fc() {
  local name=$1 subject=$2 op=create
  [[ -n "$(az identity federated-credential list -g "$RG" --identity-name "$ID_NAME" --query "[?name=='$name'].name" -o tsv)" ]] && op=update
  echo "→ Federated credential $name ($subject)"
  az identity federated-credential $op -g "$RG" --identity-name "$ID_NAME" -n "$name" \
    --issuer https://token.actions.githubusercontent.com --subject "$subject" \
    --audiences api://AzureADTokenExchange -o none
}
# Nyere GitHub-tokens har ejer- og repo-id i subjectet: repo:EJER@ejerId/NAVN@repoId:... – vi slår id'erne op og opretter begge formater.
if command -v gh >/dev/null 2>&1 && gh auth status >/dev/null 2>&1; then INFO=$(gh api "repos/$REPO"); else INFO=$(curl -fsSL "https://api.github.com/repos/$REPO"); fi
FULL=$(printf '%s' "$INFO" | node -e 'const d=JSON.parse(require("fs").readFileSync(0,"utf8"));console.log(d.full_name)')
WITH_IDS=$(printf '%s' "$INFO" | node -e 'const d=JSON.parse(require("fs").readFileSync(0,"utf8"));console.log(`${d.owner.login}@${d.owner.id}/${d.name}@${d.id}`)')
echo "GitHub-repo: $FULL (id-format: $WITH_IDS)"
set_fc "github-$BRANCH" "repo:$FULL:ref:refs/heads/$BRANCH"
set_fc "github-env-production" "repo:$FULL:environment:production"
set_fc "github-$BRANCH-id" "repo:$WITH_IDS:ref:refs/heads/$BRANCH"
set_fc "github-env-production-id" "repo:$WITH_IDS:environment:production"

echo
echo "Sæt disse secrets i GitHub-repoet (Settings → Secrets and variables → Actions):"
echo "  AZURE_CLIENT_ID=$CLIENT_ID"
echo "  AZURE_TENANT_ID=$TENANT"
echo "  AZURE_SUBSCRIPTION_ID=$SUB"
echo "Bemærk: identiteten er en managed identity og ses ikke under 'App registrations' i portalen, men under 'Managed Identities'."

if command -v gh >/dev/null 2>&1 && gh auth status >/dev/null 2>&1; then
  echo "→ gh CLI fundet – sætter secrets automatisk"
  gh secret set AZURE_CLIENT_ID -R "$REPO" -b "$CLIENT_ID"
  gh secret set AZURE_TENANT_ID -R "$REPO" -b "$TENANT"
  gh secret set AZURE_SUBSCRIPTION_ID -R "$REPO" -b "$SUB"
  echo "Secrets sat. Push til $BRANCH (eller kør workflowen manuelt) for at deploye."
fi
