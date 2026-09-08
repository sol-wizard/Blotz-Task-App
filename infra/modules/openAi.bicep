param location string = 'eastus2'
param environment string = 'prod'
param projectName string = 'blotz-task-al'
param keyVaultName string
param foundryProjectName string

// Both AI features (task generation and breakdown) currently run on this one deployment.
// If breakdown ever needs its own model, add a second deployment resource and point
// breakdownDeploymentId at it instead.
param taskGenerationDeploymentName string
param taskGenerationModelName string
param taskGenerationModelVersion string
param taskGenerationDeploymentCapacity int

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

resource taskGenerationDeployment 'Microsoft.CognitiveServices/accounts/deployments@2025-06-01' = {
  name: taskGenerationDeploymentName
  parent: openAiService
  sku: {
    name: 'GlobalStandard'
    capacity: taskGenerationDeploymentCapacity
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
// Breakdown shares the task-generation deployment - see the note on the params above.
output breakdownDeploymentId string = taskGenerationDeploymentName
output foundryProjectId string = foundryProject.id
