param projectName string
param environment string
param location string
param keyVaultName string

resource speechAccount 'Microsoft.CognitiveServices/accounts@2023-05-01' = {
  name: 'spch-${projectName}-${environment}'
  location: location
  kind: 'SpeechServices'
  sku: {
    name: 'S0'
  }
  properties: {
    publicNetworkAccess: 'Enabled'
    networkAcls: {
      defaultAction: 'Allow'
      virtualNetworkRules: []
      ipRules: []
    }
  }
}

resource kv 'Microsoft.KeyVault/vaults@2023-07-01' existing = {
  name: keyVaultName
}

resource storeSpeechKey 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: kv
  name: 'azurespeech-key'
  properties: {
    value: speechAccount.listKeys().key1
  }
}

output endpoint string = speechAccount.properties.endpoint
