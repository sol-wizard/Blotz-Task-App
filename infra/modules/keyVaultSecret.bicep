param keyVaultName string
param secretName string
param secretValue string

resource secret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  name: '${keyVaultName}/${secretName}'
  properties: {
    value: secretValue
  }
}
