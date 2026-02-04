param identityName string
param location string = resourceGroup().location
param environment string
param projectName string
param githubRepo string // Format: org/repo (e.g., sol-wizard/Blotz-Task-App)

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
    subject: 'repo:${githubRepo}:environment:${environment == 'prod' ? 'Production' : 'Staging'}'
    audiences: [
      'api://AzureADTokenExchange'
    ]
  }
}

var kvSecretsUserRoleId = '4633458b-17de-408a-b874-0445c86b69e6' // Key Vault Secrets User
var contributorRoleId = 'b24988ac-6180-42a0-ab88-20f7382dd24c' // Contributor

resource keyVaultSecretsUser 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(keyVault.id, identityName, kvSecretsUserRoleId)
  scope: keyVault
  properties: {
    principalId: githubActionIdentity.properties.principalId
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', kvSecretsUserRoleId)
    principalType: 'ServicePrincipal'
  }
}

resource contributorRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(resourceGroup().id, identityName, contributorRoleId)
  properties: {
    principalId: githubActionIdentity.properties.principalId
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', contributorRoleId)
    principalType: 'ServicePrincipal'
  }
}

output principalId string = githubActionIdentity.properties.principalId
output resourceId string = githubActionIdentity.id
