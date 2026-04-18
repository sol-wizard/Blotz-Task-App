param location string = 'eastus2'
param environment string = 'prod'
param projectName string = 'blotz-task-al'
param keyVaultName string
param foundryProjectName string

param breakdownDeploymentName string
param breakdownModelName string
param breakdownModelVersion string

param taskGenerationDeploymentName string
param taskGenerationModelName string
param taskGenerationModelVersion string

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

resource breakdownDeployment 'Microsoft.CognitiveServices/accounts/deployments@2025-06-01' = {
  name: breakdownDeploymentName
  parent: openAiService
  sku: {
    name: 'GlobalStandard'
    capacity: 10
  }
  properties: {
    model: {
      format: 'OpenAI'
      name: breakdownModelName
      version: breakdownModelVersion
    }
    raiPolicyName: 'Microsoft.Default'
    versionUpgradeOption: 'OnceNewDefaultVersionAvailable'
  }
}

resource taskGenerationDeployment 'Microsoft.CognitiveServices/accounts/deployments@2025-06-01' = {
  name: taskGenerationDeploymentName
  parent: openAiService
  dependsOn: [breakdownDeployment]
  sku: {
    name: 'GlobalStandard'
    capacity: 10
  }
  properties: {
    model: {
      format: 'OpenAI'
      name: taskGenerationModelName
      version: taskGenerationModelVersion
    }
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
output taskGenerationDeploymentId string = taskGenerationDeploymentName
output breakdownDeploymentId string = breakdownDeploymentName
output foundryProjectId string = foundryProject.id
