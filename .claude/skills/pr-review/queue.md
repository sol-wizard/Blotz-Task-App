# Review queue

"What PRs are waiting for me?" → a short list, **no diff reading** (it costs almost no tokens). The deep review starts only when the reviewer picks one ("review #572").

1. **Who's asking:** `gh api user -q .login`. They're a tech lead if that login is in the list in `.claude/skills/pbi/review-levels.md`.

2. **Open PRs:**
   ```
   gh pr list -R sol-wizard/Blotz-Task-App --state open --json number,title,author,labels,createdAt,isDraft,reviewDecision
   ```
   Keep only PRs that are not drafts, not authored by the person asking, and not by a bot (`…[bot]`, `app/…`). `L3`/`L4` PRs show **only to tech leads**; `L1`, `L2` and unlabelled PRs show to everyone.

3. **List them, oldest first**, one line each:

   `👀 #572 · Feature/1593 referral progress · Armin1019 · L2 · waiting 3 days`

   - 👀 = waiting for review · 🔁 = changes requested (`reviewDecision` is `CHANGES_REQUESTED` — waiting for the author, listed last)
   - Level = its `L1`–`L4` label, or "no level"
   - Waiting = time since the PR was opened, in hours or days

4. **Stop.** Ask which one to review. Nothing waiting → say so in one line.
