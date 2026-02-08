param location string = resourceGroup().location

@allowed([
  'standard'
  'premium'
])
param skuName string = 'standard'

@secure()
param dbAdminUsername string
@secure()
param dbAdminPassword string

param projectName string
param environment string

@allowed([
  'default'
  'recover'
])
@description('Use "recover" if Key Vault is in soft-deleted state')
param createMode string = 'default'

resource kv 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: 'kv-${projectName}-${environment}'
  location: location
  properties: {
    createMode: createMode
    sku: {
      family: 'A'
      name: skuName
    }
    tenantId: subscription().tenantId
    softDeleteRetentionInDays: 90
    enabledForTemplateDeployment: true
    enableSoftDelete: true
    enableRbacAuthorization: true
    networkAcls: {
      bypass: 'AzureServices'
      defaultAction: 'Allow'
    }
  }
}

param devGroupId string

resource roleAssignmentForDevGroup 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(resourceGroup().id, devGroupId, 'kv-admin-access')
  scope: kv
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '00482a5a-887f-4fb3-b363-3b7fe8e74483') // Key Vault Administrator
    principalId: devGroupId
    principalType: 'Group'
  }
}

resource secretsUserForDevGroup 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(resourceGroup().id, devGroupId, 'kv-secrets-user')
  scope: kv
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '4633458b-17de-408a-b874-0445c86b69e6') // Key Vault Secrets User
    principalId: devGroupId
    principalType: 'Group'
  }
}

resource secretUsername 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  name: 'db-admin-username'
  properties: {
    value: dbAdminUsername
  }
  parent: kv
}

resource secretPassword 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  name: 'db-admin-password'
  properties: {
    value: dbAdminPassword
  }
  parent: kv
}

output name string = kv.name
output vaultUri string = kv.properties.vaultUri
