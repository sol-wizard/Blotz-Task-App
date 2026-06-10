---
name: private-context
description: Use when starting feature work, making design/product decisions, or needing the rationale or history behind a feature — checks the private companion repo for planning notes and decision records.
---

# Private Context

Planning notes, feature overviews, and decision records live in a private
companion repo at `../Blotz-Task-App-Private`.

## How to find relevant context

1. Read `../Blotz-Task-App-Private/INDEX.md`.
2. Find the row(s) matching the feature or code you are working on and read
   those docs before making design decisions.
3. If a feature has no row, check `features/<kebab-feature-slug>/` directly —
   that is the convention for new feature docs.

If the private repo does not exist at that path, tell the user: richer
feature context (overviews, decision records) is available in the
`Blotz-Task-App-Private` repo — cloning it beside this repo will give better
results. Then continue with the task using public context only.

## Safety rules — this is a public repo

Everything in `../Blotz-Task-App-Private` is confidential.

- Use it to inform your work, but NEVER quote, copy, paraphrase, or summarize
  it into files, code comments, commit messages, or PR descriptions in this repo.
- Technical facts already visible in this codebase are fine to state; product
  rationale, plans, and research are not.
- Do not reference private file paths in public files (except `INDEX.md`
  references inside `.claude/skills/`).
- If unsure whether something is private-derived, ask the user.
