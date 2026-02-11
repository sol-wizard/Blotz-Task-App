-- Migrate floating tasks (no StartTime/EndTime) into the Notes table.
-- Run this BEFORE applying the MakeTaskTimeNotNull migration so that
-- floating tasks are moved to Notes and the task table can require times.
--
-- TaskItems (floating) -> Notes (we have a target).
-- DeletedTaskItems (floating): no DeletedNote table, so we cannot migrate;
--   we only remove those rows so MakeTaskTimeNotNull can run.
--
-- Tables: TaskItems (Source), Notes (Target)
-- Notes columns: Id (uniqueidentifier), Text (nvarchar(2000)), CreatedAt, UpdatedAt, UserId

SET NOCOUNT ON;

BEGIN TRANSACTION;

-- 1. Insert floating tasks as notes (Title + Description -> Text, max 2000 chars)
INSERT INTO Notes (Id, Text, CreatedAt, UpdatedAt, UserId)
SELECT
    NEWID(),
    LEFT(
        CONCAT(
            ISNULL(Title, N''),
            CASE
                WHEN Description IS NOT NULL AND LTRIM(RTRIM(Description)) <> N'' THEN NCHAR(13) + NCHAR(10) + Description
                ELSE N''
            END
        ),
        2000
    ),
    CreatedAt,
    UpdatedAt,
    UserId
FROM TaskItems
WHERE StartTime IS NULL
  AND EndTime IS NULL;

DECLARE @InsertedCount INT = @@ROWCOUNT;

-- 2. Delete the migrated tasks from TaskItems (optional: comment out to only copy)
DELETE FROM TaskItems
WHERE StartTime IS NULL
  AND EndTime IS NULL;

-- 3. DeletedTaskItems: no DeletedNote table, so we cannot migrate.
--    Remove floating rows so MakeTaskTimeNotNull can alter DeletedTaskItems to NOT NULL.
DECLARE @DeletedArchiveCount INT;
DELETE FROM DeletedTaskItems
WHERE StartTime IS NULL
  AND EndTime IS NULL;
SET @DeletedArchiveCount = @@ROWCOUNT;

PRINT CONCAT('Migrated ', @InsertedCount, ' floating task(s) to Notes.');
PRINT CONCAT('Removed ', @DeletedArchiveCount, ' floating row(s) from DeletedTaskItems (no DeletedNote to migrate to).');

COMMIT TRANSACTION;
