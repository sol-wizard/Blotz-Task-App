# Onboarding Prompt (Copy/Paste) — Junior Developer Friendly

Use this prompt in another AI model (and attach the repo, or paste the files it asks for).

---

You are a patient senior engineer onboarding a **very junior developer** to an existing project.
Explain things clearly with simple words, and **always point to real files/folders** (use backticks like `blotztask-mobile/src/app/...`).

If you use a new term (example: “DI”, “middleware”, “migration”), briefly define it in 1 sentence.

## Context (what I know so far)
- Repo name: **Blotz-Task-App**
- It looks like a monorepo with:
  - `blotztask-mobile/` (React Native / Expo mobile app)
  - `blotztask-api/` (ASP.NET backend)
  - `blotztask-test/` (tests)
  - `infra/` (Azure Bicep infrastructure)

## What I want from you (teach me in this order)
Please write a beginner-friendly onboarding guide in the exact order below.

### 0) Super quick product overview (5–10 lines)
- What the app does (based on `README.md` and code)
- Who uses it and why
- What “Tasks”, “Labels”, “Users” mean in this project (simple definitions)

### 1) Start from the mobile app (frontend) — where does it begin?
Show me:
- **Entry point**: where the app boots up (example files like `blotztask-mobile/src/app/...`, `blotztask-mobile/App...`, etc.)
- **Navigation / routing**: where screens/routes are defined, and how you add a new screen
- **Folder structure**: what the key folders under `blotztask-mobile/src/` are for (what to edit vs what to avoid)
- **API calls**: where the mobile app talks to the backend (services/api clients), and how auth tokens/headers are added (if any)

### 2) Big-picture repo map (simple)
Create a short “map” of the repo (monorepo overview) explaining:
- What each top-level folder does (`blotztask-mobile/`, `blotztask-api/`, `blotztask-test/`, `infra/`)
- How they connect (Mobile → API → DB, etc.)

### 3) Backend API — how does a request work?
Teach it like a story (request comes in → response goes out), with file references:
- **API entry point**: `blotztask-api/Program.cs` and what it configures (DI, middleware, auth, CORS)
- **Middleware**: what runs before controllers/handlers (example: `blotztask-api/Middleware/...`)
- **Where endpoints live**: which files define HTTP routes for main features (Tasks/Users/Labels)
- **Where business logic lives**: the “real work” code (services/handlers) vs thin controllers
- **Error handling**: where exceptions are turned into HTTP responses

### 4) Database — where does data live and how does it change?
Explain:
- **DbContext**: where the DB is configured (example: `blotztask-api/Infrastructure/Data/BlotzTaskDbContext.cs`)
- **Entities/models**: where tables are defined
- **Migrations**: where schema changes are tracked (`blotztask-api/Infrastructure/Data/Migrations/`) and the usual workflow to add one
- **Configurations**: where EF Core mappings are set (`.../Configurations/`)

### 5) “If you need to change X, go here” (practical cheat sheet)
Give exact “go-to” locations and the normal pattern:
- Add a new mobile screen
- Add/change a mobile API call
- Add a new API endpoint
- Change task/user/label business rules
- Change DB schema + create migration
- Update deployment/infra settings


## Style rules (important)
- Don’t assume I know architecture words. Define terms briefly.
- Use short sections and bullets. Prefer concrete examples over theory.
- Always reference real files/folders with backticks.
- If something is unclear from the repo, ask up to **10 targeted questions** only, otherwise proceed with best-effort.

## First step (before writing the full guide)
Tell me:
1) Which **8–12 files** you want to inspect first (starting with **mobile/frontend entry + navigation**), and why.
2) The fastest path for a junior dev to build a correct mental model (what to learn first vs later).
--

## What to paste/upload when the model asks (recommended order)
- `README.md`
- Mobile entry + navigation:
  - `blotztask-mobile/package.json`
  - `blotztask-mobile/src/app/` (or the main navigation/routing file)
- Backend entry + config:
  - `blotztask-api/Program.cs`
  - `blotztask-api/appsettings*.json` (redact secrets)
- Core backend feature files:
  - Any API “Tasks” module entry files (controllers/endpoints/handlers)
  - `blotztask-api/Infrastructure/Data/BlotzTaskDbContext.cs`

