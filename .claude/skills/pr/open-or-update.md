# Open or update a PR

Write the PR description from the branch's **actual diff and commits**, fill `.github/pull_request_template.md`, confirm with the dev, then open the PR.

**Never submit without explicit approval.**

## Why accuracy matters here

The `## Release note` + `**Status:**` fields are not cosmetic. `.github/workflows/preview-next-release.yml` feeds them to a model that writes the user-facing "What's New" copy: it omits anything marked Internal or Hidden, and tags Beta. A wrong tick silently publishes internal work or silently buries a shipped feature.

CI will not catch a mistake. `pr-release-note-check.yml` only greps for *any* `-`-bulleted ticked box anywhere in the body, so zero Status boxes ticked, two ticked, or one wrongly ticked all pass. **This skill is the only real enforcement.**

## Steps

1. **Check preconditions.** Abort with a clear reason if: on `main`, detached HEAD, or `gh` is not authenticated. Do not half-proceed.

   If `git log main..HEAD` is empty, distinguish the two cases before reporting — they need different fixes:
   - Working tree has uncommitted or untracked changes → the work simply is not committed yet. Say so and offer to commit it.
   - Working tree is clean → the branch genuinely has nothing main does not already have. There is no PR to open.

2. **Read the real work.** Base is `main`.
   - `git log main..HEAD --oneline`
   - `git diff main...HEAD` — **three dots**. Branches here carry merge commits from `main`, and two dots would attribute other people's work to this PR.

   Describe what the diff shows, never what the dev remembers or what the branch name implies.

3. **Detect mode.** `gh pr view --json number,url,body` (tolerate the not-found exit code).
   - PR exists → **update mode**: rewrite the body with `gh pr edit --body-file`.
   - No PR → **create mode**.

4. **Classify Status.** Run both reachability checks and keep the evidence — the dev confirms a claim, not a guess.

   | Check | What to look for | Verdict |
   |---|---|---|
   | Backend, no caller | New/changed route in `blotztask-api/Modules/*/Controllers/*.cs` with no caller in `blotztask-mobile/src/shared/services/` — see *Matching a route to its caller* below | **Ask the dev**: Internal or Hidden? Show the evidence |
   | UI, no entry point | New `.tsx` outside `blotztask-mobile/src/app/` that nothing routed imports | Hidden — say it is lower confidence |

   **Beta** is not detectable from a diff. Infer it only from wording (`beta`, `experimental`, `wip`, `partial`, `phase 1`) in the branch name or commit messages, then confirm. No wording hit → do not propose Beta.

   No check hits → classify on the diff's face value.

   **Whenever you land on User-facing, ask before accepting it:** is this fully live for users, or is it gated, partial, or not enabled yet? A diff cannot tell you — a feature can look complete and still sit behind an env check or an unreleased build. The dev who wrote it knows. Their answer maps to Beta or Hidden instead.

   **Matching a route to its caller.** Naive string matching always fails here — do it this way:
   - Expand the route. `[Route("/api/[controller]")]` on `TaskController` means `api/Task`; `[controller]` is the class name minus the `Controller` suffix.
   - **Drop the `api/` prefix.** Mobile's base URL is `EXPO_PUBLIC_URL_WITH_API`, which already ends in `/api`, so callers write `/task/...`, never `/api/task/...`.
   - Search the **whole service file**, case-insensitively, for the remaining segment. Services build the URL into a variable before passing it (`const url = ...; return apiClient.get(url)`), so grepping the `apiClient.get(...)` line alone finds nothing.

   Worked example: `AppVersionController` → route `api/app-version` → search `app-version` → hits `version-service.ts:45`, so it **has** a caller.

5. **Apply the consistency rules.** These are the point of the skill.
   - All four Status lines present, **exactly one** ticked.
   - Release note `none` **if and only if** Internal or Hidden. Never `none` alongside User-facing or Beta.
   - User-facing or Beta needs one sentence written as a **marketing announcement, not a changelog entry**: name what got better at a high level, then at most one short clause of scope. Enumerating behavioural details buries what is being announced — details belong in the Summary, never here. Still no file names, no type names, no "refactored".
     - Too detailed: "The voice button now starts listening the instant you press it, short voice inputs are no longer lost, and an accidental tap clearly shows you need to hold."
     - Right altitude: "Improved the AI voice input experience — the mic button now responds instantly and short recordings are no longer lost."
   - Strip every `<!-- -->` comment from the template.
   - Keep the whole body tight. `preview-next-release.yml` truncates each body to **1500 characters** before the model sees it, and the template from `## Release note` down is 555 of those. That leaves roughly **900 characters** for the Summary; go over and the Status block is cut off, and the model falls back to guessing from the title.

6. **Draft the body.** Use `.github/pull_request_template.md` in its committed section order. Concise throughout — favour tight bullets over prose, cut any sentence that would not change what a reviewer does.

   Title: derive from the commits and follow whichever style they already use (`fix(ai): ...` when the commits use that form, a plain sentence otherwise). Do not impose a convention the repo does not have.

7. **Review level.** Every PR carries one `L1`–`L4` label, copied from its PBI. It decides who Discord pings and who must approve. Ask the dev for the PBI number and read its label from the private repo: `gh issue view <n> -R Blotz-Org/Blotz-Task-App-Private --json labels --jq '[.labels[].name | select(test("^L[1-4]$"))][0]'`. If the PBI has none, or there's no PBI, suggest one with a one-sentence reason and let the dev choose — rules in `.claude/skills/pbi/review-levels.md`. When the PBI had none, write the chosen level back to it too, so the PBI and PR agree: `gh issue edit <n> -R Blotz-Org/Blotz-Task-App-Private --add-label <level>`. In update mode, skip this if the PR already has a level label. The Discord post only reads the level when the PR opens, so if the level changes later, tell the dev to let the new reviewers know themselves.

   **Proof goes in the body.** Add one `Verified:` line to the Summary with the proof the `pbi` implement step produced: backend → the test command and its result; UI → the real-device screenshots (attach them); both → both. **Only check that it's there — never run tests yourself**: that would do the dev's work twice. No proof → tell the dev what's missing; an `L1` without proof is opened as `L2`.

8. **Confirm.** Show the dev the full body **and** the Status reasoning. Ask for approval or edits. Loop until approved. Never skip this, even when every check is unambiguous.

9. **Submit.** On approval:
   - Push first if there is no upstream or unpushed commits: `git push -u origin HEAD`.
   - Write the body to a scratchpad file and pass `--body-file`, never `--body` — the body is multi-line markdown with backticks and checkboxes, and shell quoting will corrupt it.
   - Create mode: `gh pr create --base main --title <title> --body-file <file> --label <level>`. The label must go on **at creation**: that's the moment the Discord post picks who to ping.
   - **Auto-merge for `L1`/`L2`:** right after creating, run `gh pr merge <n> --auto --squash`. GitHub then merges it by itself once it's approved, the checks are green and every conversation is resolved (the branch is deleted automatically). Tell the dev it's on. `L3`/`L4` never get it — they wait for a tech lead, and `merge.md` checks that.
   - **Screenshots:** `gh` can't upload images, so never write "screenshots below". Right after creating, give the dev the screenshot file paths and ask them to drag them into the description on GitHub, then check the body has image links (`gh pr view <n> --json body`). Not there yet → say so; for `L1` the proof isn't complete until they are.
   - Update mode: `gh pr edit --body-file <file>` (add `--add-label <level>` if the PR had none)
   - Create mode, when there's a PBI: then update it with the `pbi` skill (`update.md`) — status `In Review`, tick what this PR covers, PR link in the note. Its own confirm step still applies.

10. **Reply with the PR URL only.**


## Notes

- Base is `main` and the PR is created ready, not draft. Both are overridable if the dev asks.
- Do not add PBI links. Issues live in `Blotz-Org/Blotz-Task-App-Private` while this repo is `sol-wizard/Blotz-Task-App` — different orgs, so a bare `#123` does not link and `Fixes #123` can never auto-close.
- Do not add assignees, reviewers, or labels unless asked — the one exception is the review-level label from step 7.
