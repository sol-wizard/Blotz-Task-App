---
name: pr
description: Use for the author's side of a pull request — opening one ("create me a PR", "open a PR", "raise a PR"), fixing the description or release note on an existing PR, or handling review feedback ("fix the review comments", "address the review", "I've fixed it, send it back").
---

# PR

The author's side of a pull request. Two separate jobs — read **only** the file for the job at hand:

| The dev wants to… | Read |
|---|---|
| Open a PR, or fix the description / release note of an existing one | `open-or-update.md` |
| Fix review comments and send the PR back to the reviewer | `after-review.md` |

If it's unclear which one, ask. The reviewer's side is the `pr-review` skill.
