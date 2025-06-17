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

module webApp 'modules/appService.bicep' = {
  name:'${deployment().name}-webApp'//TODO: Add a unique suffix
  params: {
    webAppName: '${projectName}-api' 
    location: location
    environment: environment
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

resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' existing = {
  name: kv.outputs.name
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
    keyVaultName: kv.outputs.name
  }
}
