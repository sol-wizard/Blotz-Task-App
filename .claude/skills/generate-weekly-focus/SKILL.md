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

## ④ Pull the "Next Release" draft — this replaces chasing PR/release status by hand

**Don't build a "Released" section.** By the time this report goes out, whatever's actually live is old news to marketing — they don't need a recap of something already public. What they need is what's *done but not yet public*. The repo auto-generates exactly that:

```
gh api repos/sol-wizard/Blotz-Task-App/releases --jq '.[] | select(.draft==true) | {name, tag_name, id}'
gh api repos/sol-wizard/Blotz-Task-App/releases/<id> --jq '{body, updated_at}'
```

There's a standing draft release named "Next release (unreleased)" that a bot keeps updated on every merge to `main`, already split into New Features / Bug fixes, already bilingual, already filtered through each PR's own release-note checkbox. Use its content directly for the folded **Next Release** section (below) instead of re-deriving anything from `gh pr list`/`gh pr view`.

**Sanity-check it before trusting it blindly — this step is not optional, and skipping it under- or over-reports every time it's been tried.** The bot's update lags — its `updated_at` is routinely older than PRs you know have merged since. Do this explicitly, every run:

1. Find the last *published* (non-draft) release's date: `gh release list --repo sol-wizard/Blotz-Task-App --limit 1`.
2. List every PR merged after that date: `gh pr list --repo sol-wizard/Blotz-Task-App --state merged --limit 30 --json number,title,mergedAt` and filter to `mergedAt` after it.
3. For each one not already in the draft's body, pull its release note (`gh pr view <n> --json body`) and check the box — `[x] User-facing` gets added to the fold by hand; anything else stays out.
4. **The reverse check matters just as much: don't add anything to the fold on the strength of a PBI's board status alone (e.g. "Done" for the current iteration).** A PBI can be marked Done on the board while its actual code merged weeks or months ago — long before the last real release, meaning it's already live, not upcoming. This exact mistake happened once: a "feature usage now tracked app-wide" PBI showed Done in the current iteration, but every PR that built it had merged in July, before the last release — it didn't belong in Next Release and was wrongly included. Only ever add an item to the fold because you found its *specific merge date* is after the last release's date (step 1) — never because a board column says so.
5. Cross-checking once at the start of the run and never again is how real merges get missed mid-write — this happened too (two genuinely-merged, user-facing PRs were dropped from a run because the check was done loosely instead of by enumerating every merge date against the cutoff). Do steps 1–3 as an explicit enumeration, not a vibe check.

## ⑤ Sort everything else into real status buckets, tagged by topic

Everything **not yet merged** — in review, in progress, backlog ready — goes into three buckets named after the literal engineering status, not marketing-spin timing language:

| Bucket | Rule |
|---|---|
| **In Review** | Open PR awaiting review (PR reality wins over stale board status — if a PBI shows "In Progress" on the board but has an open PR, it's In Review) |
| **In Progress** | Board In Progress, no PR yet |
| **Backlog Ready** | Board Backlog Ready |

This was a deliberate correction after two earlier wording attempts both misfired: "Landing soon" read as release-imminent when it only meant code-complete, and a later topic-only redesign lost the status signal marketing also wanted. The fix marketing landed on: keep honest status labels (In Review literally means "being reviewed, not merged" — no ambiguity), and layer topic on top as a **per-item tag**, not a section restructure.

1. **Give every item a short topic tag** (a `.tag` chip, e.g. `AI`, `UI`, `Login`, `Website`, `Calendar`, `Performance`, `Badges`, `Platform` as a catch-all) — derive tags fresh from the actual work each run, don't reuse a fixed list from a previous week.
2. **Feature or user-visible improvement** → its own line, tagged, inside the bucket matching its real status.
3. **Bug fix / reliability fix / routine content sync** → folded into a single **"Also fixed"** line at the bottom of the bucket it landed in — one compact sentence per fix, joined together, visually muted, no tag needed. Omit the line entirely where there's nothing to report.

**Wording guard:** no time/imminence language anywhere in these three buckets — no "soon," "landing," "coming up," "almost ready," "on the way." The bucket label itself (In Review / In Progress / Backlog Ready) already says exactly how far along something is; anything more would just be re-adding the ambiguity marketing flagged. Describe items by what they *do*, present tense, like a capability, not a promise ("Create several recurring tasks in one AI conversation..." not "You'll soon be able to...").

**Exclude entirely:**
- New-hire onboarding/learning tickets (any title like "`<name>` - Onboarding/Learning/Repo Onboarding")
- Internal-only tooling: CI/CD, build scripts, deploy pipelines, release-note automation, migrations
- PRs whose own release-note checkbox says "Internal only" or "Hidden in production"
- Pure investigations/POCs with no near-term user-visible outcome (use judgement — an AI feature POC can stay if it's genuinely close to shippable, a logging investigation should not)

**Don't over-apply the "internal tooling" exclusion to PostHog/analytics work.** This report's audience *is* product/marketing, and PostHog is their own instrument for seeing user behavior — so PostHog instrumentation, funnels, and event tracking are directly relevant to them even though no end-user ever sees a UI change. This was missed once already (two PostHog PBIs — a login/first-run funnel and an 8-step drop-off funnel — got silently dropped as "not user-visible," which is the wrong lens; they're not user-visible, but they're *product-team-visible*, which is what counts here). "Internal tooling" means CI/CD, build/deploy scripts, migrations — engineering's own plumbing that no one outside engineering benefits from. Analytics that product/marketing directly consumes is not that, even when the PR touches no visible UI. Give it a `PostHog` or `Analytics` tag and phrase it in terms of what insight it gives the team ("New tracking will show exactly where users drop off..." not "Add analytics instrumentation to...").

## ⑥ Write the copy — twice, not translated

Write a full English version and a full Chinese version, each as an original for its audience, not a machine translation of the other. Rules:
- Marketing/product audience: **benefit language**, no engineering jargon, no assignee names, no PBI numbers in the visible copy.
- For the Next Release fold, prefer the draft release's own text (step ④) verbatim; for the three status buckets, prefer a PR's own release note text as the source when one exists — it's already written for a lay reader.
- One line per feature. Bug fixes compressed into the single "Also fixed" sentence per bucket (see ⑤) — omit the line entirely where there's nothing to report.
- Bias toward fewer, shorter items over completeness — a report someone actually reads beats an exhaustive one. One sentence per item, not two.
- A one-sentence "headline" standfirst summarizing the cycle's overall theme is worth including — it can reference what's in the Next Release fold.
- Note what's excluded in one line at the end, so the reader knows the list isn't exhaustive by accident.

## ⑦ Produce the artifact — same URL every time, per owner

Read `artifact-design` before writing the HTML (utilitarian/report treatment, not editorial — see that skill for the fundamentals: real typographic hierarchy, a considered palette, both light/dark themes, no giant hero).

**Always update the existing artifact rather than creating a new one each week — but find it by lookup, don't hardcode the URL in this file.** Artifact ownership is tied to whoever's Claude account publishes it, and this report's owner may change over time (months apart, not week to week) with no notice to this file. A hardcoded URL goes stale the moment that happens and nobody remembers to fix it; a lookup self-heals.

1. Call `Artifact` with `action: "list"` and look for an entry titled "Blotz Weekly Focus".
2. **Found one?** `WebFetch` that URL and treat its actual rendered HTML as the structural template — copy its exact CSS class names, section structure, and the `<details class="fold">` markup, not just this file's prose description of them. Then pass its URL as `url` in the publish call — updates in place, same link as always for this owner.
3. **Not found?** This is either the very first run, or the account running the skill has never published this report before (i.e. ownership just changed hands). Publish without `url` — this creates a fresh artifact, which becomes *that account's* stable link from now on. Nothing to edit in this file either way.

Never omit the lookup and never omit `url` when a match was found — either mistake creates a duplicate artifact and breaks the one-stable-link promise this report exists to keep. This isn't hypothetical: a run once free-styled a whole different report from this file's prose alone — different title ("What the team is building" instead of "Iteration N"), different structure (flat "New Features"/"Bug fixes" headers instead of the fold + tagged status buckets), no bilingual split at all — landing on something close to an *even earlier, already-abandoned* version of this design. Prose is a lossy description of a page; the live HTML is ground truth. If the lookup in step 1 returns nothing when you're fairly sure a report should already exist, don't silently proceed to "not found" — that's a signal to double check the search (title match, account) before concluding it's actually a first run.

Design reference (established in the first run of this skill, revised twice since — once for a topic-section redesign that got reverted, once to land on the current fold + status-bucket + tag structure; keep consistent week to week unless the user asks to change it):
- **Bilingual toggle** (EN / 中文) top-right, JS-driven, remembers the choice via `localStorage`. Content authored twice as parallel `[data-lang="en"]` / `[data-lang="zh"]` spans, not live-translated.
- **Masthead shows the single current iteration only — never a range.** H1 is `Iteration <N>` (current iteration from step ②, not "current–previous"), and the dates line is that same iteration's own start–end dates, not a span covering both iterations in the lookback window. The current+previous window from step ② is for *deciding which board items to include* — it has no business appearing in the masthead. This broke once already (a fresh run rendered "Iteration 111–112 · Aug 24 – Sep 6," conflating the data window with the display).
- **Palette**: warm sage-paper ground, deep ink-green text, lime-green accent — matches Blotz's established brand (see `generate-whatsnew`'s "lime-green accent, deep ink-green text, rounded display type" note).
- **Four status colors, each with one honest meaning, no more:** `--merged` (green) = Next Release fold, i.e. actually merged code; `--review` (amber) = In Review; `--progress` (blue) = In Progress; `--queued` (grey-green) = Backlog Ready. Each bucket's `.group--*` class drives its `group-title` color and its `ul.items li::before` left rail. The per-item topic tag (`.tag`) reuses its bucket's color as a soft "-wash" background chip — tags are colored by which bucket they're in, not by topic, so color still only ever encodes real status.
- **Next Release fold**: a native `<details class="fold"><summary>...</summary><div class="fold-body">...</div></details>`, collapsed by default (no `open` attribute) so it doesn't compete with the three status buckets for attention — it's supplementary context ("here's the fine print of what's about to go out"), not the headline. Styled as a bordered card with a rotating chevron icon; uses the same green (`--merged`) treatment as a signal this is the one section backed by actually-merged code.
- **Type**: Baloo 2 (rounded display, for headings/labels/eyebrows) + Karla (body) inlined as base64 `@font-face` data URIs — both are Latin-only subsets, so Chinese glyphs fall through automatically to the system CJK stack (`"PingFang SC", "Microsoft YaHei"`) with no separate font-switching logic needed. Don't try to embed a CJK webfont — the file size makes it impractical. Fetch as a variable-weight range (e.g. `family=Baloo+2:wght@500..800`) with a modern Chrome UA string — Google Fonts then serves one variable woff2 per family instead of one static file per weight, keeping the embedded payload small.
- **Layout**: single-column report card. No color-key legend — plainly-labeled section titles are self-explanatory without one. Each "Also fixed" line sits below its bucket's item cards, visually quieter (smaller, muted color, no card styling, no tag) so it reads as a footnote, not a headline item.

**Both languages rendering at once has broken this report twice now — on two different mechanisms. Both are checked here so neither recurs.**

*Mechanism A — CSS specificity.* The toggle hides `[data-lang="zh"]` by default and flips visibility based on `html[lang]`. That base rule has low specificity (one attribute selector), so if a language-tagged element *also* carries its own class with a display rule (e.g. a hypothetical `.standfirst[data-lang] { display: block }`), the compound selector can outrank the hide rule and both languages render at once. Fix: never put a display rule on the same element that carries `data-lang`; if a block element needs its own display rule, put it on a wrapper instead.

*Mechanism B — the element wasn't split at all.* The second time this broke, a fresh run wrote the standfirst as **one paragraph containing both languages concatenated** (English sentence, then a line break, then the Chinese sentence, all inside a single element with no `data-lang` split) rather than two sibling elements. No CSS rule can hide half of one element's text content — the split has to exist at the markup level. Every piece of bilingual copy, with no exceptions, must be written as **two separate sibling elements**, each wrapping only its own language, like this — copy this exact shape for every text block in the report:

```html
<p class="standfirst" data-lang="en">English sentence here.</p>
<p class="standfirst" data-lang="zh">中文句子在这里。</p>
```

Never `<p class="standfirst">English text.<br>中文文本。</p>` — that has no `data-lang` at all and both languages always show, in both toggle states.

**Before publishing, verify: load the HTML in your head with `html[lang="en"]` — every single `data-lang="zh"` span should be provably hidden by a CSS rule that targets it (or a same-level `data-lang="en"` sibling exists for every `data-lang="zh"` element, and vice versa). If you find any prose that isn't wrapped in a `data-lang` span at all, that prose will show in both languages — fix it before publishing, not after.**

## Notes

- This skill is entirely read-only against GitHub. It never edits the project board, comments on issues, or touches PRs.
- If the user wants the window to cover more than current+previous, ask first — the default is deliberately narrow per explicit feedback ("don't look back too much").
