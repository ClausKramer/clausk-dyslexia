<#
.SYNOPSIS
  Manuelt deploy fra din egen maskine: infrastruktur (Bicep) + upload af spillet til Static Web App.
.DESCRIPTION
  Kræver: Azure CLI (az) logget ind og Node.js. SWA CLI hentes automatisk via npx.
.EXAMPLE
  az login
  .\scripts\deploy.ps1
#>
param(
  [string]$ResourceGroup = 'rg-clausk-dyslexia',
  [string]$SwaName = 'swa-clausk-dyslexia'
)
$ErrorActionPreference = 'Stop'
Set-Location (Join-Path $PSScriptRoot '..')

function Invoke-Az {
  param([Parameter(ValueFromRemainingArguments = $true)][string[]]$Args)
  $out = & az @Args
  if ($LASTEXITCODE -ne 0) { throw "az $($Args -join ' ') fejlede" }
  return $out
}

Write-Host "-> Infrastruktur (Bicep) i $ResourceGroup"
Invoke-Az deployment group create -g $ResourceGroup -f infra/main.bicep -p infra/main.bicepparam -p "name=$SwaName" -o none | Out-Null

Write-Host '-> Bygger dist/'
node scripts/build.js
if ($LASTEXITCODE -ne 0) { throw 'Build fejlede' }

Write-Host '-> Henter deployment-token og uploader'
$token = Invoke-Az staticwebapp secrets list -n $SwaName -g $ResourceGroup --query properties.apiKey -o tsv
npx --yes @azure/static-web-apps-cli@2 deploy ./dist --deployment-token $token --env production
if ($LASTEXITCODE -ne 0) { throw 'Upload fejlede' }

$hostname = Invoke-Az staticwebapp show -n $SwaName -g $ResourceGroup --query defaultHostname -o tsv
Write-Host ''
Write-Host "Lydøen kører på https://$hostname"
