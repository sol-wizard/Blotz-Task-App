param projectName string
param location string = resourceGroup().location
param environment string

@secure()
param dbAdminUsername string
@secure()
param dbAdminPassword string

param dbMaxSizeBytes int = 1073741824 // 1GB
param dbAutoPauseDelayMinutes int = 60 // set to -1 to disable auto-pause
param dbMaxVCores int = 1

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
      name: 'GP_S_Gen5_${dbMaxVCores}'
      tier: 'GeneralPurpose'
      family: 'Gen5'
      capacity: dbMaxVCores
    }
    properties: {
      maxSizeBytes: dbMaxSizeBytes
      autoPauseDelay: dbAutoPauseDelayMinutes
      minCapacity: json('0.5')
      requestedBackupStorageRedundancy: 'Local'
    }
  }
}

var connectionString = 'Server=tcp:${sqlServer.name}.database.windows.net,1433;Initial Catalog=${sqlServer::db.name};Persist Security Info=False;User ID=${dbAdminUsername};Password=${dbAdminPassword};MultipleActiveResultSets=False;Encrypt=True;TrustServerCertificate=False;Connection Timeout=30;'
output connectionString string = connectionString
