# Merge a PR

Merge the dev's PR and close the loop on its PBI, so the board never goes stale.

## Steps

1. **Check where it is.** `gh pr view <n> --json state,reviewDecision,mergeStateStatus,autoMergeRequest,labels,title,url`.
   - **Already merged** (`L1`/`L2` auto-merge did it) → skip to step 4. "Merge my PR" after an auto-merge just means "close the loop on the PBI".
   - **Approved but behind main** (`mergeStateStatus` is `BEHIND`) → GitHub requires the branch to be up to date, and auto-merge doesn't update it. Do it here, once, at the end — never earlier, or every new commit on main re-runs the checks for nothing. It's part of the confirm in step 2.
   - **Not approved, checks red, or conversations open** → say why and stop. Never use `--admin` to skip the rules.

   **`L3`/`L4`: check a tech lead approved.** Read who approved (`gh pr view <n> --json reviews --jq '[.reviews[] | select(.state=="APPROVED") | .author.login] | unique'`) and compare with the tech lead list in `.claude/skills/pbi/review-levels.md`. None of them approved (or `L4` has fewer than 2 approvals) → remind the dev, e.g. "⚠️ This is L3 and no tech lead has approved yet (approved by: AlexisEvan). Ask a tech lead to look first." It's a reminder, not a block — the dev decides.

2. **Confirm.** Tell the dev which PR you're about to squash-merge (and that you'll update the branch first, if it's behind), and wait for their OK — merging can't be undone from here.

3. **Merge.**
   - Behind main → `gh pr update-branch <n>`, then `gh pr checks <n> --watch` until they finish. Red → stop and tell the dev.
   - Auto-merge is on → GitHub merges by itself once the checks pass; confirm with `gh pr view <n> --json state` (give it a minute). Otherwise → `gh pr merge <n> --squash --delete-branch`.

4. **Update the PBI** with the `pbi` skill (`update.md`), event "PR merged". That's where it decides Done or waiting for staging. Ask for the PBI number if you don't know it.

5. **Reply with the PR URL and the PBI's new status.**
