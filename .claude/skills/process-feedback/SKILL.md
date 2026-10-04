---
name: process-feedback
description: Use when processing Blotz user feedback in Lark — "process feedback", "run the feedback skill", "sort this month's feedback" — or a dry run of it.
---

# Process user feedback (Lark)

Reads new raw feedback, picks 反馈类型 and 功能模块, merges reports that mean the same thing into one
master row, writes straight to the master table, then leaves one summary comment for the PO.
Wrong classifications are fine: people fix them by hand in Lark.

**Never:** write the PO decision field · change the raw table · put feedback text or screenshots in
the repo, a commit or a PR (it's user data; keep it in a temp folder and delete it at the end).

## ⓪ Setup check — stop if any fails

1. `lark-cli --version` works. If not: `npx @larksuite/cli@latest install`.
2. The bot is configured: run any read below with `--as bot`. An auth error → tell the user to run
   `lark-cli config init` with the bot's app ID and secret (choose an existing app, never `--new`).
3. `config.json` exists next to this file. If not: copy `config.example.json` and ask the user for the IDs.
4. If `base_token` is a wiki node, resolve it: `lark-cli wiki +node-get --node-token <token> --as bot`
   and use `obj_token` as the base token.
5. `lark-cli base +field-list` on both tables: every field named in the config exists. Note the option
   lists of 反馈类型 and 功能模块 — classification may only use those options.

All commands below use `--as bot` and the base token from step 4.

## ① Read

1. Make a temp folder: `mktemp -d`. Everything downloaded goes there.
   Run the reads from inside it (`cd` there first): `+record-list --output` only takes a relative path.
2. Read **all** master rows with `+record-list` (record_id, title, type, module, description, count,
   latest_time, screenshot). Page through until `has_more` is false.
3. **Start point** = the latest `latest_time` across master rows (empty table → read everything).
4. Read the raw rows with `+record-list`. Keep those with time **at or after** the start point, sorted
   oldest first. Drop any raw row already in a master description (same time + same text) — that
   makes a re-run after a crash safe, even when two reports share the same second.
5. Nothing left → skip to ④ and post "本月没有新反馈。"

## ② Decide, one raw row at a time (oldest first)

1. Download its screenshots: `+record-download-attachment --output <temp folder>`, and look at them.
2. Pick 反馈类型 and 功能模块 from the option lists only. Nothing fits → closest option, and list it in
   the comment.
3. Compare by **meaning, not wording** with every master row, including rows already decided by the
   PO (Rejected too) and rows created earlier in this run:
   - **Same issue** → merge.
   - **New issue** → new row.
   - **Unsure** → merge, and list it in the comment for the PO to double-check.

## ③ Write — one raw row at a time, in order

Dot point format, one line per report: `• <反馈时间> — <raw text>`

- **Merge:** first upload its screenshots to the master row
  (`+record-upload-attachment --field-id <screenshot>` — it adds, never replaces). Then **one**
  `+record-batch-update` on that row: description + the new dot point, count + 1,
  latest_time = this report's time.
- **New:** `+record-batch-create` with a short title in the feedback's language, type, module,
  description = its dot point, count = 1, latest_time = its time. Then upload its screenshots to the
  new record.

Update your in-memory copy of the master row after each write, so the next raw row sees it.

**Stop at the first failed write** and tell the user which raw row failed. Carrying on would move the
start point past the failed row, and it would never be read again. A failed screenshot upload alone
doesn't stop the run — list it in the comment.

## ④ Comment

One `lark-cli task +comment --task-id <summary_task_id>`, in Chinese, short:

    10月反馈：新问题 6 条，合并到已有问题 8 条。
    ⚠️ 请确认：
    - 「登录时闪退」合并到了「登录页卡住」，不确定是否同一问题。
    - 「…」没有合适的功能模块，暂归为「其他」。

Then delete the temp folder.

## Dry run

When the user asks for a dry run: do everything above, but add `--dry-run` to every write
(`+record-batch-create`, `+record-batch-update`, `+record-upload-attachment`, `task +comment`). Reads
still run. Print the planned writes and the comment text in the terminal. Lark doesn't change.
