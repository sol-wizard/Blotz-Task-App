param identityName string
param location string = resourceGroup().location
param environment string
param projectName string
param githubRepo string // Format: org/repo (e.g., sol-wizard/Blotz-Task-App)

param keyVaultName string
param webAppName string

resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' existing = {
  name: keyVaultName
}

resource webApp 'Microsoft.Web/sites@2022-09-01' existing = {
  name: webAppName
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
var websiteContributorRoleId = 'de139f84-1756-47ae-9be6-808fbbe84772' // Website Contributor

resource keyVaultSecretsUser 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(keyVault.id, githubActionIdentity.id, 'kv-secrets-user')
  scope: keyVault
  properties: {
    principalId: githubActionIdentity.properties.principalId
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', kvSecretsUserRoleId)
    principalType: 'ServicePrincipal'
  }
}

resource websiteContributorRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(webApp.id, githubActionIdentity.id, 'website-contributor')
  scope: webApp
  properties: {
    principalId: githubActionIdentity.properties.principalId
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', websiteContributorRoleId)
    principalType: 'ServicePrincipal'
  }
}

output principalId string = githubActionIdentity.properties.principalId
output resourceId string = githubActionIdentity.id
