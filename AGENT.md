# BlotzTask — Agent / Copilot Instructions (`AGENT.md`)

This doc is for **humans and coding agents** (Cursor/Copilot/etc.) to work safely and consistently in this repo.

If you’re onboarding a junior developer: start with `ONBOARDING_PROMPT.md`.

## Architecture overview (file-based)

```
Blotz-Task-App/
├── blotztask-mobile/      # Expo (React Native) app, Expo Router
├── blotztask-api/         # ASP.NET Core Web API + EF Core (SQL Server) + SignalR
├── blotztask-test/        # xUnit tests (Testcontainers SQL Server)
├── infra/                 # Azure infra (Bicep)
└── blotztask-function/    # Azure Functions (exists, not day-1 critical)
```

**Dependency flow (typical request)**:

Mobile UI → `blotztask-mobile/src/shared/services/api/*` → API controller (`blotztask-api/Modules/**/Controllers/*Controller.cs`)
→ command/query handler (`blotztask-api/Modules/**/{Commands|Queries}/`) → EF Core (`blotztask-api/Infrastructure/Data/BlotzTaskDbContext.cs`)
→ JSON response → Mobile UI.

## Running locally (copy/paste commands)

### Prereqs

- Node.js + npm (mobile)
- .NET SDK pinned by `global.json` (**10.0.100**)
- SQL Server reachable by the API (local SQL Server or Docker)

### Mobile (Expo)

From `blotztask-mobile/`:

- `npm install`
- `npm run start` (or `npm run ios` / `npm run android` / `npm run web`)

#### Mobile environment variables

The app reads config from `process.env`:

- Where it’s used:
  - App root: `blotztask-mobile/src/app/_layout.tsx` (Auth0, PostHog)
  - API config: `blotztask-mobile/src/shared/services/api/config.ts`

- Required keys:
  - `EXPO_PUBLIC_URL_WITH_API` (example: `http://localhost:5027/api`)
  - `EXPO_PUBLIC_URL` (example: `http://localhost:5027`)
  - `EXPO_PUBLIC_AUTH0_DOMAIN`
  - `EXPO_PUBLIC_AUTH0_CLIENT_ID`
  - `EXPO_PUBLIC_AUTH0_AUDIENCE`
  - `EXPO_PUBLIC_POSTHOG_API_KEY`

**Recommended**: create `blotztask-mobile/.env` (do not commit) with those values.

### API (ASP.NET Core)

From `blotztask-api/`:

- `dotnet run`

Dev URLs (see `blotztask-api/Properties/launchSettings.json` and `blotztask-api/Program.cs`):

- Swagger: `http://localhost:5027/swagger`
- Health: `http://localhost:5027/health`
- SignalR hub: `http://localhost:5027/ai-task-generate-chathub`

### Tests

From repo root:

- `dotnet test blotztask-test/BlotzTask.Tests.csproj`

Tests use `Testcontainers.MsSql` (see `blotztask-test/BlotzTask.Tests.csproj`), so Docker is commonly required.

## Key patterns (what to follow when adding code)

### Mobile: routing/navigation

- Expo Router entry: `expo-router/entry` (see `blotztask-mobile/package.json`)
- Root stack: `blotztask-mobile/src/app/_layout.tsx`
- Route groups:
  - `blotztask-mobile/src/app/(auth)/...`
  - `blotztask-mobile/src/app/(protected)/...`

**Rule of thumb**: adding a new screen is usually “add a file under `src/app/`”, then adjust the nearest `_layout.tsx` if you need header/options.

### Mobile: API calls

- API config: `blotztask-mobile/src/shared/services/api/config.ts`
- Axios client (with interceptors): `blotztask-mobile/src/shared/services/api/client.ts`
- Feature-specific services: `blotztask-mobile/src/feature/**/services/` and `blotztask-mobile/src/shared/services/`

**Rule of thumb**: don’t sprinkle raw `fetch()` everywhere; centralize cross-cutting concerns (auth headers, retries, error mapping) in the Axios client/interceptors.

### API: entrypoint, modules, and request pipeline

API bootstrapping: `blotztask-api/Program.cs`

- **DI setup** lives in extension methods: `blotztask-api/Extension/*`
- **CORS policy**: `blotztask-api/Extension/CorsServiceExtensions.cs`
- **Auth (Auth0 JWT)**: `blotztask-api/Extension/AuthServiceExtensions.cs`
- **DB wiring**: `blotztask-api/Extension/DatabaseServiceExtensions.cs`
- **Error handling middleware**: `blotztask-api/Middleware/ErrorHandlerMiddleware.cs`
- **User identity mapping**:
  - `blotztask-api/Middleware/UserContextMiddleware.cs` resolves Auth0 user → internal `AppUser.Id`
  - Controllers expect `HttpContext.Items["UserId"]` to be present for authenticated requests

### API: Controllers + handlers

Controllers live here:

- `blotztask-api/Modules/**/Controllers/*Controller.cs`

They should stay thin:

- Validate inputs (lightly), read `UserId` from `HttpContext.Items`
- Call a **CommandHandler** or **QueryHandler**
- Return DTOs

Example controller: `blotztask-api/Modules/Tasks/Controllers/TaskController.cs`

## Database & migrations (EF Core)

- DbContext: `blotztask-api/Infrastructure/Data/BlotzTaskDbContext.cs`
- Migrations: `blotztask-api/Infrastructure/Data/Migrations/`
- Configurations: `blotztask-api/Infrastructure/Data/Configurations/`

### Add a migration (typical)

From repo root:

```bash
dotnet tool restore
dotnet ef migrations add YourMigrationName --project blotztask-api --startup-project blotztask-api --output-dir Infrastructure/Data/Migrations
```

### Apply migrations

```bash
dotnet ef database update --project blotztask-api --startup-project blotztask-api
```

## “If you need to change X, go here” (fast map)

- Add a new mobile screen: `blotztask-mobile/src/app/...`
- Change navigation/header options: nearest `_layout.tsx` under `blotztask-mobile/src/app/**/_layout.tsx`
- Change mobile API base URL: `blotztask-mobile/src/shared/services/api/config.ts` (`EXPO_PUBLIC_URL_WITH_API`)
- Add an API endpoint: `blotztask-api/Modules/**/Controllers/`
- Change business rules: `blotztask-api/Modules/**/{Commands|Queries}/...`
- Change user/auth behavior:
  - JWT validation: `blotztask-api/Extension/AuthServiceExtensions.cs`
  - UserId resolution: `blotztask-api/Middleware/UserContextMiddleware.cs`
- CORS issues: `blotztask-api/Extension/CorsServiceExtensions.cs`
- DB schema/entities/config: `blotztask-api/Infrastructure/Data/*` + module domains

## Security / secrets (important)

- Do not paste secrets into issues, PRs, or AI chats.
- Prefer environment variables / local secrets for development.
- If you ever find real keys/connection strings committed, treat them as compromised and rotate them.

## Agent rules (Cursor/Copilot/etc.)

- Read `AGENT.md` + `ONBOARDING_PROMPT.md` first.
- Do not invent files/paths; always ground answers in the repo.
- Keep changes small and explain what you touched.
- When editing the API, always consider:
  - `[Authorize]` usage + JWT config
  - `HttpContext.Items["UserId"]` contract
  - CORS origins (mobile/web clients)

