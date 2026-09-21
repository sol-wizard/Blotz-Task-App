# AI Instructions

## General Behaviour

- If anything is unclear or ambiguous, always ask the user for clarification before proceeding.
- Never make assumptions on your own — when in doubt, ask.
- Before making any code change, check whether a project-local skill applies — see **Project-local skills** below for the full list.
- If a project-local skill applies, read its `SKILL.md` and follow it before editing files or running commands.
- When explaining code changes, mention which relevant project-local skill was used.

## Project-local skills

Each one lives at `.claude/skills/<name>/SKILL.md` and is plain Markdown — any agent or person can
read and follow it. Claude Code loads them automatically by matching the `description:` in each
file's frontmatter; **no other tool reads that frontmatter**, so if you are not Claude Code, use the
table below to pick the right one and open it yourself.

| Skill | Use it when |
|---|---|
| `backend-changes` | Adding, modifying or fixing API logic — endpoints, handlers, domain entities, events, anything in `blotztask-api/` |
| `database-migrations` | Adding, renaming or changing a field, entity or relationship — anything producing an EF Core migration |
| `writing-tests` | Before writing, adding or modifying any test in `blotztask-test/` |
| `working-with-ai-agent` | Implementing, modifying or fixing any AI feature |
| `real-device-test` | Verifying something on a physical phone, or driving the installed app on a USB-connected device |
| `create-pr` | Opening a pull request, or fixing the description or release note on an existing one |
| `pr-review` | Reviewing a pull request |
| `create-blotz-pbi` | Capturing an idea, problem or task as a PBI in the backlog |
| `private-context` | Starting feature work, or needing the rationale and history behind a feature (checks the private companion repo) |
| `generate-weekly-focus` | Producing the weekly summary of team work for marketing/product |
| `generate-whatsnew` | Building the monthly "What's New" page for an upcoming release |

The `expo-*` skills (`expo-router`, `expo-native-ui`, `expo-animation`, `expo-data-fetching`,
`expo-upgrade`) are vendored Expo framework reference, not Blotz-specific — consult them when
working on navigation, UI, animation, data fetching or an SDK upgrade in `blotztask-mobile/`.

## Backend & Frontend Judgement

- Know the best practices for both backend and frontend, but understand that best practices are not always the best solution for the current context.
- Always weigh the trade-offs (performance, complexity, maintainability, team skill, deadlines) before recommending an approach.
- Present your suggestion with a brief reasoning — explain why you chose it over alternatives given the current situation.
- Never blindly apply a pattern just because it is "standard". If a simpler approach fits better, recommend it and say why.

## Code Changes

- Break changes into small, focused steps. Never rewrite multiple files in one go without walking the user through each change.
- Do not run code-generation, schema-generation, or migration commands unless the relevant project-local skill explicitly allows it.

## Database Migrations

- Never run `dotnet ef migrations add` or `dotnet ef database update` yourself.
- If entity, DbContext, or relationship changes require a migration, stop after the code change and give the user the exact command to run.
- The user should generate and apply EF Core migrations themselves from `blotztask-api/`.

## TypeScript

- Never use `any` as a type. Always use the most specific type possible (`unknown`, a concrete type, or a generic).
- If `any` seems necessary, stop and suggest the proper type to the user first — let them decide before proceeding.
- Acceptable alternatives: `unknown` for truly unknown values, `FieldValues` for generic RHF controls, proper DTO types for API responses.

## Testing

- Only suggest tests when they are genuinely necessary for the change — do not suggest tests by default.
- When suggesting a test, briefly explain why it matters and let the user decide whether to write it.
