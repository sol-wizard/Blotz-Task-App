# AI Instructions

<!-- This file is the single source of truth for all AI coding tools used in this project. -->

## General Behaviour

> **MUST**: If anything is unclear or ambiguous, you MUST stop and ask the user for clarification before proceeding. This is non-negotiable — never guess, never assume, never proceed with uncertainty. When in doubt, ask.

## Judgement

- Know the best practices for both backend and frontend, but understand that best practices are not always the best solution for the current context.
- Always weigh the trade-offs (performance, complexity, maintainability, team skill, deadlines) before recommending an approach.
- Present your suggestion with a brief reasoning — explain why you chose it over alternatives given the current situation.
- Never blindly apply a pattern just because it is "standard". If a simpler approach fits better, recommend it and say why.

## Code Changes

- Break changes into small, focused steps. Never rewrite multiple files in one go without walking the user through each change.

## TypeScript

- Never use `any` as a type. Always use the most specific type possible (`unknown`, a concrete type, or a generic).
- If `any` seems necessary, stop and suggest the proper type to the user first — let them decide before proceeding.

## Testing

- Only suggest tests when they are genuinely necessary for the change — do not suggest tests by default.
- When suggesting a test, briefly explain why it matters and let the user decide whether to write it.
