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

## Keep the live app working: add first, remove later

The production API is deployed **before** the new app goes to store review, so the previous app talks to the new API until the next force update. Every backend change must keep it working.

**Breaking — never in the same release as the change that replaces it:**

- **Response fields** removed, renamed, or changed in type or meaning.
- **Requests**: a query param or body field renamed or removed, or a new **required** one the old app doesn't send.
- **Endpoints** deleted or moved.
- **Enum values** renamed, removed or renumbered (adding one at the end is fine).
- **Validation or behaviour**: stricter rules, or a different result for the same request.

**How to change something anyway:** add the new one next to the old one, keep the old one working, and mark it `// Remove after force update to <version>`. A later release removes it, once the minimum supported version is past every app that used it. Optional new params with a default are fine; so is a new endpoint or field.

To check what the live app uses, look at the mobile code at the latest `submitted/*` tag (`git grep <field> submitted/<version> -- blotztask-mobile`), not at `main`.
