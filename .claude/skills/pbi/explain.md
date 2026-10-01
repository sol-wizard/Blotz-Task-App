# Explain a PBI (before coding)

Before any code is written, turn the PBI into a short page the dev can read in two minutes, so misunderstandings surface **now** — not in review two days later.

## Steps

1. **Read everything relevant.**
   - The PBI: `gh issue view <n> -R Blotz-Org/Blotz-Task-App-Private --json title,body,labels,comments`
   - Planning notes and past decisions: follow the `private-context` skill.
   - The code it touches — find the real screens, endpoints and entities by searching, don't guess from names.

2. **Write one page** to `.pbi-explain/<n>.html` in the repo root (gitignored — never commit it) by filling in **`explain-template.html`** in this folder. Keep its styling and section order exactly, so every dev's page looks the same:

   | Section | What goes in it |
   |---|---|
   | 🇨🇳 **Chinese quick read** | 3 short lines in Chinese, at the very top: 📍 在哪里 (the feature and how to reach it, e.g. 番茄钟：日历 → 任务右滑 → 专注), 问题 (what's wrong for the user) and 要解决 (what this PBI must achieve). If the PBI doesn't say where, find the screen in the code. The dev reads this first, so they get the problem before the English. |
   | 🐛🛠️❓ **Top box** | 3 lines: the problem, what to change, and "decide the questions below first" (or "No open questions") |
   | 👀 **What the user sees** | Today → after, as a Xiao Ming scenario. What the user sees, no code. |
   | ❓ **Questions to decide** | Anything the PBI doesn't answer. One card per question, 2–3 options with a one-line reason each, and **one** marked 🤖 AI pick. Options are clickable: keep each card's `data-q` and each option's `data-opt`, and the template's script turns clicks into one line to copy (e.g. `#1578 · 1️⃣ A · 2️⃣ B`). The dev decides with their AI first and asks the tech lead only if still unsure. |
   | ⚠️ **Also check** | Other things that could break, and how to spot them. Only real ones. |
   | ✅ **How to prove it works** | Steps you can see or run, and what you should see. Plus the suggested level (`L1`–`L4`) with one sentence why. For `L1`, this is the proof the PR needs. |
   | 💻 **Folded: which files change** | Real file names and what changes in each — only for when coding starts. |

   **Writing rules:** apart from the Chinese quick read, simple English, short sentences. After a hard word, add the Chinese in brackets — migration (数据库迁移). One emoji at the start of each heading and point. No code words above the folded section.

   Then open it — `open` on macOS, `start` on Windows, `xdg-open` on Linux — and always print the file path too, in case opening fails.

3. **Keep it short.** A page, not a spec: no section longer than ~6 bullets, plain words, no copied PBI text. If the page gets long, the PBI is probably too big — say so.

4. **Tell the dev** the page is open: pick an option on each ❓ question on the page, click **Copy**, and paste the line with `go` (e.g. `go #1578 · 1️⃣ A (keep timer)`). The page is where these questions are decided — don't ask them again in the terminal. `go` without the line → ask them to click Copy and paste it. Don't start coding until the dev says go.
