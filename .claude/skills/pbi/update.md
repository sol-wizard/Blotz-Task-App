# Update a PBI

Keep the board true without anyone chasing: move the card, tick what's done, and leave a short note a PM can read in ten seconds. The `pr` skill runs this automatically when it opens a PR.

## Target

- Repo `Blotz-Org/Blotz-Task-App-Private`, project `1` (org `Blotz-Org`). Needs the `project` token scope — if a call fails for scope, tell the dev to run `gh auth refresh -s project` (interactive, only they can do it).
- Project ID `PVT_kwDOC3ftEM4Auu9M` · Status field ID `PVTSSF_lADOC3ftEM4Auu9MzglR-N0`
- Status options: `In Progress` = `47fc9ee4` · `In Review` = `56233cab` · `Done` = `98236657`. (There is no PM review step any more — a merged PR means done.)

## Steps

1. **Find the PBI.** Ask for the number if it isn't clear from the conversation or the PR. Read it: `gh issue view <n> -R Blotz-Org/Blotz-Task-App-Private --json title,body,labels`.

2. **Pick the new status** from what just happened:

   | What happened | Status |
   |---|---|
   | Started work | `In Progress` |
   | PR opened | `In Review` |
   | PR merged, every `## Acceptance Criteria` box is ticked, and the PBI has no `## Staging Verification` (or all its boxes are ticked) | `Done`, and close the issue as completed |
   | PR merged, but some Acceptance Criteria boxes are still unticked | stays `In Review`: the note lists the unticked criteria |
   | PR merged, but staging boxes are still unticked | stays `In Review` — the note says "Merged, waiting for the staging check" and lists the unticked boxes |
   | Dev says it's tested on staging | tick those boxes → `Done` and close once none are left |

   The PBI's own rule wins: *not Done until every Staging Verification box is checked on a staging build*. Never move a PBI with unticked staging boxes to `Done`.

   **Done and closed go together.** Close the issue (`gh issue close <n> -R Blotz-Org/Blotz-Task-App-Private --reason completed`) only when it moves to `Done`, and move it to `Done` whenever you close it. Never close a PBI while its PR is still open or any Acceptance Criteria or Staging Verification box is unticked. A PBI that is Done on the board but still open (or closed but not Done) means the board is lying.

3. **Tick finished boxes** in `## Scope / Tasks` and `## Acceptance Criteria` — only the ones the work actually covers (check the diff or PR). Never tick `## Staging Verification` unless the dev says they tested it on a staging build.

4. **Draft the note** — one comment on the PBI. It is read by the PM and at sprint review, so write for a person, not a log:
   - **3 lines at most**, plain words, no file names or jargon: what now works, what's left (if anything), and the PR link.
   - Screenshots only if the change is visible — attach 1–2, don't describe them.
   - Example: `Done: reminders can now repeat weekly. Left: the widget still shows the old time. PR: sol-wizard/Blotz-Task-App#572`
   - Skip the note when only the status moves (e.g. starting work).

5. **Confirm.** Show the dev the status change, the boxes to tick and the note. Nothing is written until they approve — the whole team sees the board.

6. **Write it.** On approval:
   - Status: find the item id with
     `gh api graphql -f query='query{repository(owner:"Blotz-Org",name:"Blotz-Task-App-Private"){issue(number:<n>){projectItems(first:5){nodes{id project{number}}}}}}' --jq '.data.repository.issue.projectItems.nodes[] | select(.project.number==1) | .id'`
     (not on the board yet → `gh project item-add 1 --owner Blotz-Org --url <issue url> --format json` and use its `id`), then
     `gh project item-edit --id <item> --project-id PVT_kwDOC3ftEM4Auu9M --field-id PVTSSF_lADOC3ftEM4Auu9MzglR-N0 --single-select-option-id <option id>`
   - Ticks: **re-read the body right before writing** (someone may have edited it since step 1), change only the `[ ]` → `[x]` lines you listed in that fresh copy, then `gh issue edit <n> -R Blotz-Org/Blotz-Task-App-Private --body-file <file>`. If a listed line is no longer there, skip it and tell the dev.
   - Note: `gh issue comment <n> -R Blotz-Org/Blotz-Task-App-Private --body-file <file>`

7. **Reply with the PBI URL and the new status.**
