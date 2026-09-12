---
description: Use this skill when the user asks to review a GitHub pull request, review a PR, check a PR, or comments on a PR link. Performs a concise AI-assisted senior-level PR review.
argument-hint: "[PR number (optional, defaults to current branch)]"
---

# ---

description: Use this skill when the user asks to review a Blotz GitHub pull request, review a PR, check a PR, or comments on a PR link. Performs a concise AI-assisted senior-level PR review.
argument-hint: "[PR number, PR URL, or branch; optional, defaults to current branch]"
-------------------------------------------------------------------------------------

# PR Review

1. Identify the PR target from the command argument. If a PR number, PR URL, or branch is provided, use it. If no argument is provided, default to the PR for the current branch.

2. Run `gh pr diff <PR target>` to get the PR changes. If no PR target is provided, run `gh pr diff`. Focus only on the branch's own work and ignore unrelated merge noise.

3. Run `gh pr view <PR target> --json title,body,number,url` to read the PR description. If no PR target is provided, run `gh pr view --json title,body,number,url`. If the PR references an issue, such as `addresses #123` or `fixes #456`, fetch it with `gh issue view <number> --json title,body` for additional context.

4. Perform senior-level review: correctness, type safety, edge cases, code readability, and how well the solution fits Blotz. Verify claims in the PR description against the actual diff. Ask questions if you get confused. State all assumptions made and shortcuts taken.

5. For Blotz-specific review, pay extra attention when the PR touches: auth/user scoping, mobile-backend DTO contract changes, date/timezone handling, recurring tasks, AI generation, AI quota usage, review reports, notifications, and EF/database changes.

6. Do not care about generic test coverage numbers. Only suggest tests when the changed logic is important or risky, the test would be simple and maintainable, and it protects real Blotz behavior such as recurring tasks, local-day boundaries, user isolation, AI quota, or review period logic.

7. List issues by severity: critical/major/minor. Only raise comments that have real value. Do not invent or pad with low-signal nitpicks. If you don't find meaningful issues, say so plainly instead of manufacturing feedback. Explain issues shortly and concisely with a suggested fix or validation step.

8. Do not raise theoretical risks. A race condition, a scaling concern, or a "what if two requests arrive at once" needs a realistic path to happening in this app, and a consequence worse than something that corrects itself. If it self-heals, needs contrived conditions, or the fix costs more than the problem, cut it — do not label it and post it anyway. Labelling is only for a genuine but minor point, such as `nit:` on a readability preference.

9. Write for a junior developer. Short sentences, plain words, no unexplained jargon. Say "you read the list, change it, then save" rather than "read-modify-write". Aim for one to three sentences per comment. If it needs a second paragraph, it is probably two comments or one that should be cut.

10. Stay inside what the PR actually changes. A backend PR gets backend comments. Do not write guidance about the author's future frontend or mobile work, even when the same feature spans both and you can see what is coming — that belongs on that PR, and here it just makes the review long and off-topic. Comment on a downstream consumer only when the diff breaks it today.

11. Post inline comments only. No PR-level summary comment, no recap of the review, no AI-generated disclaimer. Every finding attaches to the line it is about. If a finding has no line to attach to, work out which line it most affects and put it there.

12. Everything goes on the PR. Product and UX judgement calls, and questions about why an approach was chosen, are things the author can answer, so raise them as inline comments like any other finding. Do not route findings to a separate notes file.

13. Never comment on the release-note checklist, even when the wrong box is clearly ticked. It is a process detail rather than a code problem, and Ben does not want it raised on the PR.

14. Keep GitHub comments concise. This is one of the most important rules. Explain enough context so the author understands the issue and why it matters, but avoid long paragraphs. Each comment should be short, actionable, and focused on the specific risk or improvement.
