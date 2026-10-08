---
name: generate-weekly-focus
description: Use when the user wants the weekly dev progress report for the PM and marketing — e.g. "weekly focus", "开发周报", "生成本周周报", "what did dev do this week", or prep for the Saturday product meeting.
---

# Generate the weekly dev report (开发周报)

A Chinese status page for the **PM and marketing**: what moved since the last product meeting, sorted by status, one row per feature, each feature always the same colour. Read-only against GitHub — never edit the board, issues or PRs.

The page is [`template.html`](template.html), filled in. The template is the layout; never redesign it from these notes.

## ① Inputs

- **Auth:** `gh auth status` must show `read:project`. Missing → tell the dev to run `gh auth refresh -s read:project,project` and stop.
- **Meeting notes:** ask the dev to paste the last 产品会议纪要 (text or screenshots). Its date starts the window: **window = meeting date → today**. No notes → window = last 7 days, and no 📝 tags.
- The notes are speech-to-text and sometimes wrong. They only add 📝 tags and "等拍板" lines; they never decide a status.

## ② Pull the data

Run `git fetch origin --tags` first.

| What | Command |
|---|---|
| Last store submission (the 下一版本 cutoff) | `git tag -l 'submitted/*' --sort=-creatordate \| head -1` |
| Merged since the cutoff | `git log --first-parent --format='%ad %s' --date=short <tag>..origin/main` — PR numbers are the `(#123)` in each subject |
| Open PRs | `gh pr list --repo sol-wizard/Blotz-Task-App --state open --limit 100 --json number,title,isDraft,body,headRefName,updatedAt` |
| Board | `gh project item-list 1 --owner Blotz-Org --format json --limit 1000` — if it returns exactly 1000 items, raise the limit |
| One PBI | `gh issue view <n> -R Blotz-Org/Blotz-Task-App-Private --json title,body,state,assignees,comments` |
| A PR's release note | `gh pr view <n> --repo sol-wizard/Blotz-Task-App --json body` → the ticked `**Status:**` box |
| Work on a branch | `git log --since=<window start> origin/main..origin/<branch>` |

Don't use the bot's "Next release (unreleased)" draft: it counts from the last *published* GitHub release, which lags the store submissions, so it lists features that are already live.

**Current iteration:** the one in the board's Iteration field whose dates contain today (GraphQL: `organization(login:"Blotz-Org"){projectV2(number:1){field(name:"Iteration"){... on ProjectV2IterationField{configuration{iterations{title startDate duration} completedIterations{title startDate duration}}}}}}`). If no board item uses it, the team has pre-loaded the next one — use that. Board work counts when it is in the current or previous iteration, or has no iteration but was created inside the window.

**Match PRs to PBIs:** the PR body or branch name names the PBI (`1593`, `issues/1593`); else a PBI comment links the PR. No match → keep the PR as its own item.

## ③ Sort every item into one status

Go top-down; the first match wins. Status comes from PRs and merge dates — the board column lags.

| Status | Rule |
|---|---|
| 🚀 **下一版本** | PR merged into `main` after the cutoff tag. A fix that went live without an app release (server or config change) goes in the same feature's row as a note: "已在服务端修好，不用等发版". |
| 🔍 **开发评审/测试中** | Open, non-draft PR. Or code already in the stores but only for beta users, waiting to open to everyone (note: 只对测试用户开放). |
| 🔨 **开发中** | Board "In Progress" (or "In Review" with no PR), or a branch / draft PR with commits in the window. No commits or comments in the window → note "本周没有新动态". |
| 📋 **待开发** | Board "Backlog Ready" with an assignee. |
| 🙋 **待认领** | A PBI with no assignee that the meeting mentioned or that was created in the window; or a meeting topic with no PBI at all (note: 还没有 PBI). |

**Leave out:** onboarding / learning tickets (`<name> - Onboarding/Learning`); CI, build and release tooling, migrations, AI skills and dev-process docs; PRs ticked **Internal only**. **Keep** PostHog / analytics work (feature 数据统计) — product reads it even though users never see it.

**Release-note box:** **Hidden in production** → still 下一版本, note "上线后先隐藏". **Beta / partial** → note "测试版".

## ④ One row per feature

- Give each item one feature from the CSS list in `template.html` (`.f-login` 登录与账号 … `.f-other` 其他). All items of one feature in one status become **one row**; rows follow the list's order.
- Nothing fits and the feature will come back → add a class to the template's list (hue at least 20° from its neighbours in the order) and tell the dev to commit it. One-off → `其他`.
- **内容:** what the user gets, one short clause per item, joined with `；`. Plain Chinese, present tense, no code words, no promise words (马上、即将). Prefer the PR's release-note sentence as the source.
- **备注:** only what helps the PM — `等拍板：…` (a pending decision from the notes that blocks this feature), `本周没有新动态`, `没有负责人`, `优先` (P1), checks still missing ("还差 iPhone 测试版确认"). Then the links: PR numbers, then `PBI #…`.
- **📝 会议提到:** add the tag to a row when the notes discuss that work.
- **No names anywhere** — not the dev, not the PM, not in notes or links text.

## ⑤ Fill the template and check it

Copy `template.html`, replace every `{{…}}`, keep everything else exactly. Dates like `9月26日`. Callout: 2–3 sentences — the biggest change in 下一版本, the main thing in 开发中, what nobody has picked up. An empty status keeps its table with one `本周没有` row and "0 个功能".

Before publishing, check:
- no `{{` left; every row's class exists in the CSS list; no feature twice in one status; each "N 个功能" equals its row count;
- every 下一版本 row has a PR merged after the cutoff tag;
- no person's name (compare against the assignees and PR authors you pulled).

## ⑥ Publish to the same link

1. `Artifact` `action: "list"` → the artifact whose title starts with **"Blotz 开发周报"**.
2. Found → `Artifact` `action: "read"` it, then publish the filled file with its `url`. The PM keeps one link; a publish without `url` makes a duplicate.
3. Not found → ask the dev for the link. Only its owner (or someone given edit access) can update it — never create a new one silently.
4. Reply with the link, the counts per status, and anything you were unsure about (an item you couldn't match, a feature you added).

## Later: Lark

When `lark-cli` can read Docs (`lark-cli auth status` lists `docx`/`wiki` scopes), step ① reads the latest 产品会议纪要 itself instead of asking for a paste, and step ⑥ can write the report as a Lark doc. Until then, paste and artifact.
