param location string = resourceGroup().location
param environment string
param projectName string
param logAnalyticsWorkspaceId string

resource appInsight 'Microsoft.Insights/components@2020-02-02' = {
  name: 'appi-${projectName}-${environment}'
  location: location
  kind: 'web'
  properties: {
    Application_Type: 'web'
    WorkspaceResourceId: logAnalyticsWorkspaceId
    publicNetworkAccessForIngestion: 'Enabled'
    publicNetworkAccessForQuery: 'Enabled'
  }
}

output connectionString string = appInsight.properties.ConnectionString
