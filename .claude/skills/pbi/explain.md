# Explain a PBI (before coding)

Before any code is written, turn the PBI into a short page the dev can read in two minutes, so misunderstandings surface **now** — not in review two days later.

## Steps

1. **Read everything relevant.**
   - The PBI: `gh issue view <n> -R Blotz-Org/Blotz-Task-App-Private --json title,body,labels,comments`
   - Planning notes and past decisions: follow the `private-context` skill.
   - The code it touches — find the real screens, endpoints and entities by searching, don't guess from names.

2. **Write one page** to `.pbi-explain/<n>.html` in the repo root (gitignored — never commit it), then open it — `open` on macOS, `start` on Windows, `xdg-open` on Linux — and always print the file path too, in case opening fails. Plain HTML, readable on a phone. Four short sections, in this order:

   | Section | What goes in it |
   |---|---|
   | **What the user sees** | Before → after, as a small scenario: "Today, Xiao Ming … → after this PBI, Xiao Ming …". Screens and words the user actually sees, no code. |
   | **What changes in the code** | Backend / app / database, a few bullets each: which screen, endpoint or entity, and what happens to it. Name real files. |
   | **Risks** | What else uses the same code and could break, and how to check it. Only real risks for this change. |
   | **Questions ❓** | Anything the PBI doesn't answer. Each one is a question to ask the tech lead **before** coding. None → say "No open questions". |

   End with one line: **How to prove it works** — the test to run, or the screen to check with `real-device-test` / Playwright. For an `L1` PBI this is the proof the PR will need.

3. **Keep it short.** A page, not a spec: no section longer than ~6 bullets, plain words, no copied PBI text. If the page gets long, the PBI is probably too big — say so.

4. **Tell the dev** the page is open, and list the ❓ questions in the reply so they can ask them straight away. Don't start coding until the dev says go.
