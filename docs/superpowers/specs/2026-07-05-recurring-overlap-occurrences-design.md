# Recurring Overlap Occurrences Design

Date: 2026-07-05

## Summary

Recurring task future edits should allow the new future template to start on the user-selected task date, even when that date is earlier than the edited occurrence's effective date.

Example:

- A daily recurring task starts on 2026-07-02.
- The user edits the 2026-07-04 occurrence and changes its date to 2026-07-02.
- The old template remains responsible for its original occurrences up to 2026-07-03.
- The new future template starts on 2026-07-02.
- 2026-07-02 can therefore show two tasks from the same series: one from the old template and one from the new future template.

This makes overlapping templates within the same series an intentional supported state.

## Decision

Use `RecurringTaskId + OccurrenceDate` as the recurring occurrence identity.

`SeriesId` still groups versions of the same recurring task, but it no longer implies that a series can have only one occurrence on a given date.

## Main Branch Data Risk

The current `main` branch should not have produced data that blocks this change through normal user operations.

Relevant observations from `main`:

- `UpdateRecurringTaskFuture` always creates the new future template with `StartDate = EffectiveDate`.
- The old template is truncated at `EffectiveDate - 1`, unless the effective date is at or before the old template start.
- `RecurringOccurrenceOverrides` has a unique index on `SeriesId + OccurrenceDate`, so duplicate overrides for the same series/date cannot be created normally.
- Recurring task creation creates a new series.
- Delete future and stop repeating operations truncate or remove data for the selected template path; they do not create overlapping templates.

Existing modified single occurrences are not dirty data. A user may edit "this occurrence" and move the stored `TaskItem.StartTime` to another date while the override keeps the original `OccurrenceDate`. That means "this original occurrence was individually moved" and should be preserved.

## Data Model

Change the unique override identity:

- Remove the unique index on `RecurringOccurrenceOverrides(SeriesId, OccurrenceDate)`.
- Add a unique index on `RecurringOccurrenceOverrides(RecurringTaskId, OccurrenceDate)`.

No DTO change is required. The mobile API identity is already:

```text
RecurringTaskId + OccurrenceDate
```

`SeriesId` remains useful for finding all template versions in a recurring series, but not for suppressing or replacing a concrete occurrence.

## Migration Safety

Before applying the migration, run preflight SQL checks:

1. Find duplicates for the new unique key:

```sql
SELECT RecurringTaskId, OccurrenceDate, COUNT(*) AS Count
FROM RecurringOccurrenceOverrides
GROUP BY RecurringTaskId, OccurrenceDate
HAVING COUNT(*) > 1;
```

Expected result: no rows.

2. Inspect historical active template overlap:

```sql
SELECT a.SeriesId, a.Id AS FirstRecurringTaskId, b.Id AS SecondRecurringTaskId,
       a.StartDate AS FirstStartDate, a.EndDate AS FirstEndDate,
       b.StartDate AS SecondStartDate, b.EndDate AS SecondEndDate
FROM RecurringTasks a
JOIN RecurringTasks b
  ON a.SeriesId = b.SeriesId
 AND a.Id < b.Id
WHERE a.IsActive = 1
  AND b.IsActive = 1
  AND a.StartDate <= ISNULL(b.EndDate, '9999-12-31')
  AND b.StartDate <= ISNULL(a.EndDate, '9999-12-31');
```

Expected result before this feature ships from `main`: no rows.

After this feature ships, active template overlap is no longer an invariant. This query is only for understanding historical data before rollout.

If duplicate `RecurringTaskId + OccurrenceDate` rows exist, pause the migration and inspect the rows manually before proceeding. If only active template overlap exists, the new code can represent it, but samples should still be reviewed to confirm the overlap is meaningful and not historical corruption.

## Backend Design

### RecurringOccurrenceMaterializer

`FindExistingOverride` should search by:

```text
RecurringTaskId + OccurrenceDate + UserId
```

The concurrency retry path should use the same key.

When the caller passes a `RecurringTaskId` that is valid for the requested `OccurrenceDate`, the materializer should use that template directly. It should not redirect to another template in the same series merely because that other template also covers the same date.

If the requested template is not valid for the date, normal occurrence commands should return the existing validation error. The forced-update rollout means we do not need to preserve old mobile behavior that sent stale or incomplete recurrence identity. Series-based template lookup should be kept only where a command explicitly needs to locate the effective template for a known series-level operation; it must not be used to collapse two overlapping same-series occurrences into one.

### UpdateRecurringTaskFuture

Future edits should derive the new template anchor from the edited task details:

```text
futureStartDate = DateOnly.FromDateTime(TaskDetails.StartTime.Date)
```

The handler should allow `futureStartDate < EffectiveDate`.

Use `futureStartDate` for:

- New template `StartDate`.
- Recurrence validation start date.
- Weekly day and monthly day defaults when derived from the task date.
- Deadline offset calculation.

Still use `EffectiveDate` for:

- Validating that the selected occurrence exists on the old template.
- Truncating the old template.
- Selecting old-template overrides to migrate or remove for future occurrences.

When migrating old-template overrides, only consider overrides where:

```text
RecurringTaskId == oldTemplate.Id
OccurrenceDate >= EffectiveDate
OverrideType != Detached
```

Overrides before `EffectiveDate` stay attached to the old template, even if the new template also starts earlier and now overlaps those dates.

### GetTasksByDate

Build the override lookup by:

```text
RecurringTaskId + OccurrenceDate
```

When iterating active recurring templates, only that template's override can suppress or replace that template's virtual occurrence.

This allows two templates in the same series to both contribute an occurrence for the same date.

### Weekly And Monthly Availability

Use `RecurringTaskId + OccurrenceDate` for override suppression.

These views only need to know whether a day has tasks or show limited thumbnails. They do not need to expose duplicate counts, but one template's skipped or materialized override must not hide another template's occurrence on the same date.

### Recurring Deadlines

`GetAllDdlTasks` currently chooses one current occurrence per series. That no longer matches the model.

Each active deadline template may contribute its own current occurrence. The override lookup should use:

```text
RecurringTaskId + OccurrenceDate
```

If two active templates in the same series both have current incomplete deadline occurrences, both should appear unless each template's own override hides or completes it.

### Delete, Update, Save, And Materialize Occurrence

Single occurrence operations should affect only the selected `RecurringTaskId + OccurrenceDate`.

`DeleteRecurringOccurrence` already scopes single delete and future delete by `RecurringTaskId == template.Id`; keep that behavior.

`UpdateRecurringOccurrence`, `SaveRecurringOccurrence`, and `MaterializeRecurringOccurrence` rely on the materializer. Once the materializer uses `RecurringTaskId + OccurrenceDate`, these commands naturally target the selected occurrence.

Editing "this occurrence" may move the task's actual `StartTime` to another date. The identity `OccurrenceDate` should remain the original occurrence date.

## Frontend Design

### Future Edit Anchor

When saving future occurrences, derive recurrence details from `formValues.startTime`, not from the original `occurrenceDate`.

Rules:

- Daily and yearly: the new template anchor is the new start date.
- Weekly and biweekly: `daysOfWeek` is calculated from the new start date.
- Monthly: `dayOfMonth` is calculated from the new start date.

The frontend should always send recurrence details for future edits in the forced-update version. It should not keep the old behavior where recurrence details are sent only when the recurrence pattern label changes.

### Cache Updates

After `updateRecurringTaskFuture` succeeds:

- Remove virtual task detail cache entries.
- Invalidate `taskKeys.all`.
- Invalidate the deadline list.
- Invalidate selected-day cache for the original `effectiveDate`.
- Invalidate selected-day cache for the new `dto.startTime` date.
- Invalidate week and month availability for both the original effective date and the new task date.

This ensures a 2026-07-04 occurrence moved to 2026-07-02 refreshes both 2026-07-04 and 2026-07-02.

The virtual detail cache key is already `RecurringTaskId:OccurrenceDate`, which matches the chosen identity.

## Rollout

The app uses forced updates, so no old-frontend compatibility path is required.

Rollout order:

1. Apply the database migration that changes the unique override index.
2. Deploy backend code that treats occurrence identity as `RecurringTaskId + OccurrenceDate`.
3. Release the forced-update mobile app that sends future edit recurrence details based on the new task start date.

The migration must happen before users can materialize or modify overlapping same-series occurrences; otherwise the old unique index on `SeriesId + OccurrenceDate` will reject valid new data.

## Testing

Tests are warranted because this changes the core identity rule for recurring occurrences.

Backend tests should cover:

- Future edit of a daily series where 2026-07-04 is edited to start on 2026-07-02:
  - Old template is truncated at 2026-07-03.
  - New template starts on 2026-07-02.
  - Both templates can generate a 2026-07-02 occurrence.
- Weekly future edit derives `DaysOfWeek` from the new start date.
- Monthly future edit derives default `DayOfMonth` from the new start date.
- Future edit migrates only old-template overrides on or after `EffectiveDate`.
- Future edit does not migrate old-template overrides before `EffectiveDate`.
- Two same-series occurrences with the same `OccurrenceDate` but different `RecurringTaskId` can both materialize.
- Deleting or modifying one overlapping occurrence does not affect the other.
- `GetTasksByDate` returns both overlapping virtual occurrences.
- A skipped or materialized override for one template does not suppress another template's occurrence on the same date.
- Recurring deadlines can return current occurrences from multiple active templates in the same series.

Remove or rewrite any test expecting `futureStartDate < EffectiveDate` to throw, because that is now supported behavior.

## Out Of Scope

- Showing a special UI marker for two same-series tasks on the same day.
- Changing the API DTO shape.
- Cleaning individually moved single-occurrence overrides.
- Supporting old mobile versions after rollout.
