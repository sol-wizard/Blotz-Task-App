---
name: process-feedback
description: Use when processing Blotz user feedback in Lark — "process feedback", "run the feedback skill", "sort this month's feedback" — or a dry run of it.
---

# Process user feedback (Lark)

Reads new raw feedback, picks 反馈类型 and 功能模块, merges reports that mean the same thing into one
master row, writes straight to the master table, then adds one row to 报告中心 for the PO.
Wrong classifications are fine: people fix them by hand in Lark.

**Never:** write the PO decision field · change the raw table · put feedback text or screenshots in
the repo, a commit or a PR (it's user data; keep it in a temp folder and delete it at the end).

## How to call Lark

Every call is the raw API through `lark-cli api … --as bot --format json`, the same calls the
meeting-notes pipeline uses. Don't use the `lark-cli base` / `wiki` shortcuts (`+record-list`,
`+field-list`, `+record-upload-attachment`…): they need `base:*` / `wiki:*` scopes the Blotz Summary
Bot doesn't have, and fail with `app_scope_not_applied`.

Success is `"ok": true`. `<base>` is the base token, `<table>` a table ID.

| Do | Call |
|---|---|
| Resolve a wiki node | `GET /open-apis/wiki/v2/spaces/get_node --params '{"token":"<node>"}'` → `data.node.obj_token` |
| List fields | `GET /open-apis/bitable/v1/apps/<base>/tables/<table>/fields` |
| List rows | `GET /open-apis/bitable/v1/apps/<base>/tables/<table>/records --params '{"page_size":500}' --page-all` |
| Download a screenshot | `GET /open-apis/drive/v1/medias/<file_token>/download -o <file>` |
| Upload a screenshot | `POST /open-apis/drive/v1/medias/upload_all --file "file=<file>" --data '{"file_name":"<name>","parent_type":"bitable_image","parent_node":"<base>","size":"<bytes>"}'` → `data.file_token` |
| Update a row | `PUT /open-apis/bitable/v1/apps/<base>/tables/<table>/records/<record_id> --data '{"fields":{…}}'` |
| Create a row | `POST /open-apis/bitable/v1/apps/<base>/tables/<table>/records --data '{"fields":{…}}'` |

Field values: text comes back as a list of `{"text": …}` pieces (join them); dates are milliseconds;
a number such as 累计反馈 can come back as text (`"7"`), so convert it before adding 1;
an attachment cell is a list of `{"file_token": …}`. **Writing an attachment cell replaces it**, so
always send the existing tokens plus the new ones. `--file` and `-o` only take a path relative to the
current folder, so run everything from the temp folder.

## ⓪ Setup check — stop if any fails

1. `lark-cli --version` works. If not: `npx @larksuite/cli@latest install`.
2. `lark-cli whoami` shows `"identity": "bot"` and `"tokenStatus": "ready"`. If not, the user runs, in a
   normal Terminal (not with `!`), with the bot's keys from the keychain:
   `security find-generic-password -s blotz-lark-app-secret -w | lark-cli config init --app-id "$(security find-generic-password -s blotz-lark-app-id -w)" --app-secret-stdin --brand lark`
3. `config.json` exists next to this file. If not: copy `config.example.json` and ask the user for the IDs.
4. If `base_token` is a wiki node, resolve it (table above) and use `obj_token` as the base token.
5. List the fields of both tables: every field named in the config exists (including `po_decision`
   and `source`). Note the options (`property.options`) of 反馈类型 and 功能模块 — classification may
   only use those.

## ① Read

1. Make a temp folder (`mktemp -d`) and `cd` into it. Everything downloaded goes there.
2. Read **all** master rows (record_id, title, type, module, description, count, latest_time,
   screenshot tokens).
3. **Start point** = the latest `latest_time` across master rows (empty table → read everything).
4. Read the raw rows. Keep those with time **at or after** the start point, sorted oldest first. Drop
   any raw row already in a master description (same time + same text) — that makes a re-run after a
   crash safe, even when two reports share the same second.
   反馈时间 is a date with no time, so "at or after" re-reads the whole start day; this same check
   stops those rows from being counted twice.
5. Nothing left → skip to ④ with 要点 = "本月没有新反馈。"

## ② Decide, one raw row at a time (oldest first)

1. Download its screenshots and look at them.
2. Pick 反馈类型 and 功能模块 from the option lists only. Nothing fits → closest option, and list it in
   the report.
3. Compare by **meaning, not wording** with every master row, including rows already decided by the
   PO (Rejected too) and rows created earlier in this run:
   - **Same issue** → merge.
   - **New issue** → new row.
   - **Unsure** → merge, and list it in the report for the PO to double-check.
   - **Two or more issues in one report** → treat each issue on its own (merge or new row, each
     counted once) with the full raw text as the dot point in each, and list it in the report.
4. Also list in the report: a merge into a row whose PO decision is 已解决 or 不采纳 (the problem may
   be back, or the request keeps coming), and an issue that already has more than one master row
   (pick one to merge into; don't merge master rows yourself).

## ③ Write — one raw row at a time, in order

Dot point format, one line per report: `• <反馈时间> — <raw text>`

First upload the raw row's screenshots (each gives a `file_token`). Then **one** write per raw row, so
the dot point, the count and the screenshots land together:

- **Merge:** update the master row: description + the new dot point, count + 1 (an empty count
  counts as 1, so it becomes 2), latest_time = this report's time, screenshot = its existing tokens +
  the new ones. If the description doesn't start with `•` yet (an old row), first turn it into
  `• <its current latest_time> — <its current text>`, so the old report keeps its date.
- **New:** create a row with a short title in the feedback's language, type, module, description =
  its dot point, count = 1, latest_time = its time, source = `new_row_source`, screenshot = the new
  tokens.

Update your in-memory copy of the master row after each write, so the next raw row sees it.

**Stop at the first failed write** and tell the user which raw row failed. Carrying on would move the
start point past the failed row, and it would never be read again. **Still go to ④** with what was
written so far, and add `⚠️ 本次运行在第 N 条中断，剩下的下次处理。` to 要点 — otherwise the flags
for the rows already written are lost, because the next run starts after them. If the report write
fails too, print the full 要点 for the user to pass on to the PO. A failed screenshot upload alone
doesn't stop the run — write the row without it and list it in the report.

## ④ Report — one row in 报告中心

The PO reads every team report in 报告中心 (`report_center` in the config), so this run's summary
goes there too, the same way the monthly 活跃用户 rows do. No notification is needed.

Every run adds a new row, even twice in one month: 日期 shows when each run happened.

1. Read the 报告中心 rows with 类型 = `用户反馈`.
2. Write one row:

   | Field | Value |
   |---|---|
   | 报告 | `💬 用户反馈 <YYYY-MM>` |
   | 类型 | `用户反馈` |
   | 日期 | today, in the local time of the computer running this |
   | 月份 | `<YYYY-MM>` |
   | 要点 | the summary below |
   | 链接 | `{"text": "去评审", "link": <review_view_url>}` |
   | 最新一期 | ✅ |
   | 给谁看 | `产品组` |

   If a 用户反馈 row's title contains `（还没有）`, it's the placeholder: update that row instead of
   creating a new one (first run only). Otherwise create a row.
3. Update every **other** 用户反馈 row with 最新一期 ✅ to ❌.

要点, in Chinese, short. Count raw reports, so the three numbers add up to the total read; a report
merged into a row created earlier in this same run counts as 和本次其他反馈重复, not 已有问题:

    本次收到 15 条反馈：新问题 6 个；合并到已有问题 8 条；和本次其他反馈重复 1 条。
    ⚠️ 请确认：「登录时闪退」合并到了「登录页卡住」，不确定是否同一问题；「…」没有合适的功能模块，暂归为「其他」。

Then delete the temp folder.

## Dry run

When the user asks for a dry run: do everything above, but add `--dry-run` to every write (uploads,
row updates and row creates, in both the feedback Base and 报告中心). Reads and screenshot downloads
still run. Print the planned writes and the 要点 text in the terminal. Lark doesn't change.
