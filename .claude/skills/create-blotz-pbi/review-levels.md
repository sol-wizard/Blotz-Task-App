# Review levels (L1–L4)

Every PBI — and the PR that implements it — carries exactly one level label. The level decides who must approve the PR (after the AI review) and who Discord pings when it opens.

| Level | Rule | Approval needed |
|---|---|---|
| `L1` · Verifiable | Small and isolated, **and the AI can prove it works 100%** — unit tests, or driving the UI (`real-device-test` for the app, Playwright for the website). The proof goes in the PR. | 1 approval from anyone |
| `L2` · Contained | A normal change. If it's wrong, only one feature is hit and a revert fixes it completely. | 1 tech-lead candidate |
| `L3` · Wide or lasting | If it's wrong, many parts or other systems are hit, or it leaves something a revert can't undo — stored data, behaviour users rely on, shared contracts, upgrades. | 1 tech lead |
| `L4` · Critical | If it's wrong, the harm goes beyond a bug: security or access, personal data, money, production infrastructure. | 2 approvals, at least 1 tech lead |

## How to pick

Go top-down; the first "no" decides:

1. Can the AI fully prove it works? No → at least `L2`.
2. Is the impact limited to one feature, and does a revert fix everything? No → at least `L3`.
3. Could a mistake cause a security, data, money or production problem? Yes → `L4`.

Unsure → one level up.

## L1 needs proof

An `L1` PR must show how the AI verified it: the test command and its result, or screenshots of the UI before and after. No proof in the PR → it isn't `L1`; treat it as `L2`.
