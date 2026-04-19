using './main.bicep'

param environment = 'prod'
param organizationName = 'blotz'
param projectName = 'task'
param location = 'australiaeast'

param breakdownDeploymentName = 'gpt-5.2-chat'
param breakdownModelName = 'gpt-5.2-chat'
param breakdownModelVersion = '2025-12-11'

param taskGenerationDeploymentName = 'gpt-5.4-mini'
param taskGenerationModelName = 'gpt-5.4-mini'
param taskGenerationModelVersion = '2025-12-11'
param githubRepo = 'sol-wizard/Blotz-Task-App'
param budgetAmount = 40 // AUD per month for production
param alertEmail = 'benjaminneoh2928@gmail.com'

param appServiceSkuName = 'B1'
param appServiceSkuTier = 'Basic'

// Database (DTU Standard S0 - 10 DTUs, max 250GB)
param dbMaxSizeGb = 2
param dbSkuName = 'S0'
param dbSkuTier = 'Standard'
param dbSkuCapacity = 10

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
