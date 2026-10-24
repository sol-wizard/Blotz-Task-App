---
name: database-migrations
description: Use when the developer is adding, renaming, or changing a database field, entity, or relationship — anything that produces an EF Core migration.
---

# Database Migrations

## Hard rule — never run migrations yourself

Do NOT execute `dotnet ef migrations add` or `dotnet ef database update`. Always stop and hand the command to the user to run themselves.

## After making entity / DbContext changes

1. Explain what you changed and what the migration will produce (new tables, new columns, indexes, FK changes).
2. Give the user the exact command to run from `blotztask-api/`:

   ```bash
   dotnet ef migrations add <MigrationName>
   ```
3. Tell them where the generated files will land: `blotztask-api/Infrastructure/Data/Migrations/`.
4. If the migration should then be applied to their local DB, add:

   ```bash
   dotnet ef database update
   ```

## Naming

- PascalCase, verb-first, describing the schema change — e.g. `AddLabelRelationToTaskItem`, `CreateTaskItemTable`, `RemoveSeedData`.
- Avoid vague names like `Update1` or `Fix`. Older entries like `createDuedateToTaskItem` are inconsistent — don't follow that casing.

## Add-only within a release

Migrations run in the production deploy, before the new app goes to review, with no down step. After one runs:

- **The previous app keeps working.** It talks to the new API straight away (see the backend-changes skill, "add first, remove later").
- **The previous API still runs on the new schema**, so a rollback to the last tag works.

So within one release a migration may only **add**: new tables, new nullable columns (or columns with a default), new indexes. These wait for a later release, after the old code that used them is gone from production:

- `DropTable`, `DropColumn`
- `RenameColumn`, `RenameTable`
- `AlterColumn` that changes type, length or nullability of a column the old code reads or writes

Moving data to a new shape: add the new table or column and copy the data in this migration (`migrationBuilder.Sql(...)`), keep the old one, drop it in a later release.

When you explain the migration to the user (step 1 above), say whether it is add-only. If it isn't, say which part must move to a later release.
