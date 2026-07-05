# AI Instructions

## General Behaviour

- If anything is unclear or ambiguous, always ask the user for clarification before proceeding.
- Never make assumptions on your own — when in doubt, ask.
- Before making any code change, check whether a project-local skill applies under `.claude/skills/`.
- If a project-local skill applies, read its `SKILL.md` and follow it before editing files or running commands.
- When explaining code changes, mention which relevant project-local skill was used.

## Backend & Frontend Judgement

- Know the best practices for both backend and frontend, but understand that best practices are not always the best solution for the current context.
- Always weigh the trade-offs (performance, complexity, maintainability, team skill, deadlines) before recommending an approach.
- Present your suggestion with a brief reasoning — explain why you chose it over alternatives given the current situation.
- Never blindly apply a pattern just because it is "standard". If a simpler approach fits better, recommend it and say why.

## Code Changes

- Any code change must be as minimal as possible while still solving the task.
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
