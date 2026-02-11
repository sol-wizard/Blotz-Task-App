-- Delete all floating rows from DeletedTaskItems (no StartTime, no EndTime).
-- Use this when you need to clear only the archive of deleted floating tasks,
-- e.g. before running MakeTaskTimeNotNull so DeletedTaskItems can have NOT NULL times.

SET NOCOUNT ON;

BEGIN TRANSACTION;

DELETE FROM DeletedTaskItems
WHERE StartTime IS NULL
  AND EndTime IS NULL;

DECLARE @DeletedCount INT = @@ROWCOUNT;

PRINT CONCAT('Deleted ', @DeletedCount, ' floating row(s) from DeletedTaskItems.');

COMMIT TRANSACTION;
