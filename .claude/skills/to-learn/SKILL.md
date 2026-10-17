---
name: to-learn
description: Use right after a PR is opened (the `pr` skill runs it automatically), or when the dev asks what they should learn from their work — "what should I learn from this?", "make my to-learn list". Turns the questions the dev asked the AI on this branch, and what the AI decided for them, into a short to-learn checklist with docs, saved locally.
---

# To-learn list

The AI writes most of the code now. This step makes sure the dev still learns from it: after the PR is opened, turn this branch's work into a short checklist of things the dev should study on their own, with the docs to read. It is saved on their machine so they can come back to it any time.

It never blocks the PR — the PR is already open. If a step fails, say so in one line and stop.

## 1. Gather what happened on this branch

Three sources. The first is the main one, but don't rely on it alone: a dev who leans on the AI **asks the fewest questions**, so their list would come out the shortest — the opposite of what we want.

1. **The dev's own questions** — every message they typed in any Claude Code session that touched this branch (one PBI often spans days). Claude Code keeps each session's transcript locally, and every message records the git branch. Match whole sessions, not single messages: the PBI explain step and the dev's `go` line run on `main`, before `implement.md` creates the branch, so a per-message branch filter would drop them:
   ```bash
   B=$(git branch --show-current)
   D=~/.claude/projects/$(pwd | sed 's/[^a-zA-Z0-9]/-/g')
   S=$(jq -c --arg b "$B" 'select(.gitBranch==$b) | .sessionId' "$D"/*.jsonl | sort -u | jq -sc .)
   jq -r --argjson s "$S" 'select(.type=="user" and (.sessionId as $id | $s | index($id)) and (.isMeta|not))
     | .message.content | if type=="string" then [.] else map(select(.type=="text") | .text) end
     | .[] | select(length>0 and (startswith("<")|not)) | .[0:500]' "$D"/*.jsonl
   ```
   Run it from the repo root. It keeps only what the dev typed — tool output and IDE context are dropped. No transcripts found (another AI tool, Windows path, nothing there) → use the current conversation only and say so in the reply.
2. **Choices the dev handed to the AI** — on `.pbi-explain/<n>.html`, the questions where the dev's `go` line took the 🤖 AI pick. They accepted a design decision without making it.
3. **Key concepts in the diff they never asked about** — `git diff main...HEAD`. Look for the ideas a reviewer would expect the author to explain: a migration, a timezone conversion, a cache invalidation, an auth check, a native permission. The AI wrote it; the dev may not understand it.

## 2. Pick 3–5 topics

- **Where the gap is, not what's trendy.** Each topic must point to a real moment on this branch: "you asked why the page didn't refresh", "the AI picked option B for you", "this PR adds a migration you didn't ask about".
- **The concept, not the fix.** "React Query cache invalidation", not "the bug in `useTasks`". Something worth knowing next time too.
- **Most useful first.** 3–5 items at most — a long list doesn't get read. Skip anything the dev clearly already knows.
- Nothing worth learning (a typo fix, a copy change) → say so in one line, write no file.

## 3. Find the docs — and check them

Never write a link from memory. For each topic, search and open the page to confirm it exists and covers the topic.

- **Official docs first** (React, React Native, Expo, TanStack Query, .NET, EF Core, Microsoft Learn, MDN, Apple / Android developer guides). Then one good article or video if the official page is hard for a beginner.
- 1–3 links per topic. Prefer the page for the exact concept, not the docs home page.

## 4. Write the file

Save to `to-learn/<YYYY-MM-DD>-PR-<number>-<short-name>.md` in the repo root. The folder is gitignored — **never commit it**. Create the folder if it's missing.

Write the explanations in **Chinese** (simple words, English for technical terms); the docs stay in their original language. Use this format exactly, so every dev's list looks the same:

```markdown
# PR #<number> · <PR title>

> <PR url> · <date> · tick a box when you've learned it

## [ ] 1. <Topic name>
- 🧐 为什么要学：<the moment on this branch, one sentence>
- 📚 学什么：<the 2–3 ideas to understand>
- 🔗 资料：
  - <title> — <url>
- ⏱️ 预计：<15 / 30 / 60 分钟>
- ✍️ 自测：<one question they can answer only if they understood it>
```

## 5. Tell the dev

Reply in a few lines:
- 📚 the file path (clickable), and how many topics it has
- one line per topic name
- a reminder that the folder is local only — it stays on their machine and isn't on the PR

## Notes

- Write about the **work**, never judge the dev. "This PR uses X — worth understanding" rather than "you didn't know X".
- Local only. Don't post the list on the PR or the PBI — this repo is public.
