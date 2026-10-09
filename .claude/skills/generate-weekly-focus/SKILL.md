---
name: generate-weekly-focus
description: Use when the user wants the weekly dev progress report for the PM and marketing — e.g. "weekly focus", "开发周报", "生成本周周报", "what did dev do this week", or prep for the Saturday product meeting.
---

# Generate the weekly dev report (开发周报)

A Chinese Lark doc for the **PM and marketing**, sent the **day before** the Saturday product meeting: what product asked about last time, then everything else by status, one row per feature, each feature always the same colour. Read-only against GitHub — never edit the board, issues or PRs.

The doc is [`template.xml`](template.xml), filled in. The template is the layout; never redesign it from these notes.

## ① Inputs

- **GitHub:** `gh auth status` must list `project` or `read:project`. Missing → tell the dev to run `gh auth refresh -s read:project,project` and stop.
- **Lark:** `lark-cli auth status --json --verify` must list `wiki:node:read` and `docx:document:readonly`. Missing or expired → tell the dev to run `lark-cli auth login --domain docs,wiki,drive` and stop. Follow the `lark-shared` skill for anything auth-related.
- **Last meeting notes:** in the wiki space "BlotzTask 文档", under 报告存档 › 周会纪要, one page per meeting titled `YYYY-MM-DD 产品会议`. Find the newest one (`wiki +node-list` down that path, or `drive +search --query "产品会议" --sort edit_time`), then `lark-cli docs +fetch --doc <node> --doc-format markdown --as user`. Lark unreachable → ask the dev to paste the notes.
- **Window = that meeting's date → today.**
- The notes are speech-to-text and sometimes wrong. They decide what goes in 📌 and which rows get 📝; they never decide a status.

## ② Pull the data

| What | Command |
|---|---|
| 下一版本 cutoff | `git ls-remote --tags origin 'submitted/*'` → the highest version, then `git fetch origin`. Don't trust the local tag: the release workflow force-moves `submitted/<version>` on every resubmission, and a plain fetch keeps the stale one. |
| Merged since the cutoff | `git log --first-parent --format='%ad %s' --date=short <sha>..origin/main` — PR numbers are the `(#123)` in each subject |
| Open PRs | `gh pr list --repo sol-wizard/Blotz-Task-App --state open --limit 100 --json number,title,isDraft,body,headRefName,updatedAt` |
| Board | `gh project item-list 1 --owner Blotz-Org --format json --limit 1000` — exactly 1000 back → raise the limit |
| One PBI | `gh issue view <n> -R Blotz-Org/Blotz-Task-App-Private --json title,body,state,assignees,labels,comments` |
| A PR's release note | `gh pr view <n> --repo sol-wizard/Blotz-Task-App --json body` → the ticked `**Status:**` box |
| Work on a branch | `git log --since=<window start> origin/main..origin/<branch>` |

Don't use the bot's "Next release (unreleased)" draft: it counts from the last *published* GitHub release and lists features already in the stores.

**Board work in scope:** items in any iteration that overlaps the window or the current one (the iteration field's dates; if the by-date current iteration has no items, the team pre-loaded the next — use that), plus items with no iteration created inside the window.

**PR ↔ PBI:** match when any of these names the other — PR body or branch name (`1593`, `issues/1593`), PBI body or comment (a PR link, or a branch name). No link but same author and same scope → match it and say so in your reply. No match → the PR is its own item.

## ③ Sort every item into one status

Top-down; the first match wins. Status comes from PRs and merge dates — the board column lags.

| Status | Rule |
|---|---|
| 🚀 **下一版本** | PR merged into `main` after the cutoff commit. |
| 🔍 **开发评审/测试中** | Open, non-draft PR. Or the PR's release-note box is **Beta / partial** and it is already in the stores (note: 只对测试用户开放). |
| 🔨 **开发中** | Board "In Progress", or "In Review" with no open PR, or a branch / draft PR with commits in the window. No commits or PBI comments in the window → note `本周没有新动态`. |
| 📋 **待开发** | Board "Backlog Ready" with an assignee. |
| 🙋 **待认领** | A PBI with no assignee that the meeting discussed or that was created in the window; or a meeting topic with no PBI at all (note: 还没有 PBI). |

Merged **before** the cutoff (already in the stores) → not in these tables; it can still answer a 📌 row.

**Leave out:**
- onboarding / learning tickets (`<name> - Onboarding/Learning`);
- CI, build and release tooling, migrations, dependency upgrades with no user effect, and AI skills or docs for the dev workflow;
- PRs ticked **Internal only** — except PostHog / analytics work, which stays as 数据统计;
- pure polish: alignment, spacing, copy or typo fixes, icon overlap (太小的不放).

**Keep:** AI skills whose output product uses (e.g. feedback sorting) — under that feature.

## ④ Write the rows

**Features and colours** (row order = this order; each feature keeps its colour). The colour goes on the feature's tag (`<span background-color="…">`), never on the table cell — Lark silently drops most cell colours:

| 功能 | 颜色 | | 功能 | 颜色 |
|---|---|---|---|---|
| 登录与账号 | `light-blue` | | 番茄钟 | `red` |
| 打赏 | `light-orange` | | 回顾 | `green` |
| AI | `light-purple` | | 提醒 | `orange` |
| 勋章 | `light-yellow` | | 反馈 | `purple` |
| 新手引导与邀请 | `light-green` | | 数据统计 | `light-gray` |
| 小组件 | `light-red` | | 性能 | `medium-gray` |
| 日历 | `blue` | | 官网 | `gray` |
| 笔记 | `yellow` | | 其他 | no `background-color`, always last |

A recurring feature that fits none → add it to this table (reuse the colour that is furthest from its neighbours in the order) and tell the dev to commit it. One-off → 其他.

**📌 上次会上问到的** (first table): one row per feature the PM or marketing asked dev about in the last notes — a question, a "还没定" for dev, a "要做的事" for dev, or a "先别对外说" item. 上次问到的 = the question in a few plain words. 现在怎么样 = the answer from step ③ in one or two sentences; "还没开始" and "本周没有新动态" are real answers. If an answer depends on whether a version is live in the stores, ask the dev — GitHub can't tell.

**Status tables:** all items of one feature in one status → **one row**, rows in the feature order.
- **内容:** what the user gets, one short clause per item, joined with `；`. Plain Chinese, present tense, no code words, no promise words (马上、即将). Prefer the PR's release-note sentence.
- **备注:** only what helps the PM — `等拍板：…` (a pending decision in the notes that blocks this feature), `本周没有新动态`, `没有负责人`, `优先` (P1), checks still missing. Second paragraph: the links — PRs first, then PBIs: `#518 #572 · PBI #1502 #1593`, each a link. A branch with no PR → `（还没有 PR）`.
- **📝 会议提到:** add the tag when this meeting discussed that work. A decision listed as carried over and not raised ("本次没提", "没人再提") doesn't count.
- **No names anywhere** — not devs, not the PM, not in links text.

## ⑤ Fill the template and check it

Work in a scratch directory outside the repo. Copy `template.xml`, replace every `{{…}}`, repeat each section's example row once per feature, keep everything else exactly. Dates like `9月26日`. A status with nothing in it keeps its heading and table with the single `本周没有` row, and its count reads `0 个功能`. The callout: 2–3 sentences — the answer to the most important 📌 row, the biggest change in 下一版本, what nobody has picked up.

Then check:
- `lark-cli docs +script --command parse --content - < draft.xml` → `data.assessment.status` is `passed`;
- no `{{` left; every 功能 tag's colour comes from the table above; no feature twice in one table; each `N 个功能` equals its rows;
- every 下一版本 row has a PR merged after the cutoff commit;
- no person's name (compare against the assignees, PR authors and the names in the notes).

## ⑥ Publish

1. **Draft:** `lark-cli docs +create --doc-format xml --parent-position my_library --content - --as user < draft.xml`. Check `warnings`. Give the dev the link and the counts per status, and anything you were unsure about.
2. **Wait for the dev's OK.** Changes → fix the draft with `docs +update`, never create a second doc.
3. **Move it to the team:** get the draft's node with `lark-cli wiki +node-get --node-token <draft url> --as user`, find 报告存档 › 开发进度 in "BlotzTask 文档", and run `lark-cli wiki +move` with the draft's node as source and 开发进度 as `--target-parent-token`. Reply with the final link.

Never create or move into 开发进度 without the dev's OK — the whole team reads it.
