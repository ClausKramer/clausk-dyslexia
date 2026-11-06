<#
.SYNOPSIS
  Engangsopsætning: giver GitHub Actions lov til at deploye til ressourcegruppen via OIDC (ingen gemte nøgler).
.DESCRIPTION
  Opretter en user-assigned managed identity, en federated credential for GitHub og Contributor-rolle på ressourcegruppen.
  Kræver: Azure CLI (az) logget ind med rettigheder til at tildele roller i ressourcegruppen.
  Valgfrit: GitHub CLI (gh) logget ind, så secrets sættes automatisk i repoet.
.EXAMPLE
  az login
  .\scripts\azure-setup.ps1
#>
param(
  [string]$ResourceGroup = 'rg-clausk-dyslexia',
  [string]$Repo = 'ClausKramer/clausk-dyslexia',   # ejer/navn, præcis som på GitHub
  [string]$IdentityName = 'id-clausk-dyslexia-github',
  [string]$Branch = 'main'
)
$ErrorActionPreference = 'Stop'
if ($Repo -notmatch '^[^/\s]+/[^/\s]+$') { throw "Repo skal angives som ejer/navn, fx ClausKramer/clausk-dyslexia (fik '$Repo')" }

# Simpel funktion med $args (ikke [Parameter]), så az-flag som -o og -g ikke kolliderer med PowerShells egne parametre.
function Invoke-Az {
  $out = & az @args
  if ($LASTEXITCODE -ne 0) { throw "az $($args -join ' ') fejlede" }
  return $out
}

$sub = Invoke-Az account show --query id -o tsv
$tenant = Invoke-Az account show --query tenantId -o tsv
$loc = Invoke-Az group show -n $ResourceGroup --query location -o tsv
Write-Host "Abonnement: $sub  Ressourcegruppe: $ResourceGroup ($loc)"

Write-Host "-> Opretter managed identity $IdentityName"
Invoke-Az identity create -g $ResourceGroup -n $IdentityName -l $loc -o none | Out-Null
$clientId = Invoke-Az identity show -g $ResourceGroup -n $IdentityName --query clientId -o tsv
$principalId = Invoke-Az identity show -g $ResourceGroup -n $IdentityName --query principalId -o tsv

Write-Host '-> Giver Contributor på ressourcegruppen'
Invoke-Az role assignment create `
  --assignee-object-id $principalId --assignee-principal-type ServicePrincipal `
  --role Contributor --scope "/subscriptions/$sub/resourceGroups/$ResourceGroup" -o none | Out-Null

# GitHub sender forskelligt "subject" alt efter, om jobbet bruger et environment eller ej:
#   uden environment:  repo:EJER/NAVN:ref:refs/heads/main
#   med environment:   repo:EJER/NAVN:environment:production   (deploy-jobbet i workflowen bruger dette)
# Vi opretter begge. create/update så scriptet kan køres igen uden fejl.
function Set-FederatedCredential([string]$Name, [string]$Subject) {
  Write-Host "-> Federated credential $Name ($Subject)"
  $common = @('-g', $ResourceGroup, '--identity-name', $IdentityName, '-n', $Name,
              '--issuer', 'https://token.actions.githubusercontent.com', '--subject', $Subject,
              '--audiences', 'api://AzureADTokenExchange', '-o', 'none')
  $existing = Invoke-Az identity federated-credential list -g $ResourceGroup --identity-name $IdentityName --query "[?name=='$Name'].name" -o tsv
  if ($existing) { Invoke-Az identity federated-credential update @common | Out-Null }
  else { Invoke-Az identity federated-credential create @common | Out-Null }
}
Set-FederatedCredential -Name "github-$Branch" -Subject "repo:${Repo}:ref:refs/heads/$Branch"
Set-FederatedCredential -Name 'github-env-production' -Subject "repo:${Repo}:environment:production"

Write-Host ''
Write-Host 'Sæt disse secrets i GitHub-repoet (Settings -> Secrets and variables -> Actions):'
Write-Host "  AZURE_CLIENT_ID=$clientId"
Write-Host "  AZURE_TENANT_ID=$tenant"
Write-Host "  AZURE_SUBSCRIPTION_ID=$sub"
Write-Host "Bemærk: identiteten er en managed identity og ses ikke under 'App registrations' i portalen, men under 'Managed Identities'."

$gh = Get-Command gh -ErrorAction SilentlyContinue
if ($gh) {
  & gh auth status *> $null
  if ($LASTEXITCODE -eq 0) {
    Write-Host '-> gh CLI fundet - sætter secrets automatisk'
    gh secret set AZURE_CLIENT_ID -R $Repo -b $clientId
    if ($LASTEXITCODE -ne 0) { throw 'gh secret set fejlede - sæt secrets manuelt i GitHub' }
    gh secret set AZURE_TENANT_ID -R $Repo -b $tenant
    if ($LASTEXITCODE -ne 0) { throw 'gh secret set fejlede - sæt secrets manuelt i GitHub' }
    gh secret set AZURE_SUBSCRIPTION_ID -R $Repo -b $sub
    if ($LASTEXITCODE -ne 0) { throw 'gh secret set fejlede - sæt secrets manuelt i GitHub' }
    Write-Host "Secrets sat. Push til $Branch (eller kør workflowen manuelt) for at deploye."
  }
}
