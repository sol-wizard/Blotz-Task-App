@description('Name of the application')
param projectName string = 'blotztask' 

@description('Location for all resources')
param location string = resourceGroup().location

@description('Environment for all resources')
@allowed(['dev', 'staging', 'prod'])
param environment string

@secure()
param dbAdminUsername string
@secure()
param dbAdminPassword string


module appInsight 'modules/appInsight.bicep' = {
  name: '${deployment().name}-app-insight'
  params: {
    projectName: projectName
    environment: environment
    location: location
  }
}
module kv 'modules/keyVault.bicep' = {
  name: '${deployment().name}-keyvault' //TODO: Add a unique suffix
  params: {
    projectName: projectName
    location: location
    environment: environment
    dbAdminUsername: dbAdminUsername
    dbAdminPassword: dbAdminPassword
  }
}
module webAppForAPI 'modules/appService.bicep' = {
  name:'${deployment().name}-webApp'//TODO: Add a unique suffix
  params: {
    webAppName: '${projectName}-api' 
    location: location
    environment: environment
    appInsightConnectionString: appInsight.outputs.connectionString
    keyVaultUri: kv.outputs.vaultUri
    openAiEndpoint: openAi.outputs.endpoint
    openAiDeploymentId: openAi.outputs.deploymentId
  }
}

resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' existing = {
  name: kv.outputs.name
}

resource kvAdminRoleWebApp 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(resourceGroup().id, 'kv-admin-webapp-${projectName}-${environment}')
  properties: {
    principalId: webAppForAPI.outputs.principalId
    principalType: 'ServicePrincipal'
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '00482a5a-887f-4fb3-b363-3b7fe8e74483')
  }
}

module sql 'modules/sqlserver.bicep' = {
  name: '${deployment().name}-database'
  params: {
    projectName: projectName
    location: location
    environment: environment
    dbAdminUsername: keyVault.getSecret('db-admin-username')
    dbAdminPassword: keyVault.getSecret('db-admin-password')
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
    location: location
    environment: environment
    projectName: projectName
    keyVaultName: kv.outputs.name
  }
}
module githubActionIdentity 'modules/identity.bicep' = {
  name: '${deployment().name}-github-action-identity'
  params: {
    identityName: 'uami-${projectName}-${environment}'
    location: location
    environment: environment
    projectName: projectName
    keyVaultName: kv.outputs.name
  }
}

module speech 'modules/speech.bicep' = {
  name: '${deployment().name}-speech'
  params: {
    projectName: projectName
    location: location
    environment: environment
  }
}

