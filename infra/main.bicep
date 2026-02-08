param environment string
param organizationName string
param projectName string
var namePrefix = '${organizationName}-${projectName}'

param location string = resourceGroup().location

@secure()
param dbAdminUsername string
@secure()
param dbAdminPassword string

param openAiDeploymentName string
param openAiModelName string
param openAiModelVersion string
param githubRepo string // Format: org/repo (e.g., sol-wizard/Blotz-Task-App)
param budgetAmount int
param alertEmail string

// App Service SKU settings
param appServiceSkuName string
param appServiceSkuTier string

// Database SKU settings
param dbSkuName string
param dbSkuTier string
param dbSkuCapacity int
param dbMaxSizeGb int

// Key Vault create mode - use 'recover' if Key Vault is soft-deleted
@allowed(['default', 'recover'])
param kvCreateMode string = 'default'

// Entra ID group for dev team access
param devGroupId string

// Dev group: Contributor role at resource group level
resource devGroupContributor 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(resourceGroup().id, devGroupId, 'contributor')
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', 'b24988ac-6180-42a0-ab88-20f7382dd24c') // Contributor
    principalId: devGroupId
    principalType: 'Group'
  }
}

module logAnalytics 'modules/logAnalytics.bicep' = {
  name: '${namePrefix}-${environment}-log-analytics'
  params: {
    projectName: namePrefix
    environment: environment
    location: location
    retentionInDays: 30 // Minimum for PerGB2018 SKU is 30 days
  }
}

module appInsight 'modules/appInsight.bicep' = {
  name: '${namePrefix}-${environment}-app-insight'
  params: {
    projectName: namePrefix
    environment: environment
    location: location
    logAnalyticsWorkspaceId: logAnalytics.outputs.id
  }
}
module kv 'modules/keyVault.bicep' = {
  name: '${namePrefix}-${environment}-keyvault'
  params: {
    projectName: namePrefix
    location: location
    environment: environment
    dbAdminUsername: dbAdminUsername
    dbAdminPassword: dbAdminPassword
    createMode: kvCreateMode
    devGroupId: devGroupId
  }
}

module webAppForAPI 'modules/appService.bicep' = {
  name: '${namePrefix}-${environment}-webApp'
  params: {
    webAppName: '${namePrefix}-api'
    location: location
    environment: environment
    appInsightConnectionString: appInsight.outputs.connectionString
    keyVaultUri: kv.outputs.vaultUri
    openAiEndpoint: openAi.outputs.endpoint
    openAiDeploymentId: openAi.outputs.deploymentId
    logAnalyticsWorkspaceId: logAnalytics.outputs.id
    appServiceSkuName: appServiceSkuName
    appServiceSkuTier: appServiceSkuTier
  }
}

module kvAdminRoleWebApp 'modules/keyVaultRoleAssignment.bicep' = {
  name: '${namePrefix}-${environment}-kv-admin-webapp'
  params: {
    keyVaultName: kv.outputs.name
    principalId: webAppForAPI.outputs.principalId
    projectName: namePrefix
    environment: environment
  }
}

module sql 'modules/sqlserver.bicep' = {
  name: '${namePrefix}-${environment}-database'
  params: {
    projectName: namePrefix
    location: location
    environment: environment
    dbAdminUsername: dbAdminUsername
    dbAdminPassword: dbAdminPassword
    dbSkuName: dbSkuName
    dbSkuTier: dbSkuTier
    dbSkuCapacity: dbSkuCapacity
    dbMaxSizeBytes: dbMaxSizeGb * 1073741824
  }
}

module storeConnectionString 'modules/keyVaultSecret.bicep' = {
  name: '${namePrefix}-${environment}-store-connection-string'
  params: {
    keyVaultName: kv.outputs.name
    secretName: 'sql-connection-string'
    secretValue: sql.outputs.connectionString
  }
}

module openAi 'modules/openAi.bicep' = {
  name: '${namePrefix}-${environment}-openai'
  params: {
    environment: environment
    projectName: namePrefix
    keyVaultName: kv.outputs.name
    foundryProjectName: 'proj-${namePrefix}-${environment}'
    openAiDeploymentName: openAiDeploymentName
    openAiModelName: openAiModelName
    openAiModelVersion: openAiModelVersion
  }
}
module githubActionIdentity 'modules/identity.bicep' = {
  name: '${namePrefix}-${environment}-github-action-identity'
  params: {
    identityName: 'id-gha-${namePrefix}-${environment}'
    location: location
    environment: environment
    projectName: namePrefix
    githubRepo: githubRepo
    keyVaultName: kv.outputs.name
    webAppName: webAppForAPI.outputs.name
  }
}

module storage 'modules/storage.bicep' = {
  name: '${namePrefix}-${environment}-storage'
  params: {
    projectName: namePrefix
    environment: environment
    location: location
    devGroupId: devGroupId
  }
}

module speech 'modules/speech.bicep' = {
  name: '${namePrefix}-${environment}-speech'
  params: {
    projectName: namePrefix
    location: location
    environment: environment
    keyVaultName: kv.outputs.name
  }
}

module budget 'modules/budget.bicep' = {
  name: '${namePrefix}-${environment}-budget'
  params: {
    projectName: namePrefix
    environment: environment
    budgetAmount: budgetAmount
    alertEmail: alertEmail
  }
}
