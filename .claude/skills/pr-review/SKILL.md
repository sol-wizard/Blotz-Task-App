---
name: pr-review
description: Use this skill when the user asks to review a Blotz GitHub pull request, review a PR, check a PR, or comments on a PR link — or asks which PRs are waiting for them ("what PRs are waiting for me?", "review queue"). Performs a concise AI-assisted senior-level PR review.
argument-hint: "[PR number, PR URL, or branch; optional, defaults to current branch]"
---

# PR Review

**"What PRs are waiting for me?"** → read only `queue.md` in this folder and stop there; the review below starts when they pick one ("review #572").

1. Identify the PR target from the command argument. If a PR number, PR URL, or branch is provided, use it. If no argument is provided, default to the PR for the current branch.

2. Run `gh pr diff <PR target>` to get the PR changes. If no PR target is provided, run `gh pr diff`. Focus only on the branch's own work and ignore unrelated merge noise.

3. Run `gh pr view <PR target> --json title,body,number,url` to read the PR description. If no PR target is provided, run `gh pr view --json title,body,number,url`. If the PR references an issue, such as `addresses #123` or `fixes #456`, fetch it with `gh issue view <number> --json title,body` for additional context.

4. Perform senior-level review: correctness, type safety, edge cases, code readability, and how well the solution fits Blotz. Verify claims in the PR description against the actual diff. Ask questions if you get confused. State all assumptions made and shortcuts taken.

5. For Blotz-specific review, pay extra attention when the PR touches: auth/user scoping, mobile-backend DTO contract changes, date/timezone handling, recurring tasks, AI generation, AI quota usage, review reports, notifications, and EF/database changes.

6. **Decide whether re-testing is worth it — don't re-test by default.** Read the PR's `Verified:` line first.
   - Clear proof, and a simple change (`L1`/`L2`) → trust it; don't re-run anything.
   - Risky change (`L3`/`L4`), or the proof is thin, missing, or doesn't cover what the diff changes → re-run **only** the relevant tests: backend `cd blotztask-test && dotnet test --filter <class>`. A real-device run is expensive — ask the reviewer before starting one.
   - Say in one line which you chose and why.

7. Do not care about generic test coverage numbers. Only suggest tests when the changed logic is important or risky, the test would be simple and maintainable, and it protects real Blotz behavior such as recurring tasks, local-day boundaries, user isolation, AI quota, or review period logic.

8. List issues by severity: critical/major/minor. Only raise comments that have real value. Do not invent or pad with low-signal nitpicks. If you don't find meaningful issues, say so plainly instead of manufacturing feedback. Explain issues shortly and concisely with a suggested fix or validation step.

9. Do not raise theoretical risks. A race condition, a scaling concern, or a "what if two requests arrive at once" needs a realistic path to happening in this app, and a consequence worse than something that corrects itself. If it self-heals, needs contrived conditions, or the fix costs more than the problem, cut it — do not label it and post it anyway. Labelling is only for a genuine but minor point, such as `nit:` on a readability preference.

10. Write for a junior developer. Short sentences, plain words, no unexplained jargon. Say "you read the list, change it, then save" rather than "read-modify-write". Aim for one to three sentences per comment. If it needs a second paragraph, it is probably two comments or one that should be cut.

11. Stay inside what the PR actually changes. A backend PR gets backend comments. Do not write guidance about the author's future frontend or mobile work, even when the same feature spans both and you can see what is coming — that belongs on that PR, and here it just makes the review long and off-topic. Comment on a downstream consumer only when the diff breaks it today.

12. Post inline comments only. No PR-level summary comment, no recap of the review, no AI-generated disclaimer. Every finding attaches to the line it is about. If a finding has no line to attach to, work out which line it most affects and put it there.

    **When to post depends on the PR's review level** (its `L1`–`L4` label: `gh pr view <PR target> --json labels --jq '[.labels[].name | select(test("^L[1-4]$"))][0]'`):

    | Level | Comments | Verdict |
    |---|---|---|
    | `L1` | Post straight away — being asked to review is permission. | Ask the reviewer (below). |
    | `L2`, `L3`, `L4`, or no level label | **Don't post yet.** Show the reviewer every draft comment (file, line, text) and let them edit, cut or add. Post only what they approve — a person has to stand behind the AI's review above L1. | Ask the reviewer (below), then post comments + verdict together. |

    **The verdict is always the reviewer's explicit word.** Once they've seen the comments, ask: **Approve, Request changes, or comment only?** If a comment is something the author must fix, suggest *Request changes* (it turns the PR's Discord card to 🔁) — but never pick it for them, and never read one from silence. Submitted from the reviewer's own `gh` account, it counts as their approval for the review level. GitHub won't let anyone approve or request changes on their **own** PR — then only *comment only* is possible.

    Every comment's `line` must be **inside the diff** — an added line or a context line shown in one of the diff's hunks. GitHub rejects the whole review (HTTP 422) if even one comment points outside it, and then nothing gets posted. If the line a finding is about isn't in the diff, attach it to the nearest changed line and name the real line in the comment ("`foo()` on line 120 still …"). If a 422 comes back anyway, find the offending comment, move it, and resend.

    Send everything as **one review**, so the author gets one notification: the comments plus `event` = `APPROVE`, `REQUEST_CHANGES` or `COMMENT` (for *comment only*). `REQUEST_CHANGES` needs a short `body` saying what must change.

    ```
    gh api repos/sol-wizard/Blotz-Task-App/pulls/<n>/reviews --input review.json
    # review.json: {"event": "APPROVE", "comments": [{"path": "...", "line": 42, "side": "RIGHT", "body": "..."}]}
    ```

    `L1` is the one exception: its comments already went up straight away as a `COMMENT` review, so the verdict goes as a second review with no comments. *Comment only* → nothing more to send.

    After submitting, reply with the PR URL, the verdict, and how many comments went up. No findings → still ask for the verdict (usually *Approve*), post no comments.

13. Everything goes on the PR. Product and UX judgement calls, and questions about why an approach was chosen, are things the author can answer, so raise them as inline comments like any other finding. Do not route findings to a separate notes file.

14. Never comment on the release-note checklist, even when the wrong box is clearly ticked. It is a process detail rather than a code problem, and Ben does not want it raised on the PR.

15. Keep GitHub comments concise. This is one of the most important rules. Explain enough context so the author understands the issue and why it matters, but avoid long paragraphs. Each comment should be short, actionable, and focused on the specific risk or improvement.
