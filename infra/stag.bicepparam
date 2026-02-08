using './main.bicep'

param environment = 'stag'
param organizationName = 'blotz'
param projectName = 'task'
param location = 'australiaeast'

param openAiDeploymentName = 'gpt-5.2-chat'
param openAiModelName = 'gpt-5.2-chat'
param openAiModelVersion = '2025-12-11'
param githubRepo = 'sol-wizard/Blotz-Task-App'
param budgetAmount = 50
param alertEmail = 'benjaminneoh2928@gmail.com'

// App Service SKU (Basic tier for staging)
param appServiceSkuName = 'B1'
param appServiceSkuTier = 'Basic'

// Database SKU (Basic tier for staging)
param dbSkuName = 'Basic'
param dbSkuTier = 'Basic'
param dbSkuCapacity = 5 // DTUs
param dbMaxSizeGb = 2

// Entra ID dev group Object ID (rg-blotz-task-stag-devs)
param devGroupId = 'aae34f6e-c28e-4064-9d5b-15336d8c147a'

// DB credentials - overridden at deploy time via deploy-staging.ps1
param dbAdminUsername = ''
param dbAdminPassword = ''
