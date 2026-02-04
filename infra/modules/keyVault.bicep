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

resource kv 'Microsoft.KeyVault/vaults@2023-07-01' = {
  //TODO: Add remove the v2 from the name once staging key vault is regenerated
  name: 'kv-${projectName}-${environment}'
  location: location
  properties: {
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

//TODO: This is a role assignement for myself so i can access
resource roleAssignmentForUser 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(resourceGroup().id, 'kv-admin-access')
  properties: { //TODO: Should be a better way to do this no hard code subscription id
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '00482a5a-887f-4fb3-b363-3b7fe8e74483') // Key Vault Admin
    principalId: '12d6caff-6751-446f-b168-b73ba30d316f' // TODO: here is my hard coded id, must be a better way to do this 
    principalType: 'User'
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
