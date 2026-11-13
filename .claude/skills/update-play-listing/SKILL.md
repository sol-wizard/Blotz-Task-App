---
name: update-play-listing
description: Use when refreshing the Google Play store listing — after a production release is live, or when asked to "update the Play listing", "rewrite the store description" or "refresh the Play Store page". Drafts the en-US, en-AU and zh-CN copy from public sources and the tone guide below, checks it against Play's rules, and opens a PR; merging the PR publishes it.
---

# Update the Play Store listing

The Play listing lives in `blotztask-mobile/store/android/metadata/<locale>/`. Merging a change there to `main` runs `.github/workflows/publish-play-listing.yml`, which pushes it to Google Play. This skill writes the draft; a person approves it in the PR. The whole flow, and who approves, is in `docs/play-store-listing.md`.

Run it once per production release, **after** that release is live on Play.

## Hard rules

- **Only released features.** Name a feature only if it is in the code of the version users can install today. Merged to `main` is not enough.
- **Public sources only.** Do not read the private companion repo (`private-context`) for this. Everything here ends up in a public repo and on a public page. Voice and audience come from the tone guide below.
- **Text only.** Never create or edit images, and leave `images/`, `video.txt` and `changelogs/` alone. Play requires screenshots and video from the real app.

## Steps

### 1. Find the live version

```
git fetch origin --tags
gh release view -R sol-wizard/Blotz-Task-App --json name,tagName,publishedAt
```

A published release is only created once the version is live in both stores (`tag-release.yml`). Its `tagName`, e.g. `release/2026-10-17`, points at the exact commit that was built: that is the released code. Use it, not `submitted/<version>`: that tag is force-moved on every resubmission, and a local copy can be stale.

### 2. Read the current listing

Read `title.txt`, `short_description.txt` and `full_description.txt` for `en-US`, `en-AU` and `zh-CN`. Glance at the public page (`https://play.google.com/store/apps/details?id=com.blotz.blotztask&hl=en`, then `&hl=zh-CN`). If it differs from the files, someone edited it in Play Console. Stop and tell the dev, or the next merge overwrites their edit.

### 3. Find what's new since the last refresh

```
git log -1 --format='%h %cs' -- blotztask-mobile/store/android/metadata
gh release list -R sol-wizard/Blotz-Task-App --exclude-drafts --limit 10
```

Read each release published after that date. It lists the merged PRs. For a PR that sounds user-facing, read the **Release note** section of its description (`gh pr view <n> -R sol-wizard/Blotz-Task-App --json body -q .body`):

| Status ticked | Use it? |
|---|---|
| User-facing | ✅ |
| Beta, Hidden in production, Internal only | ❌ |
| No Release note section (older PRs) | Only if the title clearly describes something users see. Verify it in step 4 |

### 4. Verify every feature against the released code

List the features the copy will name (4–6 is plenty). Then check each one, **including every feature the current copy already names**, at the tag:

```
git ls-tree --name-only <release tag> blotztask-mobile/src/feature/
git grep -n -i "<word the user sees>" <release tag> -- blotztask-mobile/src/i18n/locales
```

Not found → drop it. Example: the listing live with 1.4.0 says "track your moods", but nothing in the `release/2026-10-17` code mentions moods, so that line goes. Keep a note of where you found each feature. It goes in the PR.

### 5. Write the copy

Write `en-US` first. Then `en-AU`: the same text with Australian spelling (organise, personalise, colour). Phones set to English (Australia) show it, and the team is in Australia. Then `zh-CN`: write the Chinese natively, same facts, not word for word.

| File | Limit | What goes in it |
|---|---|---|
| `title.txt` | 30 | Brand first: `BlotzTask`, plus at most a few plain words. Change it only for a reason, and give the reason in the PR |
| `short_description.txt` | 80 | One sentence: who it's for and the main thing it does. It shows in search results, so it matters most |
| `full_description.txt` | 4000 | Aim for 1,500–2,500. A 1–2 line opener → 4–6 feature lines (`Feature — what it does for you`) → who it's for → a short closing line. Plain text with line breaks: no HTML, no emoji |

### 6. Check it

```
node blotztask-mobile/store/android/check-listing.mjs
```

Fix every ❌. For each ⚠️, rewrite it or say in the PR why it's fine. Then go through what the script can't judge:

- [ ] Every feature named was verified in step 4
- [ ] No keyword stuffing: no keyword lists, no word repeated more than about three times, no other apps' names
- [ ] No testimonials, reviews or quotes, attributed or not
- [ ] No medical claims: never that Blotz treats, cures, diagnoses or improves ADHD. "Built for ADHD minds" is fine
- [ ] No promised results ("never forget a task again"), no prices or offers
- [ ] No ranking or price words anywhere: best, #1, free as in price. The script only blocks them in the title

### 7. Open the PR

Branch `chore/play-listing-<version>` from `origin/main`, then hand off to the `pr` skill. Release note `> none`, status **Internal only**: the app itself doesn't change. The description gives the reviewer what they need to approve:

- ⚠️ **Merging this publishes to the live Play page**, after Google's review
- Title and short description, old → new, for each language
- Full description: what was added, removed or reworded, and why
- Each feature named, and the file at the release tag where it was found
- Any ⚠️ warning kept, and why it's fine
- If the screenshots no longer match the app, say so and suggest caption text for design

## Tone guide

Built only from what's already public: the current store pages, the website and the app.

**Who we talk to:** people with too much in their head and not enough of it on a list. They find starting hard, get overwhelmed by long lists, and drop tools that nag. Many have ADHD, and the app is built with them in mind.

**How we sound:**
- 🫶 Warm and calm, like a friend who gets it. Talk to "you"
- ✂️ Short sentences, plain words, one idea per line
- 🪶 Light: "one step at a time", "just say it", "a gentle nudge". Never guilt or pressure
- 🎯 Concrete: say what the user does and what happens ("say it out loud, and it becomes a task"), not abstract promises ("boost your productivity")

**Avoid:**
- 🚫 Hype and superlatives: revolutionary, ultimate, game-changing
- 🚫 Labels for the user: lazy, procrastinator, "ADHD geniuses". Describe the situation, not the person
- 🚫 Fixing language: fix your brain, overcome ADHD, treat, cure, and in Chinese 治疗, 治愈, 改善症状
- 🚫 Calling the AI magic or always right. Say what it does

**中文：** 用"你"，短句，口语但不过度玩梗。说清楚用户做什么、得到什么，不要直译英文。
