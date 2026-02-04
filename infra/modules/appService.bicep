param webAppName string // move to parent Name of the application
param location string = resourceGroup().location // Location for all resources
param environment string
param appInsightConnectionString string
param keyVaultUri string
param openAiEndpoint string
param openAiDeploymentId string

var normalizedKeyVaultUri = endsWith(keyVaultUri, '/') ? keyVaultUri : '${keyVaultUri}/'

var corsAllowedOrigins = environment == 'stag' ? [
  'https://app-blotztaskapp-ui-stag.azurewebsites.net'
] : environment == 'prod' ? [
  'https://blotz-task-app.vercel.app'
] : []

resource appServicePlan 'Microsoft.Web/serverfarms@2022-09-01' = {
  name: 'asp-${webAppName}-${environment}'
  location: location
  sku: {
    name: 'B1'
    tier: 'Basic'
    size: 'B1'
    family: 'B'
    capacity: 1
  }
  kind: 'linux'
}

//TODO: Need to turn the log on
//TODO: Add health check path
resource appService 'Microsoft.Web/sites@2022-09-01' = {
  name: 'app-${webAppName}-${environment}'
  location: location
  kind: 'app,linux'
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    serverFarmId: appServicePlan.id
    siteConfig: {
      alwaysOn: true
      cors: {
        allowedOrigins: corsAllowedOrigins
        supportCredentials: true
      }
      appSettings: [
        {
          name: 'ApplicationInsights__ConnectionString'
          value: appInsightConnectionString
        }
        {
          name: 'KeyVault__VaultURI'
          value: keyVaultUri
        }
        {
          name: 'AzureOpenAI__Endpoint'
          value: openAiEndpoint
        }
        {
          name: 'AzureOpenAI__DeploymentId'
          value: openAiDeploymentId
        }
        {
          name: 'ApiKeys__UserSync'
          value: '@Microsoft.KeyVault(SecretUri=${normalizedKeyVaultUri}secrets/apikeys-usersync/)'
        }
        {
          name: 'AzureOpenAI__ApiKey'
          value: '@Microsoft.KeyVault(SecretUri=${normalizedKeyVaultUri}secrets/azureopenai-apikey/)'
        }
        {
          name: 'AzureSpeech__Key'
          value: '@Microsoft.KeyVault(SecretUri=${normalizedKeyVaultUri}secrets/azurespeech-key/)'
        }
        {
          name: 'ConnectionStrings__DefaultConnection'
          value: '@Microsoft.KeyVault(SecretUri=${normalizedKeyVaultUri}secrets/sql-connection-string/)'
        }
        {
          name: 'ASPNETCORE_ENVIRONMENT'
          value: environment == 'prod' ? 'Production' : 'Staging'
        }
      ]
    }
  }
}

output principalId string = appService.identity.principalId
output name string = appService.name
