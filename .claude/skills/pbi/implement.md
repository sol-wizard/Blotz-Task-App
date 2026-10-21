# Implement a PBI

Build the PBI the planned way: check the tests can run, write code in small pieces, test each piece cheaply, prove it once at the end. Orchestration, not vibe coding — and every step is chosen to save tokens.

## 1. Start from the explain page

- `.pbi-explain/<n>.html` missing → run `explain.md` first and **wait for the dev's "go"**.
- It exists → reuse its **✅ How to prove it works** section as the test plan. Don't analyse the PBI a second time.
- The dev's `go` carries the choices copied from the page (`#1578 · 1️⃣ A (…)`) — build to those. Missing → ask them to paste the line from the page; don't re-ask the questions here.
- A **new** decision that comes up while coding (not on the page) → ask in the terminal: one question, 2–3 options, your pick and why, then wait.
- Once the dev says go, move the card to **In Progress** with `update.md` (status only, no note), so the board shows it's being worked on.
- On `main` or a detached HEAD → create the branch first: `git fetch origin && git switch -c <fix|feat|chore>/<n>-<short-name> origin/main`.

## 2. UI, backend, or both?

Decide from that test plan (and the page's folded file list): does it change the **app** (UI), the **backend**, or **both**? That picks the tests below.

## 3. Check the tests can run — before any code

Cheap checks only. If one fails: **stop**, tell the dev exactly how to fix it, and write no code (fail loud, no half output).

| Change | Check | Passes when |
|---|---|---|
| Backend | `docker info` | Docker is running — the tests use Testcontainers (a real SQL Server in Docker) |
| Backend | `cd blotztask-test && dotnet build` | builds |
| App | `cd blotztask-mobile && npx tsc --noEmit 2>&1 \| grep 'error TS' \| grep -v '^node_modules/'` | runs — note how many lines it prints. That's the baseline: library code in `node_modules` has its own type errors, so ignore those and never "fix" them |
| App, when the user will see the change | `real-device-test` §0 readiness rows 1–4 and 7 (iPhone) or §6.1 rows A1–A5 (Android) | phone connected, trusted, developer mode on, dev build installed. iPhone needs a Mac; an Android phone works from any computer, Windows included. Neither available → tell the dev, and plan for the reviewer or a teammate with one to do the phone run. |

## 4. Write the code in small pieces

One piece = one thing that can be checked on its own (an entity + its migration, a handler, a hook, a screen). Follow the repo skill for each piece: `backend-changes`, `database-migrations`, `expo-*`, `working-with-ai-agent`.

After **each** piece, run the cheap check and fix before moving on:
- **Backend** → the related tests: `cd blotztask-test && dotnet test --filter <TestClassOrName>`. If the logic is non-obvious and has no test, add one — follow `writing-tests` (it also decides when a test isn't worth it).
- **App** → the same `tsc` command as step 3 (no **new** lines compared with the baseline) and `npx expo lint` in `blotztask-mobile/`. The app has no unit tests, so this is the per-piece check; the phone run in step 5 is the real proof.

## 5. Prove it — once, at the end

All pieces done and every check green:
- **Backend** → run the full related test class once more; keep the command and the pass line.
- **Real device — only when it's needed.** Run `real-device-test` **once** only if the change affects what the user **sees or does** in the app (a screen, a button, a flow). Then run the key flow from the explain page and screenshot the before/after states it lists as in `screenshots.md`, so `update.md` can put them on the PBI without asking the dev. Skip it when the user can't notice the change — backend only, internal clean-up, logic with no visible effect — the checks above are enough. Either way, say in one line why you ran it or skipped it. It's the most expensive test, so never run it per piece.

## 6. Review

Run `/code-review` on the diff and **fix the low-level findings yourself** (bugs, edge cases, style). Then give the dev the summary they must understand — the **what** and the **why**, not every line — in two places:

- **Terminal — short:** a few lines only. **What changed** (plain words), **why this approach** (one sentence), **risks** (security or access, user data, money, production — or "none").
- **Explain page — a bit more detail, not too much:** fill the **✅ What was done** section at the bottom of `.pbi-explain/<n>.html` (the template has it commented out — uncomment and fill it): user before/after, why this approach (and any choice that differs from the PBI), files changed one line each, how it was proved, risks. Say the page was updated and print its path.

Ask the dev if anything is unclear before moving on. They need to be able to explain the summary to a reviewer.

## 7. Hand off to `pr`

Open the PR with the `pr` skill. The proof goes in its `Verified:` line:

| Change | Proof |
|---|---|
| Backend | the test command + its result (e.g. `dotnet test --filter SoundDefaultTests` → 4 passed) |
| UI the user can see | the real-device screenshots |
| Both | both |
