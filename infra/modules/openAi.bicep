param location string = resourceGroup().location
param environment string = 'prod'
param projectName string = 'blotz-task-al'
param keyVaultName string

resource openAiService 'Microsoft.CognitiveServices/accounts@2025-04-01-preview' = {
  name: 'oai-${projectName}-${environment}'
  location: location
  sku: {
    name: 'S0' 
  }
  kind: 'OpenAI'
  properties: {
    customSubDomainName: '${projectName}-${environment}'
    publicNetworkAccess: 'Enabled'
  }
}

resource gpt41MiniDeployment 'Microsoft.CognitiveServices/accounts/deployments@2025-04-01-preview' = {
  name: 'gpt-4.1-mini'  
  parent: openAiService
  sku: {
    name: 'GlobalStandard'  
    capacity: 1              
  }
  properties: {
    model: {
      format: 'OpenAI'
      name: 'gpt-4.1-mini'
      version: '2025-04-14'
    }
    raiPolicyName: 'Microsoft.Default'
    versionUpgradeOption: 'OnceNewDefaultVersionAvailable'
  }
}

module storeOpenAiKey 'keyVaultSecret.bicep' = {
  name: '${deployment().name}-store-openai-key'
  params: {
    keyVaultName: keyVaultName
    secretName: 'openai-api-key'
    secretValue: openAiService.listKeys().key1
  }
}
