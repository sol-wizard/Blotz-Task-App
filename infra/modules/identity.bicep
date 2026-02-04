param identityName string
param location string = resourceGroup().location
param environment string
param projectName string

param keyVaultName string

resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' existing = {
  name: keyVaultName
}

resource githubActionIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' = {
  name: identityName
  location: location
}

resource fic 'Microsoft.ManagedIdentity/userAssignedIdentities/federatedIdentityCredentials@2023-01-31' = {
  parent: githubActionIdentity
  name: 'fic-github-${projectName}-${environment}'
  properties: {
    issuer: 'https://token.actions.githubusercontent.com'
    //TODO: Hardcoded repo and org name 
    subject: 'repo:sol-wizard/Blotz-Task-App:environment:${environment == 'prod' ? 'Production' : 'Staging'}'
    audiences: [
      'api://AzureADTokenExchange'
    ]
  }
}

resource keyVaultSecretsUser 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(resourceGroup().id, 'kv-admin-access-${githubActionIdentity.name}')
  scope: keyVault
  properties: {
    principalId: githubActionIdentity.properties.principalId
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '4633458b-17de-408a-b874-0445c86b69e6') // Key Vault Secrets User
    principalType: 'ServicePrincipal'
  }
}

//TODO: For staging remove the contributor role assignment which point to the subscription level
resource contributorRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(resourceGroup().id, 'contributor-access-${githubActionIdentity.name}')
  properties: {
    principalId: githubActionIdentity.properties.principalId
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', 'b24988ac-6180-42a0-ab88-20f7382dd24c') // Contributor role ID
    principalType: 'ServicePrincipal'
  }
}

output principalId string = githubActionIdentity.properties.principalId
output resourceId string = githubActionIdentity.id
