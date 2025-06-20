param projectName string
param environment string
param location string

resource speechAccount 'Microsoft.CognitiveServices/accounts@2021-04-30' = {
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
