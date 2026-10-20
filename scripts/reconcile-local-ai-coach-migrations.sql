-- Local only. Default mode validates without changing migration history.
-- Run via reconcile-local-ai-coach-migrations.py; --apply enables the final transaction.
SET NOCOUNT ON;
SET XACT_ABORT ON;
DECLARE @ApplyChanges bit = 0;
DECLARE @NewId nvarchar(150) = N'20261020112233_CreateAiCoachConversationTables';

IF DB_NAME() <> N'BlotzTaskAppDb' OR CONVERT(int, SERVERPROPERTY('EngineEdition')) IN (5, 8)
    THROW 51000, 'This reconciliation is restricted to the local BlotzTaskAppDb database.', 1;

DECLARE @OldIds TABLE (Id nvarchar(150) PRIMARY KEY);
INSERT INTO @OldIds VALUES
    (N'20261016123206_AddAiCoachConversation'),
    (N'20261016143306_AddAiCoachMessageTimelineAndSegments'),
    (N'20261018112751_AddAiCoachDraftConfirmation'),
    (N'20261019143123_RemoveModeFromAiCoachConversation');

DECLARE @Columns TABLE (TableName sysname, ColumnName sysname, TypeName sysname, MaxLength smallint, Nullable bit);
INSERT INTO @Columns VALUES
    ('AiCoachConversation', 'Id', 'uniqueidentifier', 16, 0),
    ('AiCoachConversation', 'UserId', 'uniqueidentifier', 16, 0),
    ('AiCoachConversation', 'MessageCount', 'int', 4, 0),
    ('AiCoachConversation', 'EndedAt', 'datetimeoffset', 10, 1),
    ('AiCoachConversation', 'ClosingSummary', 'nvarchar', -1, 1),
    ('AiCoachConversation', 'CreatedAt', 'datetimeoffset', 10, 0),
    ('AiCoachConversation', 'LastActivityAt', 'datetimeoffset', 10, 0),
    ('AiCoachConversation', 'Revision', 'int', 4, 0),
    ('AiCoachConversation', 'SchemaVersion', 'int', 4, 0),
    ('AiCoachConversation', 'Payload', 'nvarchar', -1, 0),
    ('AiCoachMessage', 'Id', 'uniqueidentifier', 16, 0),
    ('AiCoachMessage', 'ConversationId', 'uniqueidentifier', 16, 0),
    ('AiCoachMessage', 'UserId', 'uniqueidentifier', 16, 0),
    ('AiCoachMessage', 'Role', 'nvarchar', 40, 0),
    ('AiCoachMessage', 'Content', 'nvarchar', -1, 0),
    ('AiCoachMessage', 'TaskContextRead', 'bit', 1, 0),
    ('AiCoachMessage', 'TurnId', 'uniqueidentifier', 16, 1),
    ('AiCoachMessage', 'CreatedAt', 'datetimeoffset', 10, 0),
    ('AiCoachMessage', 'DraftSnapshot', 'nvarchar', -1, 1),
    ('AiCoachDraftConfirmation', 'Id', 'uniqueidentifier', 16, 0),
    ('AiCoachDraftConfirmation', 'UserId', 'uniqueidentifier', 16, 0),
    ('AiCoachDraftConfirmation', 'ConversationId', 'uniqueidentifier', 16, 0),
    ('AiCoachDraftConfirmation', 'DraftId', 'uniqueidentifier', 16, 0),
    ('AiCoachDraftConfirmation', 'CommandId', 'uniqueidentifier', 16, 0),
    ('AiCoachDraftConfirmation', 'RequestHash', 'nvarchar', 128, 0),
    ('AiCoachDraftConfirmation', 'SavedDraftJson', 'nvarchar', -1, 0),
    ('AiCoachDraftConfirmation', 'CreatedAt', 'datetimeoffset', 10, 0);

DECLARE @ActualColumns TABLE (TableName sysname, ColumnName sysname, TypeName sysname, MaxLength smallint, Nullable bit);
INSERT INTO @ActualColumns
SELECT t.name, c.name, ty.name, c.max_length, c.is_nullable
FROM sys.tables t
JOIN sys.schemas s ON s.schema_id = t.schema_id AND s.name = 'dbo'
JOIN sys.columns c ON c.object_id = t.object_id
JOIN sys.types ty ON ty.user_type_id = c.user_type_id
WHERE t.name IN (SELECT DISTINCT TableName FROM @Columns);
IF EXISTS (SELECT * FROM @Columns EXCEPT SELECT * FROM @ActualColumns)
    OR EXISTS (SELECT * FROM @ActualColumns EXCEPT SELECT * FROM @Columns)
    THROW 51000, 'Local columns differ from the consolidated migration; no history changes allowed.', 1;
IF EXISTS (
    SELECT 1 FROM sys.columns c JOIN sys.tables t ON t.object_id = c.object_id
    WHERE t.schema_id = SCHEMA_ID('dbo') AND t.name IN (SELECT DISTINCT TableName FROM @Columns)
      AND (c.is_identity = 1 OR c.is_computed = 1 OR c.default_object_id <> 0
           OR (TYPE_NAME(c.user_type_id) = 'datetimeoffset' AND c.scale <> 7))
)
    THROW 51000, 'Unexpected local column generation, defaults or precision.', 1;

DECLARE @Indexes TABLE (TableName sysname, IndexName sysname, UniqueIndex bit, PrimaryKey bit, FilterText nvarchar(100), ColumnsText nvarchar(300));
INSERT INTO @Indexes VALUES
    ('AiCoachConversation', 'PK_AiCoachConversation', 1, 1, '', 'Id:0'),
    ('AiCoachConversation', 'IX_AiCoachConversation_LastActivityAt', 0, 0, '', 'LastActivityAt:0'),
    ('AiCoachConversation', 'IX_AiCoachConversation_UserId', 1, 0, '[EndedAt]ISNULL', 'UserId:0'),
    ('AiCoachConversation', 'IX_AiCoachConversation_UserId_LastActivityAt', 0, 0, '', 'UserId:0,LastActivityAt:0'),
    ('AiCoachMessage', 'PK_AiCoachMessage', 1, 1, '', 'Id:0'),
    ('AiCoachMessage', 'IX_AiCoachMessage_ConversationId', 0, 0, '', 'ConversationId:0'),
    ('AiCoachMessage', 'IX_AiCoachMessage_CreatedAt', 0, 0, '', 'CreatedAt:0'),
    ('AiCoachMessage', 'IX_AiCoachMessage_UserId_CreatedAt_Id', 0, 0, '', 'UserId:0,CreatedAt:1,Id:1'),
    ('AiCoachDraftConfirmation', 'PK_AiCoachDraftConfirmation', 1, 1, '', 'Id:0'),
    ('AiCoachDraftConfirmation', 'IX_AiCoachDraftConfirmation_ConversationId_DraftId', 1, 0, '', 'ConversationId:0,DraftId:0'),
    ('AiCoachDraftConfirmation', 'IX_AiCoachDraftConfirmation_UserId_CommandId', 1, 0, '', 'UserId:0,CommandId:0');

DECLARE @ActualIndexes TABLE (TableName sysname, IndexName sysname, UniqueIndex bit, PrimaryKey bit, FilterText nvarchar(100), ColumnsText nvarchar(300));
INSERT INTO @ActualIndexes
SELECT t.name, i.name, i.is_unique, i.is_primary_key,
       REPLACE(REPLACE(REPLACE(COALESCE(i.filter_definition, ''), '(', ''), ')', ''), ' ', ''),
       STRING_AGG(CONVERT(nvarchar(max), CONCAT(c.name, ':', ic.is_descending_key)), ',') WITHIN GROUP (ORDER BY ic.key_ordinal)
FROM sys.tables t
JOIN sys.indexes i ON i.object_id = t.object_id
JOIN sys.index_columns ic ON ic.object_id = i.object_id AND ic.index_id = i.index_id
JOIN sys.columns c ON c.object_id = ic.object_id AND c.column_id = ic.column_id
WHERE t.schema_id = SCHEMA_ID('dbo') AND t.name IN (SELECT DISTINCT TableName FROM @Columns)
GROUP BY t.name, i.name, i.is_unique, i.is_primary_key, i.filter_definition;
IF EXISTS (SELECT * FROM @Indexes EXCEPT SELECT * FROM @ActualIndexes)
    OR EXISTS (SELECT * FROM @ActualIndexes EXCEPT SELECT * FROM @Indexes)
    THROW 51000, 'Local indexes differ from the consolidated migration.', 1;
IF EXISTS (
    SELECT 1 FROM sys.indexes i JOIN sys.tables t ON t.object_id = i.object_id
    WHERE t.schema_id = SCHEMA_ID('dbo') AND t.name IN (SELECT DISTINCT TableName FROM @Columns)
      AND (i.is_disabled = 1 OR i.is_hypothetical = 1 OR i.type NOT IN (1, 2))
)
    THROW 51000, 'Unexpected or disabled local indexes.', 1;

DECLARE @ForeignKeys TABLE (TableName sysname, KeyName sysname, ColumnName sysname, TargetSchema sysname, TargetTable sysname, TargetColumn sysname, DeleteAction tinyint, UpdateAction tinyint);
INSERT INTO @ForeignKeys VALUES
    ('AiCoachConversation', 'FK_AiCoachConversation_AppUsers_UserId', 'UserId', 'dbo', 'AppUsers', 'Id', 1, 0),
    ('AiCoachMessage', 'FK_AiCoachMessage_AiCoachConversation_ConversationId', 'ConversationId', 'dbo', 'AiCoachConversation', 'Id', 1, 0),
    ('AiCoachDraftConfirmation', 'FK_AiCoachDraftConfirmation_AiCoachConversation_ConversationId', 'ConversationId', 'dbo', 'AiCoachConversation', 'Id', 1, 0);
DECLARE @ActualForeignKeys TABLE (TableName sysname, KeyName sysname, ColumnName sysname, TargetSchema sysname, TargetTable sysname, TargetColumn sysname, DeleteAction tinyint, UpdateAction tinyint);
INSERT INTO @ActualForeignKeys
SELECT t.name, fk.name, c.name, OBJECT_SCHEMA_NAME(fk.referenced_object_id), rt.name, rc.name, fk.delete_referential_action, fk.update_referential_action
FROM sys.foreign_keys fk
JOIN sys.tables t ON t.object_id = fk.parent_object_id
JOIN sys.foreign_key_columns fc ON fc.constraint_object_id = fk.object_id
JOIN sys.columns c ON c.object_id = fc.parent_object_id AND c.column_id = fc.parent_column_id
JOIN sys.tables rt ON rt.object_id = fc.referenced_object_id
JOIN sys.columns rc ON rc.object_id = fc.referenced_object_id AND rc.column_id = fc.referenced_column_id
WHERE t.schema_id = SCHEMA_ID('dbo') AND t.name IN (SELECT DISTINCT TableName FROM @Columns);
IF EXISTS (SELECT * FROM @ForeignKeys EXCEPT SELECT * FROM @ActualForeignKeys)
    OR EXISTS (SELECT * FROM @ActualForeignKeys EXCEPT SELECT * FROM @ForeignKeys)
    OR EXISTS (
        SELECT 1 FROM sys.foreign_keys fk JOIN sys.tables t ON t.object_id = fk.parent_object_id
        WHERE t.schema_id = SCHEMA_ID('dbo') AND t.name IN (SELECT DISTINCT TableName FROM @Columns)
          AND (fk.is_disabled = 1 OR fk.is_not_trusted = 1)
    )
    THROW 51000, 'Local foreign keys differ from the consolidated migration.', 1;

BEGIN TRY
    BEGIN TRANSACTION;
    DECLARE @OldCount int = (
        SELECT COUNT(*) FROM dbo.__EFMigrationsHistory WITH (UPDLOCK, HOLDLOCK)
        WHERE MigrationId IN (SELECT Id FROM @OldIds)
    );
    DECLARE @NewCount int = (SELECT COUNT(*) FROM dbo.__EFMigrationsHistory WHERE MigrationId = @NewId);
    IF NOT ((@OldCount = 4 AND @NewCount = 0) OR (@OldCount = 0 AND @NewCount = 1))
        THROW 51000, 'Expected all four old migrations, or the already-reconciled new migration.', 1;
    IF NOT EXISTS (SELECT 1 FROM dbo.__EFMigrationsHistory WHERE MigrationId = '20260928030534_AddAiCoachFeedbackAndTraceEvents')
        THROW 51000, 'Required feedback/trace migration is missing.', 1;
    IF @ApplyChanges = 1 AND @OldCount = 4
    BEGIN
        DELETE FROM dbo.__EFMigrationsHistory WHERE MigrationId IN (SELECT Id FROM @OldIds);
        IF @@ROWCOUNT <> 4 THROW 51000, 'Unexpected history deletion count.', 1;
        INSERT INTO dbo.__EFMigrationsHistory (MigrationId, ProductVersion) VALUES (@NewId, '10.0.6');
    END;
    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;
