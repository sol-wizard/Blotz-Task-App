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
