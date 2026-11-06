// Infrastruktur til Lydøen: én Azure Static Web App (gratis SKU) i ressourcegruppen.
// Deploy:  az deployment group create -g rg-clausk-dyslexia -f infra/main.bicep -p infra/main.bicepparam
targetScope = 'resourceGroup'

@description('Navn på Static Web App-ressourcen.')
@minLength(2)
@maxLength(40)
param name string = 'swa-clausk-dyslexia'

@description('Region. Static Web Apps kan kun oprettes i få regioner; westeurope er tættest på Danmark. Selve indholdet serveres globalt via CDN.')
@allowed([
  'westeurope'
  'centralus'
  'eastus2'
  'westus2'
  'eastasia'
])
param location string = 'westeurope'

@description('Free er rigeligt til et privat spil (100 GB trafik/md., 2 brugerdefinerede domæner). Standard giver SLA og flere domæner.')
@allowed([
  'Free'
  'Standard'
])
param sku string = 'Free'

@description('Valgfrit brugerdefineret domæne, fx lydoen.simplitize.dk. Kræver en CNAME-post hos DNS-udbyderen, der peger på standard-hostnavnet. Tom streng = intet domæne.')
param customDomain string = ''

@description('Tags på ressourcen.')
param tags object = {
  projekt: 'lydoen'
  miljoe: 'prod'
  styretAf: 'bicep'
}

resource swa 'Microsoft.Web/staticSites@2023-12-01' = {
  name: name
  location: location
  tags: tags
  sku: {
    name: sku
    tier: sku
  }
  properties: {
    // Indholdet uploades af GitHub Actions / SWA CLI med et deployment-token, ikke via kobling til repoet.
    stagingEnvironmentPolicy: 'Enabled'
    allowConfigFileUpdates: true
    enterpriseGradeCdnStatus: 'Disabled'
  }
}

resource domain 'Microsoft.Web/staticSites/customDomains@2023-12-01' = if (!empty(customDomain)) {
  parent: swa
  name: customDomain
  properties: {
    validationMethod: 'cname-delegation'
  }
}

@description('Standard-hostnavn, fx xxx.azurestaticapps.net.')
output hostname string = swa.properties.defaultHostname
@description('Adressen spillet kan åbnes på.')
output url string = 'https://${swa.properties.defaultHostname}'
output staticWebAppName string = swa.name
output resourceId string = swa.id
