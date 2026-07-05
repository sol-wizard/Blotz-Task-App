# Recurring Overlap Occurrences Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow future recurring task edits to create a new template anchored on the user-selected date, even when that date overlaps earlier occurrences from the same series.

**Architecture:** Treat a recurring occurrence as `RecurringTaskId + OccurrenceDate` everywhere an override suppresses, materializes, modifies, or deletes a virtual occurrence. Keep `SeriesId` as the grouping concept for template versions, but stop using `SeriesId + OccurrenceDate` as occurrence identity. The mobile app sends future edit recurrence details derived from the edited task start date and invalidates both the old effective date and new anchor date.

**Tech Stack:** ASP.NET Core, EF Core, SQL Server, xUnit, FluentAssertions, Testcontainers.MsSql, React Native, TypeScript, React Query.

---

## Required Project-Local Skills During Execution

- Read and follow `.claude/skills/backend-changes/SKILL.md` before modifying `blotztask-api/`.
- Read and follow `.claude/skills/writing-tests/SKILL.md` before modifying `blotztask-test/`.
- Read and follow `.claude/skills/database-migrations/SKILL.md` before changing EF entity configuration. Do not run `dotnet ef migrations add` or `dotnet ef database update`; give those commands to the user.

## Current Workspace Warning

At plan-writing time, these files already have uncommitted draft changes:

- `blotztask-api/Modules/Tasks/Commands/RecurringTasks/UpdateRecurringTaskFuture.cs`
- `blotztask-mobile/src/feature/task-add-edit/screens/task-edit-screen.tsx`
- `blotztask-mobile/src/shared/hooks/useTaskMutations.ts`
- `blotztask-test/Commands/UpdateRecurringTaskFutureTests.cs`

Execution workers must inspect those diffs first and build on them. Do not revert them unless the user explicitly asks.

## File Structure

- Modify `blotztask-api/Modules/Tasks/Commands/RecurringTasks/UpdateRecurringTaskFuture.cs`
  - Derive the future template anchor from `TaskDetails.StartTime`.
  - Allow the anchor to be before `EffectiveDate`.
  - Use the anchor for recurrence pattern defaults and deadline offset.

- Modify `blotztask-api/Modules/Tasks/Domain/Services/RecurringOccurrenceMaterializer.cs`
  - Find existing overrides by `RecurringTaskId + OccurrenceDate`.
  - Avoid redirecting a valid requested template to another same-series template.

- Modify `blotztask-api/Infrastructure/Data/Configurations/RecurringOccurrenceOverrideConfiguration.cs`
  - Replace the unique index from `SeriesId + OccurrenceDate` to `RecurringTaskId + OccurrenceDate`.

- Modify `blotztask-api/Modules/Tasks/Queries/Tasks/GetTasksByDate.cs`
  - Use `RecurringTaskId + OccurrenceDate` for override suppression.

- Modify `blotztask-api/Modules/Tasks/Queries/Tasks/GetWeeklyTaskAvailability.cs`
  - Use `RecurringTaskId + OccurrenceDate` for override suppression.

- Modify `blotztask-api/Modules/Tasks/Queries/Tasks/GetMonthlyTaskAvailability.cs`
  - Use `RecurringTaskId + OccurrenceDate` for override suppression.

- Modify `blotztask-api/Modules/Tasks/Queries/Deadlines/GetAllDdlTasks.cs`
  - Stop grouping recurring deadline occurrences by series.
  - Use `RecurringTaskId + OccurrenceDate` for override lookup.

- Modify `blotztask-mobile/src/feature/task-add-edit/screens/task-edit-screen.tsx`
  - Derive recurrence anchor, weekly flags, and monthly day from `formValues.startTime`.
  - Send recurrence details on every future edit.
  - Update virtual cache metadata to the new recurring task id and anchor occurrence date.

- Modify `blotztask-mobile/src/shared/hooks/useTaskMutations.ts`
  - Invalidate both the original effective date and the new task date.
  - Clear virtual task detail cache after future edits.

- Modify or create `blotztask-test/Commands/UpdateRecurringTaskFutureTests.cs`
  - Cover future edit anchoring and override migration behavior.

- Create `blotztask-test/Commands/RecurringOccurrenceMaterializerTests.cs`
  - Cover two overlapping same-series occurrences materializing independently.

- Create `blotztask-test/Queries/GetTasksByDateRecurringOverlapTests.cs`
  - Cover query behavior for overlapping same-series virtual and overridden occurrences.

- Create or extend deadline query tests if an existing test file is present; otherwise create `blotztask-test/Queries/GetAllDdlTasksRecurringOverlapTests.cs`.
  - Cover multiple active deadline templates in the same series.

---

### Task 1: Add Future Edit Anchor Tests

**Files:**
- Modify: `blotztask-test/Commands/UpdateRecurringTaskFutureTests.cs`

- [ ] **Step 1: Inspect existing draft test file**

Run:

```bash
sed -n '1,360p' blotztask-test/Commands/UpdateRecurringTaskFutureTests.cs
```

Expected: the file may already contain draft tests for future anchor behavior. Keep useful draft coverage and adjust names/assertions to match this plan.

- [ ] **Step 2: Add or update the daily overlap test**

Add this test to `UpdateRecurringTaskFutureTests`:

```csharp
[Fact]
public async Task Handle_DailyFutureEditMovesAnchorBeforeEffectiveDate_AllowsOverlappingSameSeriesOccurrences()
{
    // Arrange
    var userId = await _seeder.CreateUserAsync();
    var recurring = await _seeder.CreateRecurringTaskAsync(
        userId,
        title: "Daily review",
        frequency: RecurrenceFrequency.Daily,
        startDate: new DateOnly(2026, 7, 2),
        templateStartTime: new DateTimeOffset(2026, 7, 2, 9, 0, 0, TimeSpan.FromHours(8)));

    // Act
    var futureRecurringTaskId = await _handler.Handle(new UpdateRecurringTaskFutureCommand
    {
        RecurringTaskId = recurring.Id,
        EffectiveDate = new DateOnly(2026, 7, 4),
        UserId = userId,
        Frequency = RecurrenceFrequency.Daily,
        Interval = 1,
        TaskDetails = BuildTaskDetails(
            "Daily review shifted",
            new DateTimeOffset(2026, 7, 2, 10, 0, 0, TimeSpan.FromHours(8)))
    }, CancellationToken.None);

    var oldTemplate = await _context.RecurringTasks.SingleAsync(r => r.Id == recurring.Id);
    var futureTemplate = await _context.RecurringTasks.SingleAsync(r => r.Id == futureRecurringTaskId);

    // Assert
    oldTemplate.EndDate.Should().Be(new DateOnly(2026, 7, 3),
        because: "future edits still split the old template at the selected effective occurrence");
    oldTemplate.IsActive.Should().BeTrue(
        because: "the old template still owns occurrences before the effective date");
    futureTemplate.StartDate.Should().Be(new DateOnly(2026, 7, 2),
        because: "the new future template is anchored to the user-selected task date");
    futureTemplate.SeriesId.Should().Be(oldTemplate.SeriesId,
        because: "the new template remains part of the same recurring series");
    _generatorService.IsOccurrenceOn(oldTemplate, new DateOnly(2026, 7, 2)).Should().BeTrue(
        because: "the old template keeps its original occurrence on the overlapping date");
    _generatorService.IsOccurrenceOn(futureTemplate, new DateOnly(2026, 7, 2)).Should().BeTrue(
        because: "the new template also begins on the overlapping date");
}
```

- [ ] **Step 3: Add override migration boundary test**

Add this test:

```csharp
[Fact]
public async Task Handle_FutureEditWithEarlierAnchor_MigratesOnlyOverridesOnOrAfterEffectiveDate()
{
    // Arrange
    var userId = await _seeder.CreateUserAsync();
    var recurring = await _seeder.CreateRecurringTaskAsync(
        userId,
        title: "Daily review",
        frequency: RecurrenceFrequency.Daily,
        startDate: new DateOnly(2026, 7, 2),
        templateStartTime: new DateTimeOffset(2026, 7, 2, 9, 0, 0, TimeSpan.FromHours(8)));

    var beforeEffectiveOverride = await _seeder.CreateRecurringOccurrenceOverrideAsync(
        recurring,
        new DateOnly(2026, 7, 3),
        RecurringOccurrenceOverrideType.Materialized,
        _generatorService.CreateTaskItem(recurring, new DateOnly(2026, 7, 3)));

    var atEffectiveOverride = await _seeder.CreateRecurringOccurrenceOverrideAsync(
        recurring,
        new DateOnly(2026, 7, 4),
        RecurringOccurrenceOverrideType.Materialized,
        _generatorService.CreateTaskItem(recurring, new DateOnly(2026, 7, 4)));

    // Act
    var futureRecurringTaskId = await _handler.Handle(new UpdateRecurringTaskFutureCommand
    {
        RecurringTaskId = recurring.Id,
        EffectiveDate = new DateOnly(2026, 7, 4),
        UserId = userId,
        Frequency = RecurrenceFrequency.Daily,
        Interval = 1,
        TaskDetails = BuildTaskDetails(
            "Daily review shifted",
            new DateTimeOffset(2026, 7, 2, 10, 0, 0, TimeSpan.FromHours(8)))
    }, CancellationToken.None);

    var reloadedBefore = await _context.RecurringOccurrenceOverrides
        .SingleAsync(o => o.Id == beforeEffectiveOverride.Id);
    var reloadedAtEffective = await _context.RecurringOccurrenceOverrides
        .SingleAsync(o => o.Id == atEffectiveOverride.Id);

    // Assert
    reloadedBefore.RecurringTaskId.Should().Be(recurring.Id,
        because: "overrides before the effective date stay attached to the old template");
    reloadedAtEffective.RecurringTaskId.Should().Be(futureRecurringTaskId,
        because: "overrides on or after the effective date move to the future template");
}
```

- [ ] **Step 4: Remove or rewrite the old rejection test**

If the file contains `Handle_FutureStartDateBeforeEffectiveDate_ThrowsValidationException`, delete it or replace it with `Handle_DailyFutureEditMovesAnchorBeforeEffectiveDate_AllowsOverlappingSameSeriesOccurrences`.

- [ ] **Step 5: Run the target command tests and verify failures**

Run:

```bash
cd blotztask-test && dotnet test --filter FullyQualifiedName~UpdateRecurringTaskFutureTests
```

Expected before implementation: at least one failure because `futureStartDate < EffectiveDate` is not yet fully supported, or because existing draft implementation/test expectations are incomplete.

- [ ] **Step 6: Commit tests**

```bash
git add blotztask-test/Commands/UpdateRecurringTaskFutureTests.cs
git commit -m "test: cover recurring future overlap anchor"
```

---

### Task 2: Implement Future Template Anchor In UpdateRecurringTaskFuture

**Files:**
- Modify: `blotztask-api/Modules/Tasks/Commands/RecurringTasks/UpdateRecurringTaskFuture.cs`
- Test: `blotztask-test/Commands/UpdateRecurringTaskFutureTests.cs`

- [ ] **Step 1: Inspect current draft implementation**

Run:

```bash
git diff -- blotztask-api/Modules/Tasks/Commands/RecurringTasks/UpdateRecurringTaskFuture.cs
```

Expected: there may already be draft code deriving `futureStartDate`. Keep it only if it matches this task.

- [ ] **Step 2: Remove rejection of anchors before EffectiveDate**

In `Handle`, after `TaskTimeValidator.ValidateTaskTimes(...)`, keep the anchor:

```csharp
var futureStartDate = DateOnly.FromDateTime(command.TaskDetails.StartTime.Date);
```

Do not keep this validation block:

```csharp
if (futureStartDate < command.EffectiveDate)
{
    throw new ValidationException("Future task start date cannot be before EffectiveDate.");
}
```

- [ ] **Step 3: Pass futureStartDate into pattern creation, recurrence validation, and template creation**

The non-stop-repeating path should use:

```csharp
var targetFrequency = command.Frequency ?? template.Pattern.Frequency;
ValidateRecurrenceFieldUsage(command, targetFrequency);

var newPattern = BuildPattern(template, command, targetFrequency, futureStartDate);
var newEndDate = command.EndDateChanged ? command.EndDate : template.EndDate;
ValidateRecurrence(newPattern, futureStartDate, newEndDate);

var futureTemplate = BuildFutureTemplate(template, command, newPattern, futureStartDate, newEndDate);
TruncateTemplate(template, command.EffectiveDate);
```

- [ ] **Step 4: Update BuildPattern signature and monthly default**

Change `BuildPattern` to:

```csharp
private static RecurrencePattern BuildPattern(
    RecurringTask template,
    UpdateRecurringTaskFutureCommand command,
    RecurrenceFrequency frequency,
    DateOnly futureStartDate)
{
    return new RecurrencePattern
    {
        Frequency = frequency,
        Interval = command.Interval ?? template.Pattern.Interval,
        DaysOfWeek = frequency == RecurrenceFrequency.Weekly
            ? command.DaysOfWeek ?? template.Pattern.DaysOfWeek
            : null,
        DayOfMonth = frequency == RecurrenceFrequency.Monthly
            ? command.DayOfMonth ?? futureStartDate.Day
            : null
    };
}
```

- [ ] **Step 5: Update BuildFutureTemplate signature and fields**

Change `BuildFutureTemplate` to accept `DateOnly futureStartDate` and use:

```csharp
var deadlineTemplate = BuildDeadlineTemplate(details, futureStartDate, command.DeadlineTimeZoneId);
```

and:

```csharp
StartDate = futureStartDate,
```

- [ ] **Step 6: Clarify validation message for end date**

In `ValidateRecurrence`, keep the existing condition but use an anchor-aware message:

```csharp
if (endDate != null && endDate < startDate)
{
    throw new ValidationException("EndDate must be later than or equal to the recurring task start date.");
}
```

- [ ] **Step 7: Run target tests**

Run:

```bash
cd blotztask-test && dotnet test --filter FullyQualifiedName~UpdateRecurringTaskFutureTests
```

Expected: `UpdateRecurringTaskFutureTests` passes.

- [ ] **Step 8: Commit implementation**

```bash
git add blotztask-api/Modules/Tasks/Commands/RecurringTasks/UpdateRecurringTaskFuture.cs blotztask-test/Commands/UpdateRecurringTaskFutureTests.cs
git commit -m "feat: anchor recurring future edits on task date"
```

---

### Task 3: Change Override Identity In Materializer And EF Configuration

**Files:**
- Modify: `blotztask-api/Modules/Tasks/Domain/Services/RecurringOccurrenceMaterializer.cs`
- Modify: `blotztask-api/Infrastructure/Data/Configurations/RecurringOccurrenceOverrideConfiguration.cs`
- Create: `blotztask-test/Commands/RecurringOccurrenceMaterializerTests.cs`

- [ ] **Step 1: Add materializer test file**

Create `blotztask-test/Commands/RecurringOccurrenceMaterializerTests.cs` with:

```csharp
using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.Tasks.Domain.Services;
using BlotzTask.Modules.Tasks.Enums;
using BlotzTask.Tests.Fixtures;
using BlotzTask.Tests.Helpers;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;

namespace BlotzTask.Tests.Commands;

public class RecurringOccurrenceMaterializerTests : IClassFixture<DatabaseFixture>
{
    private readonly BlotzTaskDbContext _context;
    private readonly DataSeeder _seeder;
    private readonly RecurringTaskGeneratorService _generatorService;
    private readonly RecurringOccurrenceMaterializer _materializer;

    public RecurringOccurrenceMaterializerTests(DatabaseFixture fixture)
    {
        _context = new BlotzTaskDbContext(fixture.Options);
        _seeder = new DataSeeder(_context);
        _generatorService = new RecurringTaskGeneratorService();
        _materializer = new RecurringOccurrenceMaterializer(_context, _generatorService);
    }

    [Fact]
    public async Task EnsureRecurringOccurrenceTaskItem_SameSeriesSameDateDifferentTemplates_CreatesSeparateTaskItems()
    {
        // Arrange
        var userId = await _seeder.CreateUserAsync();
        var oldTemplate = await _seeder.CreateRecurringTaskAsync(
            userId,
            title: "Daily review",
            frequency: RecurrenceFrequency.Daily,
            startDate: new DateOnly(2026, 7, 2),
            templateStartTime: new DateTimeOffset(2026, 7, 2, 9, 0, 0, TimeSpan.FromHours(8)),
            endDate: new DateOnly(2026, 7, 3));

        var futureTemplate = await _seeder.CreateRecurringTaskVersionAsync(
            oldTemplate,
            title: "Daily review shifted",
            startDate: new DateOnly(2026, 7, 2),
            templateStartTime: new DateTimeOffset(2026, 7, 2, 10, 0, 0, TimeSpan.FromHours(8)));

        // Act
        var oldTaskItem = await _materializer.EnsureRecurringOccurrenceTaskItem(
            oldTemplate.Id,
            new DateOnly(2026, 7, 2),
            userId,
            CancellationToken.None);
        var futureTaskItem = await _materializer.EnsureRecurringOccurrenceTaskItem(
            futureTemplate.Id,
            new DateOnly(2026, 7, 2),
            userId,
            CancellationToken.None);

        var overrides = await _context.RecurringOccurrenceOverrides
            .Where(o => o.SeriesId == oldTemplate.SeriesId && o.OccurrenceDate == new DateOnly(2026, 7, 2))
            .OrderBy(o => o.RecurringTaskId)
            .ToListAsync();

        // Assert
        oldTaskItem.Id.Should().NotBe(futureTaskItem.Id,
            because: "overlapping template occurrences are separate task items");
        overrides.Should().HaveCount(2,
            because: "same-series same-date overrides are unique by recurring template");
        overrides.Select(o => o.RecurringTaskId).Should().BeEquivalentTo(
            new[] { oldTemplate.Id, futureTemplate.Id },
            because: "each override belongs to its concrete recurring template");
    }
}
```

- [ ] **Step 2: Add DataSeeder helper for template versions**

Modify `blotztask-test/Helpers/DataSeeder.cs` by adding:

```csharp
public async Task<RecurringTask> CreateRecurringTaskVersionAsync(
    RecurringTask previousTemplate,
    string title,
    DateOnly startDate,
    DateTimeOffset templateStartTime,
    DateTimeOffset? templateEndTime = null,
    RecurrenceFrequency? frequency = null,
    int interval = 1,
    int? daysOfWeek = null,
    int? dayOfMonth = null,
    DateOnly? endDate = null)
{
    var recurring = new RecurringTask
    {
        UserId = previousTemplate.UserId,
        SeriesId = previousTemplate.SeriesId,
        PreviousRecurringTaskId = previousTemplate.Id,
        Title = title,
        TimeType = templateEndTime == null ? TaskTimeType.SingleTime : TaskTimeType.RangeTime,
        TemplateStartTime = templateStartTime,
        TemplateEndTime = templateEndTime,
        ScheduleTimeZoneId = previousTemplate.ScheduleTimeZoneId,
        IsDeadline = previousTemplate.IsDeadline,
        DeadlineOffsetDays = previousTemplate.DeadlineOffsetDays,
        DeadlineTimeOfDay = previousTemplate.DeadlineTimeOfDay,
        DeadlineTimeZoneId = previousTemplate.DeadlineTimeZoneId,
        Pattern = new RecurrencePattern
        {
            Frequency = frequency ?? previousTemplate.Pattern.Frequency,
            Interval = interval,
            DaysOfWeek = daysOfWeek,
            DayOfMonth = dayOfMonth
        },
        StartDate = startDate,
        EndDate = endDate,
        IsActive = true,
        CreatedAt = DateTime.UtcNow,
        UpdatedAt = DateTime.UtcNow
    };

    _context.RecurringTasks.Add(recurring);
    await _context.SaveChangesAsync();
    return recurring;
}
```

Ensure `DataSeeder` contains this helper with the exact signature and behavior shown above.

- [ ] **Step 3: Run materializer test and verify failure**

Run:

```bash
cd blotztask-test && dotnet test --filter FullyQualifiedName~RecurringOccurrenceMaterializerTests
```

Expected before implementation: FAIL because the materializer and database index still treat same-series same-date overrides as one occurrence.

- [ ] **Step 4: Change materializer lookup key**

In `RecurringOccurrenceMaterializer.cs`, change calls to:

```csharp
var existingOverride = await FindExistingOverride(template.Id, occurrenceDate, userId, ct);
```

and in the catch block:

```csharp
var existingAfterConflict = await FindExistingOverride(template.Id, occurrenceDate, userId, ct);
```

Change the helper signature and query:

```csharp
private Task<RecurringOccurrenceOverride?> FindExistingOverride(
    int recurringTaskId,
    DateOnly occurrenceDate,
    Guid userId,
    CancellationToken ct)
{
    return db.RecurringOccurrenceOverrides
        .Include(o => o.TaskItem)
        .SingleOrDefaultAsync(o => o.RecurringTaskId == recurringTaskId
            && o.OccurrenceDate == occurrenceDate
            && o.Series.UserId == userId, ct);
}
```

- [ ] **Step 5: Keep requested valid template instead of redirecting**

In `ResolveTemplateForOccurrence`, keep this early return:

```csharp
if (IsTemplateEffectiveOn(requestedTemplate, occurrenceDate))
{
    return requestedTemplate;
}
```

If the requested template is not effective on the date, throw the current validation error rather than selecting another same-series template:

```csharp
throw new ValidationException("Occurrence date is outside recurring task range.");
```

Remove the query that searches for another active template in the same series from `RecurringOccurrenceMaterializer`. Series-level lookup remains in commands that explicitly split or delete future versions.

- [ ] **Step 6: Change EF unique index**

In `RecurringOccurrenceOverrideConfiguration.cs`, replace:

```csharp
builder.HasIndex(o => new { o.SeriesId, o.OccurrenceDate })
    .IsUnique();
```

with:

```csharp
builder.HasIndex(o => new { o.RecurringTaskId, o.OccurrenceDate })
    .IsUnique();
```

- [ ] **Step 7: Run materializer test**

Run:

```bash
cd blotztask-test && dotnet test --filter FullyQualifiedName~RecurringOccurrenceMaterializerTests
```

Expected: PASS.

- [ ] **Step 8: Commit materializer and index config**

```bash
git add blotztask-api/Modules/Tasks/Domain/Services/RecurringOccurrenceMaterializer.cs \
  blotztask-api/Infrastructure/Data/Configurations/RecurringOccurrenceOverrideConfiguration.cs \
  blotztask-test/Commands/RecurringOccurrenceMaterializerTests.cs \
  blotztask-test/Helpers/DataSeeder.cs
git commit -m "feat: key recurring overrides by template occurrence"
```

- [ ] **Step 9: Give the user migration commands**

Do not run these commands. Tell the user to run from `blotztask-api/`:

```bash
dotnet ef migrations add AllowRecurringOverridePerTemplateOccurrence
dotnet ef database update
```

Generated migration files will land under `blotztask-api/Infrastructure/Data/Migrations/`.

---

### Task 4: Update Calendar And Availability Queries

**Files:**
- Modify: `blotztask-api/Modules/Tasks/Queries/Tasks/GetTasksByDate.cs`
- Modify: `blotztask-api/Modules/Tasks/Queries/Tasks/GetWeeklyTaskAvailability.cs`
- Modify: `blotztask-api/Modules/Tasks/Queries/Tasks/GetMonthlyTaskAvailability.cs`
- Create: `blotztask-test/Queries/GetTasksByDateRecurringOverlapTests.cs`

- [ ] **Step 1: Add query test for overlapping virtual occurrences**

Create `blotztask-test/Queries/GetTasksByDateRecurringOverlapTests.cs`:

```csharp
using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.Tasks.Domain.Services;
using BlotzTask.Modules.Tasks.Enums;
using BlotzTask.Modules.Tasks.Queries.Tasks;
using BlotzTask.Tests.Fixtures;
using BlotzTask.Tests.Helpers;
using FluentAssertions;

namespace BlotzTask.Tests.Queries;

public class GetTasksByDateRecurringOverlapTests : IClassFixture<DatabaseFixture>
{
    private readonly BlotzTaskDbContext _context;
    private readonly DataSeeder _seeder;
    private readonly GetTasksByDateQueryHandler _handler;

    public GetTasksByDateRecurringOverlapTests(DatabaseFixture fixture)
    {
        _context = new BlotzTaskDbContext(fixture.Options);
        _seeder = new DataSeeder(_context);
        _handler = new GetTasksByDateQueryHandler(
            _context,
            new RecurringTaskGeneratorService(),
            TestDbContextFactory.CreateLogger<GetTasksByDateQueryHandler>());
    }

    [Fact]
    public async Task Handle_SameSeriesSameDateOldTemplateSkipped_ReturnsFutureTemplateOccurrence()
    {
        // Arrange
        var userId = await _seeder.CreateUserAsync();
        var oldTemplate = await _seeder.CreateRecurringTaskAsync(
            userId,
            title: "Daily review",
            frequency: RecurrenceFrequency.Daily,
            startDate: new DateOnly(2026, 7, 2),
            templateStartTime: new DateTimeOffset(2026, 7, 2, 9, 0, 0, TimeSpan.FromHours(8)),
            endDate: new DateOnly(2026, 7, 3));
        var futureTemplate = await _seeder.CreateRecurringTaskVersionAsync(
            oldTemplate,
            title: "Daily review shifted",
            startDate: new DateOnly(2026, 7, 2),
            templateStartTime: new DateTimeOffset(2026, 7, 2, 10, 0, 0, TimeSpan.FromHours(8)));
        await _seeder.CreateRecurringOccurrenceOverrideAsync(
            oldTemplate,
            new DateOnly(2026, 7, 2),
            RecurringOccurrenceOverrideType.Skipped);

        // Act
        var result = await _handler.Handle(new GetTasksByDateQuery
        {
            UserId = userId,
            StartDate = new DateTimeOffset(2026, 7, 2, 0, 0, 0, TimeSpan.FromHours(8)),
            IncludeFloatingForToday = false
        });

        // Assert
        result
            .Where(t => t.RecurringOccurrence?.OccurrenceDate == new DateOnly(2026, 7, 2))
            .Select(t => t.RecurringOccurrence!.RecurringTaskId)
            .Should().BeEquivalentTo(new[] { futureTemplate.Id },
                because: "a skipped override for the old template must not suppress the overlapping future template");
    }
}
```

- [ ] **Step 2: Run query test and verify failure**

Run:

```bash
cd blotztask-test && dotnet test --filter FullyQualifiedName~GetTasksByDateRecurringOverlapTests
```

Expected before implementation: FAIL if an override or query key still collapses by series/date.

- [ ] **Step 3: Update GetTasksByDate override map**

In `GetTasksByDate.cs`, replace:

```csharp
var overrideMap = overrides.ToDictionary(o => (o.SeriesId, o.OccurrenceDate), o => o);
```

with:

```csharp
var overrideMap = overrides.ToDictionary(o => (o.RecurringTaskId, o.OccurrenceDate), o => o);
```

Replace lookup:

```csharp
(recurring.SeriesId, occurrenceWindow.OccurrenceDate)
```

with:

```csharp
(recurring.Id, occurrenceWindow.OccurrenceDate)
```

- [ ] **Step 4: Update weekly availability override keys**

In `GetWeeklyTaskAvailability.cs`, change the override projection to:

```csharp
.Select(o => new
{
    o.RecurringTaskId,
    o.OccurrenceDate
})
```

Change the hash set to:

```csharp
var recurringOverrideKeys = recurringOverrides
    .Select(o => (o.RecurringTaskId, o.OccurrenceDate))
    .ToHashSet();
```

Change occurrence suppression to:

```csharp
.Any(o => !recurringOverrideKeys.Contains((r.Id, o.OccurrenceDate)))
```

- [ ] **Step 5: Update monthly availability override keys**

In `GetMonthlyTaskAvailability.cs`, make the same three changes as weekly availability:

```csharp
.Select(o => new
{
    o.RecurringTaskId,
    o.OccurrenceDate
})
```

```csharp
var recurringOverrideKeys = recurringOverrides
    .Select(o => (o.RecurringTaskId, o.OccurrenceDate))
    .ToHashSet();
```

```csharp
.Any(o => !recurringOverrideKeys.Contains((r.Id, o.OccurrenceDate)))
```

- [ ] **Step 6: Run query and availability tests**

Run:

```bash
cd blotztask-test && dotnet test --filter "FullyQualifiedName~GetTasksByDateRecurringOverlapTests|FullyQualifiedName~WeeklyTaskAvailability|FullyQualifiedName~MonthlyTaskAvailability"
```

Expected: PASS for every discovered test matching the filter. If the filter discovers only `GetTasksByDateRecurringOverlapTests`, that test must pass.

- [ ] **Step 7: Commit query changes**

```bash
git add blotztask-api/Modules/Tasks/Queries/Tasks/GetTasksByDate.cs \
  blotztask-api/Modules/Tasks/Queries/Tasks/GetWeeklyTaskAvailability.cs \
  blotztask-api/Modules/Tasks/Queries/Tasks/GetMonthlyTaskAvailability.cs \
  blotztask-test/Queries/GetTasksByDateRecurringOverlapTests.cs
git commit -m "fix: query recurring overrides by template occurrence"
```

---

### Task 5: Update Recurring Deadline Query

**Files:**
- Modify: `blotztask-api/Modules/Tasks/Queries/Deadlines/GetAllDdlTasks.cs`
- Create: `blotztask-test/Queries/GetAllDdlTasksRecurringOverlapTests.cs`

- [ ] **Step 1: Add deadline overlap test**

Create `blotztask-test/Queries/GetAllDdlTasksRecurringOverlapTests.cs`:

```csharp
using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.Tasks.Domain.Services;
using BlotzTask.Modules.Tasks.Enums;
using BlotzTask.Modules.Tasks.Queries.Deadlines;
using BlotzTask.Tests.Fixtures;
using BlotzTask.Tests.Helpers;
using FluentAssertions;

namespace BlotzTask.Tests.Queries;

public class GetAllDdlTasksRecurringOverlapTests : IClassFixture<DatabaseFixture>
{
    private readonly BlotzTaskDbContext _context;
    private readonly DataSeeder _seeder;
    private readonly GetAllDdlTasksQueryHandler _handler;

    public GetAllDdlTasksRecurringOverlapTests(DatabaseFixture fixture)
    {
        _context = new BlotzTaskDbContext(fixture.Options);
        _seeder = new DataSeeder(_context);
        _handler = new GetAllDdlTasksQueryHandler(
            _context,
            new RecurringTaskGeneratorService(),
            TestDbContextFactory.CreateLogger<GetAllDdlTasksQueryHandler>());
    }

    [Fact]
    public async Task Handle_SameSeriesOverlappingDeadlineTemplates_ReturnsCurrentOccurrenceForEachTemplate()
    {
        // Arrange
        var userId = await _seeder.CreateUserAsync();
        var oldTemplate = await _seeder.CreateRecurringTaskAsync(
            userId,
            title: "Pay bill",
            frequency: RecurrenceFrequency.Daily,
            startDate: new DateOnly(2026, 7, 2),
            templateStartTime: new DateTimeOffset(2026, 7, 2, 9, 0, 0, TimeSpan.FromHours(8)),
            endDate: new DateOnly(2026, 7, 3),
            isDeadline: true,
            deadlineOffsetDays: 0,
            deadlineTimeOfDay: new TimeOnly(18, 0),
            deadlineTimeZoneId: "Australia/Perth");
        await _seeder.CreateRecurringTaskVersionAsync(
            oldTemplate,
            title: "Pay bill shifted",
            startDate: new DateOnly(2026, 7, 2),
            templateStartTime: new DateTimeOffset(2026, 7, 2, 10, 0, 0, TimeSpan.FromHours(8)));

        // Act
        var result = await _handler.Handle(new GetAllDdlTasksQuery
        {
            UserId = userId,
            Now = new DateTimeOffset(2026, 7, 2, 12, 0, 0, TimeSpan.FromHours(8))
        });

        // Assert
        result.Where(t => t.RecurringOccurrence?.OccurrenceDate == new DateOnly(2026, 7, 2))
            .Should().HaveCount(2,
                because: "same-series overlapping deadline templates each expose their current occurrence");
    }
}
```

`DataSeeder.CreateRecurringTaskAsync` already supports deadline parameters; use them exactly as shown above.

- [ ] **Step 2: Run deadline test and verify failure**

Run:

```bash
cd blotztask-test && dotnet test --filter FullyQualifiedName~GetAllDdlTasksRecurringOverlapTests
```

Expected before implementation: FAIL because `GetAllDdlTasks` groups by `SeriesId`.

- [ ] **Step 3: Replace currentOccurrencesBySeries with currentOccurrences**

In `GetAllDdlTasks.cs`, replace the `currentOccurrencesBySeries` pipeline with:

```csharp
var currentOccurrences = recurringDeadlineTemplates
    .Select(recurring => new CurrentRecurringDeadlineOccurrence(
        recurring,
        generatorService.GetCurrentOccurrenceDate(recurring, today)))
    .Where(x => x.OccurrenceDate != null)
    .ToList();
```

- [ ] **Step 4: Change override key record**

Replace:

```csharp
internal sealed record RecurringSeriesOccurrenceKey(int SeriesId, DateOnly OccurrenceDate);
```

with:

```csharp
internal sealed record RecurringTemplateOccurrenceKey(int RecurringTaskId, DateOnly OccurrenceDate);
```

- [ ] **Step 5: Change override lookup sets and dictionary**

Use:

```csharp
var currentRecurringTaskIds = currentOccurrences
    .Select(x => x.Recurring.Id)
    .ToHashSet();

var currentOccurrenceDates = currentOccurrences
    .Select(x => x.OccurrenceDate!.Value)
    .ToHashSet();
```

and:

```csharp
var recurringOverrideMap = await db.RecurringOccurrenceOverrides
    .AsNoTracking()
    .Include(o => o.TaskItem)
    .ThenInclude(t => t!.Deadline)
    .Include(o => o.TaskItem)
    .ThenInclude(t => t!.Label)
    .Where(o => o.Series.UserId == query.UserId
        && currentRecurringTaskIds.Contains(o.RecurringTaskId)
        && currentOccurrenceDates.Contains(o.OccurrenceDate))
    .ToDictionaryAsync(o => new RecurringTemplateOccurrenceKey(o.RecurringTaskId, o.OccurrenceDate), ct);
```

- [ ] **Step 6: Iterate currentOccurrences by template key**

Use:

```csharp
foreach (var currentOccurrence in currentOccurrences)
{
    var recurring = currentOccurrence.Recurring;
    var occurrenceDate = currentOccurrence.OccurrenceDate!.Value;

    var occurrenceKey = new RecurringTemplateOccurrenceKey(recurring.Id, occurrenceDate);
    if (recurringOverrideMap.TryGetValue(occurrenceKey, out var recurringOverride))
    {
        var materializedDdlTask = DeadlineTaskDtoFactory.ToDeadlineTaskDto(recurringOverride);
        if (materializedDdlTask != null)
        {
            ddlTasks.Add(materializedDdlTask);
        }

        continue;
    }

    ddlTasks.Add(new DeadlineTaskDto
    {
        Id = null,
        OccurrenceKind = TaskOccurrenceKind.VirtualRecurringOccurrence,
        RecurringOccurrence = new RecurringOccurrenceIdentityDto
        {
            RecurringTaskId = recurring.Id,
            OccurrenceDate = occurrenceDate
        },
        Title = recurring.Title,
        Description = recurring.Description,
        StartTime = generatorService.BuildOccurrenceStartTime(recurring, occurrenceDate),
        EndTime = generatorService.BuildOccurrenceEndTime(recurring, occurrenceDate),
        IsDone = false,
        DueAt = generatorService.BuildOccurrenceDueAt(recurring, occurrenceDate),
        IsPinned = false,
        Label = recurring.Label != null
            ? new LabelDto
            {
                LabelId = recurring.Label.LabelId,
                Name = recurring.Label.Name,
                Color = recurring.Label.Color
            }
            : null
    });
}
```

- [ ] **Step 7: Run deadline test**

Run:

```bash
cd blotztask-test && dotnet test --filter FullyQualifiedName~GetAllDdlTasksRecurringOverlapTests
```

Expected: PASS.

- [ ] **Step 8: Commit deadline query changes**

```bash
git add blotztask-api/Modules/Tasks/Queries/Deadlines/GetAllDdlTasks.cs \
  blotztask-test/Queries/GetAllDdlTasksRecurringOverlapTests.cs \
  blotztask-test/Helpers/DataSeeder.cs
git commit -m "fix: keep overlapping recurring deadlines by template"
```

---

### Task 6: Update Mobile Future Edit Anchor And Cache Invalidation

**Files:**
- Modify: `blotztask-mobile/src/feature/task-add-edit/screens/task-edit-screen.tsx`
- Modify: `blotztask-mobile/src/shared/hooks/useTaskMutations.ts`

- [ ] **Step 1: Inspect current mobile draft diffs**

Run:

```bash
git diff -- blotztask-mobile/src/feature/task-add-edit/screens/task-edit-screen.tsx \
  blotztask-mobile/src/shared/hooks/useTaskMutations.ts
```

Expected: there may already be draft changes for `anchorDate` and invalidation. Keep them if they match these steps.

- [ ] **Step 2: Extend RecurringPatternDetails**

In `task-edit-screen.tsx`, make sure the type includes:

```ts
type RecurringPatternDetails = {
  frequency: RecurrenceFrequency;
  interval: number;
  daysOfWeek: number | null;
  dayOfMonth: number | null;
  anchorDate: string;
};
```

- [ ] **Step 3: Always map recurrence details for future edits**

In `saveFutureOccurrences`, use:

```ts
const endDateChanged = hasRecurrenceEndChanged(selectedTask, formValues);
const recurrenceDetails =
  formValues.recurrence === "never" ? null : mapTaskRecurrenceToRecurringPattern(formValues);
```

Do not keep logic that only sends recurrence details when `hasRecurrencePatternChanged` is true.

- [ ] **Step 4: Derive recurrence pattern from startTime**

Use this function:

```ts
function mapTaskRecurrenceToRecurringPattern(task: TaskUpsertDTO): RecurringPatternDetails | null {
  const recurrence = task.recurrence;
  if (!recurrence || recurrence === "never" || recurrence === "custom") return null;
  const anchorDate = toDateOnly(task.startTime);

  const frequencyMap = {
    daily: "Daily",
    weekly: "Weekly",
    biweekly: "Weekly",
    monthly: "Monthly",
    yearly: "Yearly",
  } as const satisfies Record<Exclude<TaskRecurrence, "never" | "custom">, RecurrenceFrequency>;

  return {
    frequency: frequencyMap[recurrence],
    interval: recurrence === "biweekly" ? 2 : 1,
    daysOfWeek:
      recurrence === "weekly" || recurrence === "biweekly" ? getWeeklyDayFlag(anchorDate) : null,
    dayOfMonth: recurrence === "monthly" ? Number(anchorDate.slice(8, 10)) : null,
    anchorDate,
  };
}
```

Add:

```ts
function toDateOnly(dateTimeOffset: string): string {
  return dateTimeOffset.slice(0, 10);
}
```

- [ ] **Step 5: Update local recurring metadata from anchorDate**

Use:

```ts
function mapFormValuesToRecurringMetadata(
  formValues: TaskUpsertDTO,
  recurrenceDetails: RecurringPatternDetails | null,
): TaskDetailDTO["recurringTask"] {
  if (!recurrenceDetails) return null;

  return {
    frequency: recurrenceDetails.frequency,
    interval: recurrenceDetails.interval,
    daysOfWeek: recurrenceDetails.daysOfWeek,
    dayOfMonth: recurrenceDetails.dayOfMonth,
    startDate: recurrenceDetails.anchorDate,
    endDate: formValues.recurrenceEndDate ?? null,
  };
}
```

Update the call site to:

```ts
: mapFormValuesToRecurringMetadata(formValues, recurrenceDetails),
```

- [ ] **Step 6: Update cached occurrence date after future edit**

In `updateTaskDetailCache`, when `recurringTaskId` is returned:

```ts
recurringOccurrence:
  recurringTaskId == null || !currentTask.recurringOccurrence
    ? currentTask.recurringOccurrence
    : {
        ...currentTask.recurringOccurrence,
        recurringTaskId,
        occurrenceDate:
          recurrenceDetails?.anchorDate ?? currentTask.recurringOccurrence.occurrenceDate,
      },
```

- [ ] **Step 7: Invalidate old and new dates after future edit**

In `useTaskMutations.ts`, update `updateRecurringTaskFutureMutation.onSuccess`:

```ts
onSuccess: (_data, task) => {
  queryClient.removeQueries({ queryKey: ["virtualTaskDetail"] });
  queryClient.invalidateQueries({ queryKey: taskKeys.all });
  queryClient.invalidateQueries({ queryKey: ["ddl"] });
  invalidateSelectedDayByDateOnly(queryClient, task.effectiveDate);
  invalidateTaskAvailability(queryClient, task.effectiveDate);
  invalidateSelectedDayTask(queryClient, task.dto.startTime, task.dto.endTime);
  invalidateTaskAvailability(queryClient, task.dto.startTime, task.dto.endTime);
},
```

- [ ] **Step 8: Run mobile lint**

```bash
cd blotztask-mobile && npm run lint
```

Expected: PASS.

- [ ] **Step 9: Commit mobile changes**

```bash
git add blotztask-mobile/src/feature/task-add-edit/screens/task-edit-screen.tsx \
  blotztask-mobile/src/shared/hooks/useTaskMutations.ts
git commit -m "fix: anchor recurring future edits on mobile date"
```

---

### Task 7: Run Focused Backend Verification

**Files:**
- Verify only; no planned file edits.

- [ ] **Step 1: Run focused recurring tests**

Run:

```bash
cd blotztask-test && dotnet test --filter "FullyQualifiedName~Recurring|FullyQualifiedName~GetTasksByDate|FullyQualifiedName~GetAllDdlTasks"
```

Expected: PASS.

- [ ] **Step 2: Run full backend test project if focused tests pass**

Run:

```bash
cd blotztask-test && dotnet test
```

Expected: PASS.

- [ ] **Step 3: Record migration command for user**

Tell the user:

```bash
cd blotztask-api
dotnet ef migrations add AllowRecurringOverridePerTemplateOccurrence
dotnet ef database update
```

Also state that migration files will be generated under:

```text
blotztask-api/Infrastructure/Data/Migrations/
```

- [ ] **Step 4: Commit verification fixes only when files changed**

When verification required fixing test setup, commit those exact files:

```bash
git add blotztask-test
git commit -m "test: stabilize recurring overlap coverage"
```

When verification changed no files, skip this step without creating a commit.

---

### Task 8: Final Review

**Files:**
- Verify only; no planned file edits.

- [ ] **Step 1: Check for stale series/date keys**

Run:

```bash
rg -n "SeriesId, o\\.OccurrenceDate|seriesId, occurrenceDate|SeriesId, OccurrenceDate|RecurringSeriesOccurrenceKey|\\(r\\.SeriesId, o\\.OccurrenceDate\\)|\\(recurring\\.SeriesId, occurrenceWindow\\.OccurrenceDate\\)" blotztask-api blotztask-test
```

Expected: no remaining production code uses `SeriesId + OccurrenceDate` as the concrete override key. Occurrences of `SeriesId` in grouping, ownership, logs, or data seeding are allowed when they do not suppress a concrete occurrence.

- [ ] **Step 2: Check TypeScript does not use `any`**

Run:

```bash
rg -n "\\bany\\b" blotztask-mobile/src/feature/task-add-edit/screens/task-edit-screen.tsx blotztask-mobile/src/shared/hooks/useTaskMutations.ts
```

Expected: no output.

- [ ] **Step 3: Check worktree status**

Run:

```bash
git status --short
```

Expected: only intentional untracked EF migration files if the user generated them manually; otherwise clean after commits.

- [ ] **Step 4: Summarize completion**

Report:

- Files changed.
- Tests run and pass/fail results.
- EF migration command not run by the agent.
- Any pre-existing uncommitted files that were preserved or incorporated.
