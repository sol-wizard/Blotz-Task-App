---
name: generate-weekly-focus
description: Use when the user wants a weekly summary of what the team is working on for marketing/product — e.g. "weekly focus", "what are we working on this week", prep for the Sunday planning meeting.
---

# Generate the Weekly Focus report

A short, bilingual (EN/中文) status brief for the **marketing and product team** — not engineering. It answers one question: *what is the team shipping, finishing, building, and about to start?* Read-only against GitHub — this skill never writes to the project board, issues, or PRs.

## Auth requirement

Reading Project 1 needs the `read:project` scope. Check with `gh auth status`. If missing, tell the user to run `gh auth refresh -s read:project,project` (interactive — only they can do it) and stop until they confirm it's done.

## ① Pull the board

```
gh project item-list 1 --owner Blotz-Org --format json --limit 1000
```

Each item has `assignees`, `status`, `title`, `labels`, `iteration` (`{title, startDate, duration}` or absent), and `content.number` (the issue #).

**Base filter: assignees non-empty** — someone owns it. Everything downstream applies on top of this. The assignee is only ever used internally for matching (step ③) — **never print assignee names in the final report.**

## ② Pick the iteration window — current, and current-1 only

Never look back further than one iteration behind whichever iteration you land on as "current." Old work is not this week's focus.

1. Get the real iteration list (item-list only shows iterations that have items, which hides empty ones):
   ```
   gh api graphql -f query='
   query {
     organization(login: "Blotz-Org") {
       projectV2(number: 1) {
         field(name: "Iteration") {
           ... on ProjectV2IterationField {
             configuration {
               iterations { title startDate duration }
               completedIterations { title startDate duration }
             }
           }
         }
       }
     }
   }'
   ```
   `iterations` = current + future (sorted ascending); `completedIterations` = past (sorted most-recent-first).

2. Find the literal "current" iteration — the one from `iterations` whose date range contains today.
3. Check how many assigned items reference it in the item-list pull.
   - **Has items?** That's current. Previous = the first entry in `completedIterations`.
   - **Zero items?** The team has already pre-loaded the next sprint (this happens routinely here). Treat the *next* entry in `iterations` as current instead, and the empty by-date-current becomes "previous" — which will usually contribute nothing, and that's expected, not a bug. Don't chase further back to find something to fill it with.
4. Filter board items to `iteration ∈ {current, previous}` **and** assigned (step ①).

**Exception — untagged iteration:** a PBI can be real, active, current-cycle work with an *empty* iteration field (seen with PBI 1520, a merged design-fidelity fix). Don't silently drop items just because they're untagged — if step ③'s PR/assignee matching turns one up and the dates line up with the current window, include it anyway.

## ③ Cross-check against real PRs

The board's Status column lags — a PBI can sit at "In Progress" for days after its PR already merged. PR reality wins over board status.

Repo: `sol-wizard/Blotz-Task-App` (the actual code lives here, not the private planning repo).

```
gh pr list --repo sol-wizard/Blotz-Task-App --state merged --limit 30 --json number,title,mergedAt
gh pr list --repo sol-wizard/Blotz-Task-App --state open --limit 30 --json number,title,createdAt
```

For each candidate match, pull the body and pull out the dev-written release note — it's already in user-facing language, which is exactly this report's audience, so **prefer it over the PBI title when writing copy**:

```
gh pr view <number> --repo sol-wizard/Blotz-Task-App --json title,mergedAt,body
```
(look for the `## Release note` section and the checked `[x]` status line — a PR whose own checkbox says "Internal only" or "Hidden in production" should generally be excluded even if the underlying PBI looked promising)

**Matching PR → PBI, in order of confidence:**
1. Title/content clearly describes the same change.
2. No title match → **compare the PBI's assignee to the PR's author.** Same person + plausible timing is a reasonable signal — pull that person's other recent PRs (`gh pr list --author <user> --state merged`) to sanity-check before committing to the match.
3. Still nothing → leave it unmatched. Don't force a match; the point of cross-checking is to understand each PBI better, not to guarantee 100% coverage. It's fine to report a PBI using only its board title/status if no PR corroborates it.

## ④ Sort into features vs. bug fixes, then into three buckets

Marketing can announce a feature; they can't do anything with "we fixed a bug" unless it was a visible, complained-about issue. Don't give the two equal weight.

- **Feature or user-visible improvement** → gets its own line, full weight, in whichever bucket matches its real status below.
- **Bug fix / reliability fix / routine content sync** (e.g. a policy-text sync, a crash fix, a navigation glitch) → gets folded into a single **"Also fixed"** line at the bottom of the bucket it landed in — one compact sentence per fix, joined together, visually muted. Not a bullet list, not a headline item.

Three buckets, by real status (from step ③, not raw board status):

| Bucket | Rule |
|---|---|
| **Landing soon** | PR merged (regardless of stale board status) *or* PR open and clearly close to merging, *or* board status In Review / PM Review |
| **In the works** | Board In Progress, no PR yet (or a PR that's still early) |
| **Coming next** | Board Backlog Ready |

Wording guard: **never call a merged-but-unreleased item "shipped" or "released."** A merged PR is code-complete; it isn't in front of users until the next app release goes out. "Landing soon" / "almost ready" language is accurate — "shipped" is not.

**Exclude entirely, from all buckets:**
- New-hire onboarding/learning tickets (any title like "`<name>` - Onboarding/Learning/Repo Onboarding")
- Internal-only tooling: CI/CD, build scripts, deploy pipelines, release-note automation, migrations
- PRs whose own release-note checkbox says "Internal only" or "Hidden in production"
- Pure investigations/POCs with no near-term user-visible outcome (use judgement — an AI feature POC can stay if it's genuinely close to shippable, a logging investigation should not)

## ⑤ Write the copy — twice, not translated

Write a full English version and a full Chinese version, each as an original for its audience, not a machine translation of the other. Rules:
- Marketing/product audience: **benefit language**, no engineering jargon, no assignee names, no PBI numbers in the visible copy.
- Prefer the PR's own release note text as the source when one exists — it's already written for a lay reader.
- One line per feature. Bug fixes compressed into the single "Also fixed" sentence per bucket (see ④) — omit the line entirely for a bucket with no fixes to report.
- Bias toward fewer, shorter items over completeness — a report someone actually reads beats an exhaustive one. Three buckets, not four; one sentence per item, not two.
- A one-sentence "headline" standfirst summarizing the cycle's overall theme is worth including.
- Note what's excluded in one line at the end, so the reader knows the list isn't exhaustive by accident.

## ⑥ Produce the artifact — same URL every time, per owner

Read `artifact-design` before writing the HTML (utilitarian/report treatment, not editorial — see that skill for the fundamentals: real typographic hierarchy, a considered palette, both light/dark themes, no giant hero).

**Always update the existing artifact rather than creating a new one each week — but find it by lookup, don't hardcode the URL in this file.** Artifact ownership is tied to whoever's Claude account publishes it, and this report's owner may change over time (months apart, not week to week) with no notice to this file. A hardcoded URL goes stale the moment that happens and nobody remembers to fix it; a lookup self-heals.

1. Call `Artifact` with `action: "list"` and look for an entry titled "Blotz Weekly Focus".
2. **Found one?** Pass its URL as `url` in the publish call — updates in place, same link as always for this owner.
3. **Not found?** This is either the very first run, or the account running the skill has never published this report before (i.e. ownership just changed hands). Publish without `url` — this creates a fresh artifact, which becomes *that account's* stable link from now on. Nothing to edit in this file either way.

Never omit the lookup and never omit `url` when a match was found — either mistake creates a duplicate artifact and breaks the one-stable-link promise this report exists to keep.

Design reference (established in the first run of this skill, keep consistent week to week unless the user asks to change it):
- **Bilingual toggle** (EN / 中文) top-right, JS-driven, remembers the choice via `localStorage`. Content authored twice as parallel `[data-lang="en"]` / `[data-lang="zh"]` spans, not live-translated.
- **Palette**: warm sage-paper ground, deep ink-green text, lime-green accent — matches Blotz's established brand (see `generate-whatsnew`'s "lime-green accent, deep ink-green text, rounded display type" note). Each of the three buckets gets its own semantic status color (distinct from the brand accent) as a left rail on its item cards.
- **Type**: Baloo 2 (rounded display, for headings/labels/eyebrows) + Karla (body) inlined as base64 `@font-face` data URIs — both are Latin-only subsets, so Chinese glyphs fall through automatically to the system CJK stack (`"PingFang SC", "Microsoft YaHei"`) with no separate font-switching logic needed. Don't try to embed a CJK webfont — the file size makes it impractical.
- **Layout**: single-column report card. No color-key legend — three plainly-labeled sections are self-explanatory without one. Each "Also fixed" line sits below its bucket's item cards, visually quieter (smaller, muted color, no card styling) so it reads as a footnote, not a fourth headline item.

## Notes

- This skill is entirely read-only against GitHub. It never edits the project board, comments on issues, or touches PRs.
- If the user wants the window to cover more than current+previous, ask first — the default is deliberately narrow per explicit feedback ("don't look back too much").
