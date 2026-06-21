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

5. For Blotz-specific review, pay extra attention when the PR touches: auth/user scoping, mobile-backend DTO contract changes, date/timezone handling, recurring tasks, AI generation, AI quota usage, review reports, notifications, EF/database changes, and release-note checklist correctness.

6. Do not care about generic test coverage numbers. Only suggest tests when the changed logic is important or risky, the test would be simple and maintainable, and it protects real Blotz behavior such as recurring tasks, local-day boundaries, user isolation, AI quota, or review period logic.

7. List issues by severity: critical/major/minor. Only raise comments that have real value. Do not invent or pad with low-signal nitpicks. If you don't find meaningful issues, say so plainly instead of manufacturing feedback. Explain issues shortly and concisely with a suggested fix or validation step.

8. If you include a nitpick, style preference, or speculative risk, explicitly label it and tell the user they can ignore it. For example: `nit:` or `speculative — feel free to ignore:`. Keep these separate from real issues so they don't dilute the review.

9. When posting comments to GitHub, include one PR-level summary comment that says this is an AI-generated PR review. The author should treat the findings as suggestions, use their own judgment, and verify the comments before making changes. Do not repeat this disclaimer in every inline comment.

10. Keep GitHub comments concise. This is one of the most important rules. Explain enough context so the author understands the issue and why it matters, but avoid long paragraphs. Each comment should be short, actionable, and focused on the specific risk or improvement.
