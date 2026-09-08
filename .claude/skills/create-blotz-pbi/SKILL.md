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

**Never create an unconfirmed PBI.** If the direction is vague, or the online validation below could
not confirm the proposed solution is a real and workable approach, do not create the issue. Ask the
user targeted questions — one at a time, each with options and your recommended answer — and keep
drafting with them until both the direction and the solution are settled.

If the solution still can't be confirmed after that, the work is an **investigation, not a build**.
Say so plainly and ask the user whether to turn it into a POC PBI (🔍, with `## Investigation Goal`
replacing `## Suggested Solution`). Never quietly ship a build PBI carrying a guessed solution, and
never convert it to a POC on your own — that call belongs to the user.

Always show the finished draft and get explicit confirmation before creating anything.

## Validate the solution online (before showing the draft)
Never propose a `## Suggested Solution` from memory alone. Research it first and confirm it is what
the official docs say and what other apps actually do.

- **Official docs first** — the platform/framework/library docs for every API the solution names
  (Expo, Apple HIG, Android developer guides, the library's own reference). Confirm the API exists,
  does what you claim, and note its stated caveats: nullability, platform support, deprecation.
- **Then real-world practice** — how comparable apps solve the same problem: official help-centre
  pages, engineering blogs, well-supported Stack Overflow / GitHub discussions. The question to
  answer is "is this the normal way, or am I inventing something?"
- **Say which kind of backing you found.** A documented platform rule, a widespread convention, and
  "this seemed sensible" are three different strengths of evidence — word the draft accordingly.
- **Surface contradictions, never bury them.** If a guideline argues against the approach, put it in
  the draft and let the user decide. A verified counterpoint is worth more than a clean draft.
- **Cite in the PBI.** Put the 2–4 links that actually shaped the decision under `## Notes`. Whoever
  picks the ticket up shouldn't have to redo the research to trust the approach.

Skip this only when the solution is entirely internal to this codebase — renaming a local helper,
changing a value we own — and names no external API, platform behaviour, or third-party pattern.

## Staging verification (decide per PBI)

Most PBIs are only really done once someone has seen them work on a staging build — not on a
simulator, and not on the developer's machine. Decide whether this one qualifies, and if it does,
write the `## Staging Verification` section into the body.

**What staging means here:** the EAS `preview` build profile — bundle `com.Blotz.BlotzTask.staging`,
pointed at the `-stag` API, `EXPO_PUBLIC_APP_ENV=preview`. It reaches testers through TestFlight on
iOS and the Play **alpha** track on Android. "Tested on staging" means a real install from one of
those, not `expo run` and not a dev client.

**Needs staging verification** when the change touches any of:
- UI a user actually sees
- an API contract or backend behaviour (the staging API is a different deployment from local)
- environment-specific config — API URLs, Auth0 tenant, keys, bundle identifier
- native modules, permissions, push, widgets, deep links — these behave differently in a real signed
  build than in a dev client
- data shape or migrations

**Doesn't need it** when the change is docs, comments, CI/build scripts the pipeline itself proves,
dev tooling or skills that never ship to users, or a pure refactor already covered by tests.

**If you can't tell, ask the user** — one question, options, your recommended answer. Don't guess,
and don't add an empty section just to have one.

When it applies, the section must be **specific to this PBI** — a reviewer should be able to follow
it without rereading the description. Cover:
- which build to install (iOS TestFlight / Android alpha, or both — say if one platform is enough)
- the exact steps to reach the changed behaviour
- what a pass looks like, in observable terms
- anything that needs checking on both platforms, or in both languages, or against real data

Lead the section with: `PBI is not Done until every box below is checked on a staging build.`

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
2. Validate the solution online (see above), then show the user the draft with its sources and wait for explicit confirmation. Unconfirmed direction or unconfirmed solution = don't create; clarify, or offer the POC conversion.
3. Decide whether staging verification applies (ask if unclear), then confirm tech-lead tag (if applicable), other labels, and estimate.
4. Title = the PBI title.
5. Body in this order, keeping the user's wording. **Keep it short and concise** — write the minimum a dev needs to pick this up, favour tight bullets over prose, and cut any sentence that doesn't change what someone would do:
   - `## Description` — requirements (what & why)
   - `## Suggested Solution` — proposed approach (POC: replace with `## Investigation Goal` — questions to answer + what success looks like)
   - `## Scope / Tasks` — checkboxes (`- [ ]`), `###` subheadings if grouped
   - `## Acceptance Criteria` — checkboxes
   - `## Staging Verification` — checkboxes; omit entirely when the PBI doesn't warrant it (see above)
   - `## Notes` — if any apply
   - Keep any "current finding" lines as a `>` blockquote.
6. Create via `mcp__github__issue_write` (method `create`) in the private repo only, with the chosen labels. **Do not include `backlog ready` in the labels** — it is a Status, set in step 7.
7. Set the project fields on project 1 (needs the `read:project`/`project` token scope — if missing, the command fails; tell the user to run `gh auth refresh -s read:project,project` (interactive, only they can do it), then retry):
   - **Add the issue explicitly** with `gh project item-add 1 --owner Blotz-Org --url <issue-url> --format json` and read the returned item `id`. There is an org automation that *sometimes* auto-adds + sets Status, but it is unreliable (has failed to add issues), so always add explicitly rather than depending on it. `item-add` is safe to run even if the issue is already there.
   - **Set Status to `backlog ready`** on the Status single-select field, and **set the Estimate field**, using the item `id` from item-add (`gh project item-edit --id <item> --project-id <proj> --field-id <field> ...`).
   - Do NOT poll `item-list` in a loop to find the item — the project has hundreds of items and a tight poll loop will exhaust the GraphQL rate limit. Use the `id` returned directly by `item-add`.
8. Reply with the issue URL only.

## Notes
- Don't add assignees or milestones unless asked.
