param webAppName string // move to parent Name of the application
param location string = resourceGroup().location // Location for all resources
param environment string
param appInsightConnectionString string

var corsAllowedOrigins = environment == 'staging' ? [
  'https://wapp-blotztaskapp-ui-staging.azurewebsites.net'
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
  kind: 'app'
}

resource appService 'Microsoft.Web/sites@2022-09-01' = {
  name: 'wapp-${webAppName}-${environment}'
  location: location
  properties: {
    serverFarmId: appServicePlan.id
    siteConfig: {
      alwaysOn: true
      cors: {
        allowedOrigins: corsAllowedOrigins
      }
      appSettings: [
        {
          name: 'ApplicationInsights:ConnectionString'
          value: appInsightConnectionString
        }
      ]
    }
  }
}
