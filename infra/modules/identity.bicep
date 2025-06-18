param identityName string
param location string = resourceGroup().location
param environment string
param projectName string

@description('Name of the existing Key Vault')
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

//TODO: we need to deploy manaually the role assignment for contributor in scope subscriotion level due to bicep scope
resource keyVaultSecretsUser 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(resourceGroup().id, 'kv-admin-access-${githubActionIdentity.name}')
  scope: keyVault
  properties: {
    principalId: githubActionIdentity.properties.principalId
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '4633458b-17de-408a-b874-0445c86b69e6') // Key Vault Secrets User
    principalType: 'ServicePrincipal'
  }
}

output principalId string = githubActionIdentity.properties.principalId
output resourceId string = githubActionIdentity.id
