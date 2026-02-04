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

module logAnalytics 'modules/logAnalytics.bicep' = {
  name: '${deployment().name}-log-analytics'
  params: {
    projectName: namePrefix
    environment: environment
    location: location
    retentionInDays: 30 // Minimum for PerGB2018 SKU is 30 days
  }
}

module appInsight 'modules/appInsight.bicep' = {
  name: '${deployment().name}-app-insight'
  params: {
    projectName: namePrefix
    environment: environment
    location: location
    logAnalyticsWorkspaceId: logAnalytics.outputs.id
  }
}
module kv 'modules/keyVault.bicep' = {
  name: '${deployment().name}-keyvault' //TODO: Add a unique suffix
  params: {
    projectName: namePrefix
    location: location
    environment: environment
    dbAdminUsername: dbAdminUsername
    dbAdminPassword: dbAdminPassword
  }
}

module webAppForAPI 'modules/appService.bicep' = {
  name: '${deployment().name}-webApp'
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
  name: '${deployment().name}-kv-admin-webapp'
  params: {
    keyVaultName: kv.outputs.name
    principalId: webAppForAPI.outputs.principalId
    projectName: namePrefix
    environment: environment
  }
}

module sql 'modules/sqlserver.bicep' = {
  name: '${deployment().name}-database'
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
  name: '${deployment().name}-store-connection-string'
  params: {
    keyVaultName: kv.outputs.name
    secretName: 'sql-connection-string'
    secretValue: sql.outputs.connectionString
  }
}

module openAi 'modules/openAi.bicep' = {
  name: '${deployment().name}-openai'
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
  name: '${deployment().name}-github-action-identity'
  params: {
    identityName: 'id-gha-${namePrefix}-${environment}'
    location: location
    environment: environment
    projectName: namePrefix
    githubRepo: githubRepo
    keyVaultName: kv.outputs.name
  }
}

module speech 'modules/speech.bicep' = {
  name: '${deployment().name}-speech'
  params: {
    projectName: namePrefix
    location: location
    environment: environment
    keyVaultName: kv.outputs.name
  }
}

module budget 'modules/budget.bicep' = {
  name: '${deployment().name}-budget'
  params: {
    projectName: namePrefix
    environment: environment
    budgetAmount: budgetAmount
    alertEmail: alertEmail
  }
}
