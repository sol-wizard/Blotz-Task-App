// Emails the team while the AI Coach monthly pot is at or above 80%, so the cap can be raised
// before AI Coach pauses for everyone. The API logs a warning on every admitted call above the
// threshold (see AiCoachBudget.ReserveAsync); traces are sampled, so the rule counts any of them
// and mutes itself for a day after each email.
param projectName string
param environment string
param location string = resourceGroup().location
param appInsightsId string
param alertEmail string

resource actionGroup 'Microsoft.Insights/actionGroups@2023-01-01' = {
  name: 'ag-${projectName}-${environment}-ai-coach'
  location: 'global'
  properties: {
    groupShortName: 'aicoach'
    enabled: true
    emailReceivers: [
      {
        name: 'team'
        emailAddress: alertEmail
        useCommonAlertSchema: true
      }
    ]
  }
}

resource budgetAlert 'Microsoft.Insights/scheduledQueryRules@2023-12-01' = {
  name: 'alert-${projectName}-${environment}-ai-coach-budget-80'
  location: location
  properties: {
    displayName: 'AI Coach monthly budget above 80% (${environment})'
    description: 'The AI Coach pot is at or above 80% of AiCoach:MonthlyBudgetUsd. Raise it before AI Coach pauses for everyone; it resets on the first of the month (Perth).'
    severity: 2
    enabled: true
    scopes: [appInsightsId]
    evaluationFrequency: 'PT1H'
    windowSize: 'PT1H'
    autoMitigate: false
    muteActionsDuration: 'P1D'
    criteria: {
      allOf: [
        {
          query: 'traces | where message startswith "AiCoach monthly budget above 80%"'
          timeAggregation: 'Count'
          operator: 'GreaterThan'
          threshold: 0
          failingPeriods: {
            numberOfEvaluationPeriods: 1
            minFailingPeriodsToAlert: 1
          }
        }
      ]
    }
    actions: {
      actionGroups: [actionGroup.id]
    }
  }
}
