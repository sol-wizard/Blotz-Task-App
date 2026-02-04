param location string = resourceGroup().location
param environment string = 'prod'
param projectName string = 'blotz-task-al'
param keyVaultName string

param foundryProjectName string

// Azure OpenAI / Foundry model deployment
// NOTE: GPT-5.2 requires model access enablement on the subscription/region.
// If deployment fails with a model access error, request access or override these params to an available model.
param openAiDeploymentName string = 'gpt-5.2'
param openAiModelName string = 'gpt-5.2'
// Optional: pin a specific model version for deterministic deployments (recommended).
// If empty, Azure assigns the current default model version for the chosen model.
param openAiModelVersion string = '2025-12-11'

var deploymentModel = empty(openAiModelVersion)
  ? {
      format: 'OpenAI'
      name: openAiModelName
    }
  : {
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
  // "Convert" Azure OpenAI to Azure AI Foundry classic by upgrading the account kind.
  // This keeps the same account name while enabling projects.
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

// The model must be supported in the region of the account.
resource modelDeployment 'Microsoft.CognitiveServices/accounts/deployments@2025-06-01' = {
  name: openAiDeploymentName
  parent: openAiService
  sku: {
    name: 'GlobalStandard'  
    capacity: 1              
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
