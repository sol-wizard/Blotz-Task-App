---
name: create-blotz-pbi
description: Use when the user wants to capture an idea, problem, or task as a PBI in the Blotz backlog — e.g. "create a PBI for this", "add this to the backlog".
---

# Create Blotz PBI

Turn any context — an idea while building a feature, a bug, a follow-up, an investigation — into a **backlog-ready** PBI. Never create a not-ready PBI.

## Readiness gate (do this first)
A PBI is ready only when it has all three:
1. **Clear requirements** — what & why, unambiguous scope.
2. **Suggested solution** — a proposed approach, not just the problem.
3. **Next step** — the concrete first action to take.

**Exception — POC / investigation PBI:** the goal is to *find* the solution, so #2 is replaced by a clear **investigation goal + what success looks like** (questions to answer, decision to reach). #1 and #3 still apply. Ask whether it's a POC if unclear.

If any required part is missing or vague, ask the user targeted questions and draft the missing parts with them. Don't create the issue until ready. Confirm the final draft before creating.

## Before creating — also confirm
- **Tech-lead tag:** ask the user only if the task is difficult or important — if yes, apply the tech-lead label. and also pick the right label(s) yourself from the repo's existing labels based on the work (e.g. bug, frontend, backend, auth).
- **`backlog ready` is a project board Status, NOT a label.** Never pass `backlog ready` in the labels array. It is set on the project's Status field (see Steps 6).
- **Estimate:** suggest one from `1, 2, 4, 8, 16` (where **4 = 1 day**, so 1≈2h, 2≈half day, 8≈2 days, 16≈4 days) and confirm with the user. Set it on the project's Estimate field.

## Title emoji
Prefix the PBI title with one emoji that signals its area:
- 🍎 — mobile / frontend only
- 🤖 — AI-related task
- 🎯 — backend task
- 🔍 — POC / investigation

Pick the one that fits the task. POC (🔍) takes priority when the work is an investigation. Else pick the most suitable emoji if non fit

## Target
- Repo: `Blotz-Org/Blotz-Task-App-Private` — **the only allowed destination. Never create the PBI in any other repo.**
- Project: `https://github.com/orgs/Blotz-Org/projects/1` (project number `1`).
- Known IDs (avoid re-querying — saves rate limit):
  - Project ID: `PVT_kwDOC3ftEM4Auu9M`
  - Estimate field ID: `PVTF_lADOC3ftEM4Auu9MzglR-Oo` (number — use `--number`)
  - Status field ID: `PVTSSF_lADOC3ftEM4Auu9MzglR-N0` (single-select — needs the `backlog ready` option ID via `--single-select-option-id`; query options once if unknown)
- Status: always `backlog ready` — this is the project board **Status field**, not a repo label. Apply the chosen label(s) separately.

## Steps
1. Run the readiness gate.
2. Confirm tech-lead tag (if applicable), other labels, and estimate.
3. Title = the PBI title.
4. Body in this order, keeping the user's wording. **Keep it short and concise** — write the minimum a dev needs to pick this up, favour tight bullets over prose, and cut any sentence that doesn't change what someone would do:
   - `## Description` — requirements (what & why)
   - `## Suggested Solution` — proposed approach (POC: replace with `## Investigation Goal` — questions to answer + what success looks like)
   - `## Scope / Tasks` — checkboxes (`- [ ]`), `###` subheadings if grouped
   - `## Acceptance Criteria` — checkboxes
   - `## Notes` — if any apply
   - Keep any "current finding" lines as a `>` blockquote.
5. Create via `mcp__github__issue_write` (method `create`) in the private repo only, with the chosen labels. **Do not include `backlog ready` in the labels** — it is a Status, set in step 6.
6. Set the project fields on project 1 (needs the `read:project`/`project` token scope — if missing, the command fails; tell the user to run `gh auth refresh -s read:project,project` (interactive, only they can do it), then retry):
   - **Add the issue explicitly** with `gh project item-add 1 --owner Blotz-Org --url <issue-url> --format json` and read the returned item `id`. There is an org automation that *sometimes* auto-adds + sets Status, but it is unreliable (has failed to add issues), so always add explicitly rather than depending on it. `item-add` is safe to run even if the issue is already there.
   - **Set Status to `backlog ready`** on the Status single-select field, and **set the Estimate field**, using the item `id` from item-add (`gh project item-edit --id <item> --project-id <proj> --field-id <field> ...`).
   - Do NOT poll `item-list` in a loop to find the item — the project has hundreds of items and a tight poll loop will exhaust the GraphQL rate limit. Use the `id` returned directly by `item-add`.
7. Reply with the issue URL only.

## Notes
- Don't add assignees or milestones unless asked.
