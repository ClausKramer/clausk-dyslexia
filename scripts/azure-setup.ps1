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
  [string]$Repo = 'ClausKramer/ClausK-dyslexia',
  [string]$IdentityName = 'id-clausk-dyslexia-github',
  [string]$Branch = 'main'
)
$ErrorActionPreference = 'Stop'

function Invoke-Az {
  param([Parameter(ValueFromRemainingArguments = $true)][string[]]$Args)
  $out = & az @Args
  if ($LASTEXITCODE -ne 0) { throw "az $($Args -join ' ') fejlede" }
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

Write-Host "-> Federated credential for GitHub ($Repo, branch $Branch)"
Invoke-Az identity federated-credential create -g $ResourceGroup --identity-name $IdentityName -n "github-$Branch" `
  --issuer https://token.actions.githubusercontent.com `
  --subject "repo:${Repo}:ref:refs/heads/$Branch" `
  --audiences api://AzureADTokenExchange -o none | Out-Null

Write-Host ''
Write-Host 'Sæt disse secrets i GitHub-repoet (Settings -> Secrets and variables -> Actions):'
Write-Host "  AZURE_CLIENT_ID=$clientId"
Write-Host "  AZURE_TENANT_ID=$tenant"
Write-Host "  AZURE_SUBSCRIPTION_ID=$sub"

$gh = Get-Command gh -ErrorAction SilentlyContinue
if ($gh) {
  & gh auth status *> $null
  if ($LASTEXITCODE -eq 0) {
    Write-Host '-> gh CLI fundet - sætter secrets automatisk'
    gh secret set AZURE_CLIENT_ID -R $Repo -b $clientId
    gh secret set AZURE_TENANT_ID -R $Repo -b $tenant
    gh secret set AZURE_SUBSCRIPTION_ID -R $Repo -b $sub
    Write-Host "Secrets sat. Push til $Branch (eller kør workflowen manuelt) for at deploye."
  }
}
