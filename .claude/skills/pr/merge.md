# Merge a PR

Merge the dev's PR and close the loop on its PBI, so the board never goes stale.

## Steps

1. **Check it's ready.** `gh pr view <n> --json state,reviewDecision,mergeStateStatus,labels,title,url`. The PR should be approved, with every check green. If GitHub would block the merge, say why and stop — never use `--admin` to skip the rules.

2. **Confirm.** Tell the dev which PR you're about to squash-merge, and wait for their OK — merging can't be undone from here.

3. **Merge.** `gh pr merge <n> --squash --delete-branch`

4. **Update the PBI** with the `pbi` skill (`update.md`), event "PR merged". That's where it decides Done or waiting for staging. Ask for the PBI number if you don't know it.

5. **Reply with the PR URL and the PBI's new status.**
