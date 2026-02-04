param location string = 'eastus2'
param environment string = 'prod'
param projectName string = 'blotz-task-al'
param keyVaultName string
param foundryProjectName string

param openAiDeploymentName string = 'gpt-5.2-chat'
param openAiModelName string = 'gpt-5.2-chat'
param openAiModelVersion string = '2025-12-11'

var deploymentModel = {
  format: 'OpenAI'
  name: openAiModelName
  version: openAiModelVersion
}

resource openAiService 'Microsoft.CognitiveServices/accounts@2025-06-01' = {
  name: 'oai-${projectName}-${environment}'
  location: location
  identity: {
    type: 'SystemAssigned'
  }
  sku: {
    name: 'S0' 
  }
  kind: 'AIServices'
  properties: {
    customSubDomainName: '${projectName}-${environment}'
    allowProjectManagement: true
    disableLocalAuth: false
    publicNetworkAccess: 'Enabled'
  }
}

resource foundryProject 'Microsoft.CognitiveServices/accounts/projects@2025-06-01' = {
  parent: openAiService
  name: foundryProjectName
  location: location
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    displayName: foundryProjectName
  }
}

resource modelDeployment 'Microsoft.CognitiveServices/accounts/deployments@2025-06-01' = {
  name: openAiDeploymentName
  parent: openAiService
  sku: {
    name: 'GlobalStandard'  
    capacity: 10 
  }
  properties: {
    model: deploymentModel
    raiPolicyName: 'Microsoft.Default'
    versionUpgradeOption: 'OnceNewDefaultVersionAvailable'
  }
}

module storeOpenAiKey 'keyVaultSecret.bicep' = {
  name: '${deployment().name}-store-openai-key'
  params: {
    keyVaultName: keyVaultName
    secretName: 'azureopenai-apikey'
    secretValue: openAiService.listKeys().key1
  }
}

output endpoint string = openAiService.properties.endpoint
output deploymentId string = openAiDeploymentName
output foundryProjectId string = foundryProject.id
