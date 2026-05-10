# Monthly Review PBI Plan

## Feature Goal

Build a simple monthly review feature that generates one AI-written letter for a user based on all tasks they created in a selected month.

Scope for v1:

- Use all tasks created in the selected month, not only completed tasks.
- Ignore labels for now.
- Send task title, details, created date, planned date, time taken, and completion status to the LLM.
- Use a direct LLM call, not an AI agent.
- Use reasoning effort `medium`.
- Save the generated letter in SQL.
- Generate reports from the backend monthly, then return the saved letter to the mobile monthly review screen.

Important trigger decision:

- The frontend should not be responsible for creating the monthly report.
- The frontend should only request and display a saved report.
- Backend generation should be handled by a monthly scheduled trigger.
- Because automatic generation cannot rely on the frontend sending a local date, the backend needs a user timezone source. For v1, store a user's latest known timezone/offset from the mobile app, or use a documented fallback such as UTC.

---

## Copy-Paste Coding Agent Prompt

Use this prompt when asking an AI coding agent to implement the feature.

```text
You are working in the Blotz Task App repository.

Goal:
Implement a simple Monthly Review feature. The feature generates one AI-written monthly review letter for the authenticated user based on all tasks they created in a selected month.

Important scope:
- Do not implement a general AI memory system.
- Do not add RAG or vector search.
- Do not integrate PostHog.
- Do not use an AI agent.
- Use a direct LLM call only.
- Use reasoning effort = medium.
- Save the generated monthly review in SQL so reopening the same month returns the same letter without calling the LLM again.
- Use all tasks created in the selected month, not only completed tasks.
- Ignore labels for now.
- Frontend should only read saved monthly reports. It should not be the main report generation trigger.
- Add backend monthly generation flow that can be called by a scheduled trigger.
- Automatic generation needs a timezone source per user. Use a stored user timezone/latest known offset if available. If unavailable, use UTC as a documented fallback.

Backend implementation:
1. Add a new MonthlyReviews module under:
   blotztask-api/Modules/MonthlyReviews

2. Add a MonthlyReviewReport entity with:
   - Id
   - UserId
   - Year
   - Month
   - AiGeneratedLetter
   - AiInputSnapshotJson
   - AiModel
   - CreatedAt
   - UpdatedAt

3. Add DbSet<MonthlyReviewReport> to BlotzTaskDbContext.

4. Add EF Core configuration and migration:
   - MonthlyReviewReports table
   - unique index on UserId, Year, Month
   - required fields for AiGeneratedLetter, AiInputSnapshotJson, and AiModel

5. Add module registration:
   - Modules/MonthlyReviews/DependencyInjection.cs
   - builder.Services.AddMonthlyReviewModule() in Program.cs

6. Add DTOs:
   MonthlyReviewDto:
   - int Year
   - int Month
   - string AiGeneratedLetter
   - DateTime CreatedAt

   MonthlyReviewTaskSnapshotDto:
   - string Title
   - string Details
   - string CreatedDate
   - string PlannedDate
   - int TimeTakenMinutes
   - bool IsDone

7. Add a task snapshot query:
   - Input: UserId and FirstDate as DateTimeOffset.
   - FirstDate should represent the first day of the report month in the user's timezone/offset.
   - Convert FirstDate and FirstDate.AddMonths(1) to UTC before querying CreatedAt.
   - Query TaskItems where:
     UserId == current user
     CreatedAt >= monthStartUtc
     CreatedAt < nextMonthStartUtc
   - Include completed and incomplete tasks.
   - Map each task to MonthlyReviewTaskSnapshotDto.
   - createdDate should come from CreatedAt.
   - plannedDate should come from StartTime.
   - timeTakenMinutes should be max(0, EndTime - StartTime in minutes).

8. Add MonthlyReviewPrompts.cs.
   The prompt must say:
   - write one warm monthly review letter
   - use all tasks created in the month
   - completed tasks show execution
   - incomplete tasks show intention or unfinished themes
   - do not shame the user
   - do not list every task
   - do not invent facts
   - only make benchmark/external comparison claims when supported by reliable web sources
   - return only the final letter content

9. Add MonthlyReviewAiService:
   - Accept preferred language, month label, and task snapshot JSON.
   - Call Azure OpenAI directly.
   - Use configured AzureOpenAI endpoint/api key/deployment where practical.
   - Use reasoning effort = medium.
   - Use web search only if the current Azure OpenAI API path supports it cleanly.
   - If web search SDK support is awkward, use a small typed REST client instead of adding a broad abstraction.
   - Return generated letter and model.

10. Add GenerateMonthlyReview command:
   - Check existing MonthlyReviewReport by UserId, Year, Month.
   - If it exists, return it.
   - If it does not exist:
     - Query task snapshot.
     - Serialize the task snapshot into AiInputSnapshotJson.
     - Call MonthlyReviewAiService.
     - Save MonthlyReviewReport.
     - Return MonthlyReviewDto.

11. Add MonthlyReviewController:
   GET /MonthlyReview?year={year}&month={month}
   - Read UserId from HttpContext.Items["UserId"] like existing controllers.
   - Validate year/month.
   - Return the saved MonthlyReviewReport if it exists.
   - Do not make the frontend GET endpoint the primary generation trigger.
   - Return MonthlyReviewDto.

12. Add backend monthly generation trigger path:
   - Add a command/service that generates missing reports for a target month.
   - This command can later be called by a hosted service, Azure Function, GitHub Action, or other scheduler.
   - The generation path should determine each user's month boundaries from stored timezone/latest known offset, with UTC fallback.

Frontend implementation:
1. Add:
   blotztask-mobile/src/feature/settings/services/monthly-review-service.ts

2. Use existing apiClient.

3. Define specific TypeScript types. Do not use any.

4. Update:
   blotztask-mobile/src/feature/settings/screens/settings-monthly-review-screen.tsx

5. Remove MOCK_REPORTS.

6. Fetch the selected month from backend.

7. Do not send timezone data from this read endpoint. Backend generation should already have produced the saved report.

8. Show:
   - loading state while report is loading
   - error state with retry
   - empty/not-ready state if no saved report exists yet
   - success state using existing letter UI

9. Add/update i18n keys in:
   blotztask-mobile/src/i18n/locales/en/settings.json
   blotztask-mobile/src/i18n/locales/zh/settings.json

Quality constraints:
- Keep changes small and consistent with existing project patterns.
- Do not use TypeScript any.
- Do not add unrelated refactors.
- Do not send raw task data to PostHog.
- If Azure web search/reasoning is blocked by SDK limitations, document the limitation and implement the non-web-search direct LLM path first.

Verification:
- Run dotnet build blotztask-api/BlotzTask.slnx.
- Run the nearest mobile typecheck/lint command from blotztask-mobile/package.json.
- Manually verify:
  - first request creates and saves a report
  - second request for same month returns saved report
  - a month with no tasks behaves gracefully
  - month navigation fetches correct month
```

---

## LLM Monthly Review Generation Prompt

Use this prompt inside the backend when generating the actual monthly review letter.

```text
You are Blotz, a warm but honest monthly reflection writer for a to-do app.

You will receive all tasks the user created during one month.
The data includes:
- task title
- task details
- created date
- planned date
- planned time in minutes
- completion status

Write one monthly review letter for the user.

The letter should help the user notice meaningful patterns in their month.

Use these interpretation rules:
- Completed tasks show what the user executed.
- Incomplete tasks show intention, pressure, unfinished themes, or things the user may want to continue.
- Treat incomplete tasks gently. Do not shame the user.
- Look for themes across task titles and details.
- Look for repeated areas of effort, such as study, work, health, planning, family, admin, creativity, or long-term projects.
- Mention interesting patterns the user may not have noticed.
- Do not list every task.
- Do not focus on exact calculations.
- Do not invent facts.
- Do not say the user completed something unless isDone is true.
- If you mention time, use cautious phrasing like "you planned meaningful time around..." unless the exact value is directly obvious from the data.
- If you make an external benchmark or comparison claim, it must be supported by a reliable web source.
- If no reliable source supports an external comparison, do not make that comparison.

Style:
- Warm, personal, reflective.
- Encouraging but not cheesy.
- Honest about unfinished work without sounding negative.
- Clear enough to display directly in a mobile app.
- Return only the final letter content.
- Do not return markdown tables.
- Do not include implementation notes.

Preferred language: {preferredLanguage}
Month: {monthLabel}

Task data JSON:
{taskJson}
```

---

## PBI 1: Add Monthly Review Database Model

### Goal

Create a table to store one generated monthly review per user per month.

### Backend Changes

Add entity:

```text
blotztask-api/Modules/MonthlyReviews/Domain/MonthlyReviewReport.cs
```

Suggested fields:

```text
Id
UserId
Year
Month
AiGeneratedLetter
AiInputSnapshotJson
AiModel
CreatedAt
UpdatedAt
```

Update:

```text
blotztask-api/Infrastructure/Data/BlotzTaskDbContext.cs
```

Add:

```text
DbSet<MonthlyReviewReport> MonthlyReviewReports
```

Add EF Core configuration if that matches the existing project pattern.

Add a unique index:

```text
UserId, Year, Month
```

### Acceptance Criteria

- `MonthlyReviewReports` table exists.
- One user cannot have duplicate reports for the same year/month.
- `AiGeneratedLetter`, `AiInputSnapshotJson`, and `AiModel` are required.
- EF Core migration is created.
- Backend builds successfully.

---

## PBI 2: Add Monthly Review Module Registration

### Goal

Add a dedicated backend module following the existing module pattern.

### Backend Changes

Add folder:

```text
blotztask-api/Modules/MonthlyReviews/
```

Add:

```text
DependencyInjection.cs
```

Register the module in:

```text
blotztask-api/Program.cs
```

Expected pattern:

```text
builder.Services.AddMonthlyReviewModule();
```

### Acceptance Criteria

- Monthly review services/handlers can be registered from one module file.
- `Program.cs` includes the new module registration.
- No unrelated modules are changed.

---

## PBI 3: Add Monthly Review DTOs

### Goal

Define the request/response contracts and the task snapshot sent to the LLM.

### Backend Files

Add:

```text
blotztask-api/Modules/MonthlyReviews/Dtos/MonthlyReviewDto.cs
```

Suggested DTOs:

```text
MonthlyReviewDto
- year
- month
- aiGeneratedLetter
- createdAt

MonthlyReviewTaskSnapshotDto
- title
- details
- createdDate
- plannedDate
- timeTakenMinutes
- isDone
```

### Acceptance Criteria

- DTOs use specific types.
- No `object`/loosely typed payloads unless used only for serialized JSON boundaries.
- Empty task details are handled safely.

---

## PBI 4: Query Monthly Task Snapshot

### Goal

Build the monthly task snapshot from existing `TaskItems`.

### Backend Changes

Add query/handler:

```text
blotztask-api/Modules/MonthlyReviews/Queries/GetMonthlyReviewTaskSnapshot.cs
```

Behavior:

1. Accept `UserId` and `FirstDate` as `DateTimeOffset`.
2. Treat `FirstDate` as the first day of the report month in the user's timezone/offset.
3. Convert `FirstDate` and `FirstDate.AddMonths(1)` to UTC.
4. Query `TaskItems` by:
   ```text
   UserId == current user
   CreatedAt >= monthStartUtc
   CreatedAt < nextMonthStartUtc
   ```
5. Map each task to:
   ```text
   title
   details
   createdDate
   plannedDate
   timeTakenMinutes
   isDone
   ```

Important:

- `plannedDate` should come from `StartTime`.
- `timeTakenMinutes` should be `EndTime - StartTime`.
- Do not include labels for v1.

### Acceptance Criteria

- The query returns all tasks created in the selected month.
- Completed and incomplete tasks are both included.
- Month boundary logic respects the provided `DateTimeOffset` offset.
- Returned task snapshot contains no user data outside the selected month.

---

## PBI 5: Add Monthly Review Prompt

### Goal

Create the first version of the prompt used to generate the monthly review letter.

### Backend File

Add:

```text
blotztask-api/Modules/MonthlyReviews/Prompts/MonthlyReviewPrompts.cs
```

Prompt:

```text
You are Blotz, a warm but honest monthly reflection writer for a to-do app.

You will receive all tasks the user created during one month. The data includes task title, details, created date, planned date, estimated/planned time, and completion status.

Write one monthly review letter for the user.

Goals:
- Find meaningful themes in what the user planned, attempted, completed, and left unfinished.
- Mention interesting patterns the user may not have noticed.
- Use incomplete tasks gently. Do not shame the user.
- Do not list every task.
- Do not focus on exact calculations.
- Do not invent facts.
- If you use external benchmarks or comparisons, use web search and cite the source.
- If no reliable source supports a comparison, do not make that comparison.
- Keep the tone encouraging, personal, and reflective.
- Return only the final letter content, no markdown table.

Use the user's preferred language: {preferredLanguage}.
Month: {monthLabel}.
Task data:
{taskJson}
```

### Acceptance Criteria

- Prompt is centralized in one file.
- Prompt explicitly says not to invent unsupported benchmark claims.
- Prompt returns one final letter, not structured commentary.

---

## PBI 6: Add Monthly Review AI Service

### Goal

Generate the letter using a direct LLM call.

### Backend File

Add:

```text
blotztask-api/Modules/MonthlyReviews/Services/MonthlyReviewAiService.cs
```

Behavior:

1. Accept preferred language, month label, and task snapshot JSON.
2. Call the configured Azure OpenAI model directly.
3. Use reasoning effort `medium`.
4. Use web search only if supported cleanly by the current Azure OpenAI API path.
5. Return:
   ```text
   aiGeneratedLetter
   aiModel
   ```

Implementation note:

If SDK support for web search is awkward, use a small typed REST client. Do not introduce a large abstraction or agent framework for v1.

### Acceptance Criteria

- No AI agent is used.
- Reasoning effort is set to `medium`.
- The service returns only the generated letter and model metadata.
- External benchmark claims are only allowed when sources are available.
- AI failures are handled with a clear exception path.

---

## PBI 7: Add Generate Monthly Review Command

### Goal

Create and save a monthly review when one does not already exist.

### Backend File

Add:

```text
blotztask-api/Modules/MonthlyReviews/Commands/GenerateMonthlyReview.cs
```

Behavior:

1. Check whether a report already exists for `UserId + year + month`.
2. If it exists, return it.
3. If not, resolve the user's report month boundaries from a backend timezone source.
4. Build the monthly task snapshot.
5. Serialize the snapshot into `AiInputSnapshotJson`.
6. Generate the letter through `MonthlyReviewAiService`.
7. Save `MonthlyReviewReport`.
8. Return `MonthlyReviewDto`.

### Acceptance Criteria

- Reopening the same month returns the existing saved letter.
- The LLM is not called again when a saved report exists.
- `AiInputSnapshotJson` stores exactly what the LLM saw.
- `AiGeneratedLetter` and `AiModel` are saved.
- The command can be called by a backend scheduled trigger without frontend input.

---

## PBI 8: Add Monthly Review Controller

### Goal

Expose saved monthly reviews through an authenticated API endpoint.

### Backend File

Add:

```text
blotztask-api/Modules/MonthlyReviews/Controllers/MonthlyReviewController.cs
```

Endpoint:

```text
GET /MonthlyReview?year={year}&month={month}
```

Behavior:

1. Read `UserId` from `HttpContext.Items`.
2. Validate `year` and `month`.
3. Return the saved `MonthlyReviewReport` for that user/month.
4. If the report does not exist, return a clear empty/not-ready response instead of silently generating from the frontend request.

### Acceptance Criteria

- Endpoint requires authenticated user context.
- Invalid month values are rejected.
- Missing user id returns unauthorized behavior consistent with existing controllers.
- Endpoint returns a saved monthly review when one exists.
- Endpoint does not make the user-facing frontend request the primary monthly generation trigger.

---

## PBI 8A: Add Backend Monthly Generation Trigger Path

### Goal

Create a backend-only path that can generate missing monthly reports automatically once per month.

### Backend Options

There is no existing scheduler framework in the backend today. Keep v1 simple by implementing the generation command/service first, then wire it to one scheduler option:

```text
Option A: IHostedService / BackgroundService inside the API
Option B: Azure Function / external scheduler calls an internal endpoint
Option C: Manual internal endpoint first, then automate later
```

Preferred v1 if you want the least app-service complexity:

```text
Use an internal endpoint protected by an API key or admin-only auth.
Trigger it monthly from Azure, GitHub Actions, or another scheduler.
```

Example internal endpoint:

```text
POST /MonthlyReview/internal/generate?year={year}&month={month}
```

Behavior:

1. Validate internal authorization.
2. Find users who should receive a monthly report.
3. For each user, resolve the report month boundaries from stored timezone/latest known offset.
4. If no timezone is stored, use UTC fallback and document it.
5. Skip users who already have `MonthlyReviewReport` for `UserId + Year + Month`.
6. Generate and save missing reports.

### Acceptance Criteria

- Generation can run without frontend input.
- The scheduled path is idempotent.
- Existing reports are not regenerated.
- Missing timezone has a documented fallback.
- Failures for one user do not stop generation for every other user.

---

## PBI 9: Connect Mobile API Service

### Goal

Add a frontend service for loading monthly reviews.

### Frontend File

Add:

```text
blotztask-mobile/src/feature/settings/services/monthly-review-service.ts
```

Behavior:

Call:

```text
GET /MonthlyReview?year={year}&month={month}
```

Return:

```text
MonthlyReviewDto
```

TypeScript rule:

- Do not use `any`.

### Acceptance Criteria

- Service uses existing `apiClient`.
- Response type is explicitly defined.
- Errors are allowed to bubble to the screen/query layer.
- Service reads saved reports only. It does not trigger AI generation.

---

## PBI 10: Replace Mock Reports In Monthly Review Screen

### Goal

Use the real API instead of `MOCK_REPORTS`.

### Frontend File

Update:

```text
blotztask-mobile/src/feature/settings/screens/settings-monthly-review-screen.tsx
```

Behavior:

1. Remove `MOCK_REPORTS`.
2. Request the saved report for the selected month from the backend.
3. Show loading state while loading.
4. Show error state if loading fails.
5. Show empty/not-ready state if backend returns no saved report.
6. Show the saved monthly review letter in the existing letter UI.

### Acceptance Criteria

- Month navigation triggers the correct report request.
- Current letter design remains intact.
- Loading, error, empty, and success states are visible.
- No TypeScript `any` is introduced.

---

## PBI 11: Add Localization Text

### Goal

Add or update copy needed for loading/error states.

### Frontend Files

Update:

```text
blotztask-mobile/src/i18n/locales/en/settings.json
blotztask-mobile/src/i18n/locales/zh/settings.json
```

Possible keys:

```text
monthlyReview.loading
monthlyReview.error
monthlyReview.retry
monthlyReview.empty
```

### Acceptance Criteria

- English and Chinese locale files have matching keys.
- Monthly review screen uses translation keys, not hardcoded user-facing text.

---

## PBI 12: Verification

### Goal

Check that the feature builds and works at a basic level.

### Commands

Run backend build:

```text
dotnet build blotztask-api/BlotzTask.slnx
```

Run the nearest frontend typecheck/lint command available in `blotztask-mobile/package.json`.

### Manual Checks

1. Generate a report for a month with tasks.
2. Reopen the same month and confirm the saved report is returned.
3. Generate a report for a month with no tasks.
4. Switch month in the mobile UI.
5. Confirm no raw task data is sent to PostHog.

### Acceptance Criteria

- Backend builds.
- Frontend typecheck/lint passes or known unrelated failures are documented.
- Same month does not regenerate the LLM response repeatedly.
- Monthly review displays correctly in the mobile screen.

---

## Out Of Scope For V1

- General AI memory.
- RAG/vector search.
- PostHog integration.
- Custom label analytics.
- Cross-user benchmark calculations.
- Advanced report editing/regeneration controls.
- Push notifications for monthly report availability.
