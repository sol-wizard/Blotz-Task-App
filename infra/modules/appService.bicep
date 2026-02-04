param webAppName string // move to parent Name of the application
param location string = resourceGroup().location // Location for all resources
param environment string
param appInsightConnectionString string
param keyVaultUri string
param openAiEndpoint string
param openAiDeploymentId string
param logAnalyticsWorkspaceId string

// App Service Plan SKU
param appServiceSkuName string = 'B1'
param appServiceSkuTier string = 'Basic'

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
    name: appServiceSkuName
    tier: appServiceSkuTier
  }
  kind: 'linux'
  properties: {
    reserved: true
  }
}

resource appService 'Microsoft.Web/sites@2022-09-01' = {
  name: 'app-${webAppName}-${environment}'
  location: location
  kind: 'app,linux'
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    serverFarmId: appServicePlan.id
    httpsOnly: true
    siteConfig: {
      alwaysOn: true
      healthCheckPath: '/health'
      minTlsVersion: '1.2'
      ftpsState: 'Disabled'
      http20Enabled: true
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
        {
          name: 'WEBSITE_HEALTHCHECK_MAXPINGFAILURES'
          value: '3'
        }
      ]
    }
  }
}

resource diagnosticSettings 'Microsoft.Insights/diagnosticSettings@2021-05-01-preview' = {
  name: 'diag-${appService.name}'
  scope: appService
  properties: {
    workspaceId: logAnalyticsWorkspaceId
    logs: [
      {
        category: 'AppServiceHTTPLogs'
        enabled: true
      }
      {
        category: 'AppServiceConsoleLogs'
        enabled: true
      }
      {
        category: 'AppServiceAppLogs'
        enabled: true
      }
      {
        category: 'AppServicePlatformLogs'
        enabled: true
      }
    ]
    metrics: [
      {
        category: 'AllMetrics'
        enabled: true
      }
    ]
  }
}

output principalId string = appService.identity.principalId
output name string = appService.name
