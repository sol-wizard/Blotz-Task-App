using './main.bicep'

param environment = 'prod'
param organizationName = 'blotz'
param projectName = 'task'
param location = 'australiaeast'

param openAiDeploymentName = 'gpt-5.2-chat'
param openAiModelName = 'gpt-5.2-chat'
param openAiModelVersion = '2025-12-11'
param githubRepo = 'sol-wizard/Blotz-Task-App'
param budgetAmount = 100 // AUD per month for production
param alertEmail = 'benjaminneoh2928@gmail.com'

param appServiceSkuName = 'B2'
param appServiceSkuTier = 'Basic'

// Database SKU (Basic tier - sufficient for 10 daily active users)
param dbSkuName = 'Basic'
param dbSkuTier = 'Basic'
param dbSkuCapacity = 5 // DTUs
param dbMaxSizeGb = 2

// Entra ID dev group Object ID - create a prod group and replace this
param devGroupId = '<REPLACE_WITH_PROD_GROUP_ID>'

// Do not commit real credentials. Provide these at deploy time.
param dbAdminUsername = '<REPLACE>'
param dbAdminPassword = '<REPLACE>'
