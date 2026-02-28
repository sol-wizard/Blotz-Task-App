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
param dbSkuName = 'Standard'
param dbSkuTier = 'Standard'
param dbSkuCapacity = 10 // DTUs
param dbMaxSizeGb = 5

// Entra ID dev group Object ID - create a prod group and replace this
param devGroupId = '5719a9e2-49bd-49eb-85d1-e4afd63ca04d'

param dbAdminUsername = ''
param dbAdminPassword = ''

// Auth0 Configuration (production)
param auth0Domain = 'dev-k72xachs0fr6nebp.us.auth0.com'
param auth0Audience = 'https://blotz-task-dev/api'
param auth0ManagementClientId = 'xWylVePDs5giZLBopYT1qHecBv2WijQh'
param auth0ManagementAudience = 'https://dev-k72xachs0fr6nebp.us.auth0.com/api/v2/'
// Auth0 Management Client Secret - overridden at deploy time
param auth0ManagementClientSecret = ''
