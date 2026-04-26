---
name: backend-changes
description: Use when the developer is adding, modifying, or fixing backend API logic — endpoints, handlers, domain entities, events, or anything in `blotztask-api/`.
---

# Backend Changes

## Read these first (reference examples)

- `Modules/Tasks/Commands/Tasks/AddTask.cs` — command + handler + DTO in one file
- `Modules/Tasks/Controllers/TaskController.cs` — thin controller, UserId extraction
- `Modules/Tasks/DependencyInjection.cs` — manual handler registration

## Module layout

Features live under `Modules/<Feature>/`:

```
Commands/<Area>/   Queries/<Area>/   Controllers/
Domain/{Entities,Services}/   Events/   Enums/   Services/
DependencyInjection.cs
```