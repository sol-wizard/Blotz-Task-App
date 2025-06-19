param projectName string 
param location string = resourceGroup().location
param environment string

@secure()
param dbAdminUsername string
@secure()
param dbAdminPassword string

//TODO : A new database resource is created from azure portal please update the bicep script here
resource sqlServer 'Microsoft.Sql/servers@2023-05-01-preview' = {
  name: 'sql-${projectName}-${environment}'
  location: location
  properties: {
    administratorLogin: dbAdminUsername
    administratorLoginPassword: dbAdminPassword
  }

  resource firewall 'firewallRules@2023-05-01-preview' = {
    name: 'AllowAzureResourcesAndServices'
    properties: {
      startIpAddress: '0.0.0.0'
      endIpAddress: '0.0.0.0'
    }
  }

  resource db 'databases@2023-05-01-preview' = {
    name: 'sqldb-${projectName}-${environment}'
    location: location
    sku: {
      name: 'Basic'
      tier: 'Basic'
      capacity: 5
    }
    properties: {
      maxSizeBytes: 1073741824
    }
  }
}

var connectionString = 'Server=tcp:${sqlServer.name}.database.windows.net,1433;Initial Catalog=${sqlServer::db.name};Persist Security Info=False;User ID=${dbAdminUsername};Password=${dbAdminPassword};MultipleActiveResultSets=False;Encrypt=True;TrustServerCertificate=False;Connection Timeout=30;'
output connectionString string = connectionString
