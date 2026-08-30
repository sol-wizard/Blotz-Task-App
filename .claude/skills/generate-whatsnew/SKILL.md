---
name: generate-whatsnew
description: Use when creating the monthly "What's New" / update-onboarding page for an upcoming Blotz release — read the unreleased release draft, pick the features worth showing users, take real screenshots, write the copy, produce a swipeable preview artifact with a "what's covered" review checklist, and after approval put the content into the app.
---

# Generate the What's New update-onboarding

When a user updates and opens the app for the first time, a few swipeable cards introduce what's new in this version. The goal is **that new features get seen and used** — which matters most for ADHD users, who are exactly the ones who skip past a silent update.

> 🚧 **This is a first draft — the flow has never been run end to end.** The expensive, most likely to break step is ③ (building for screenshots). Whoever runs it first: **record what breaks directly in this file as you go.**

## Who does what (important)

- **🤖 Claude (monthly)** — read the draft, pick features, write a screenshot brief, produce the preview artifact once screenshots are received, revise until approved, then put the content into the app. **This skill is the working manual for Claude's half.**
- **🛠 The developer (once only)** — build an onboarding-style What's New page in the app (swipeable cards, shown once after an update) and leave a **clean, centralised place for the content** (e.g. an array of cards: title / body / image / language) for Claude to fill each month. After that, they only **review and approve**.
- Full background and division of labour are in the handover plan document.

## The monthly flow

### ① Read the source — the unreleased release draft

Content comes from the **`Next release (unreleased)` draft** in GitHub Releases (`sol-wizard/Blotz-Task-App`). It is compiled automatically from merged PRs and already split into New features / Bug fixes / Beta — don't go through PRs by hand.

```
gh api repos/sol-wizard/Blotz-Task-App/releases --jq '.[] | select(.draft==true) | .body'
```

The GitHub account must be `sol-wizard` (check with `gh api user -q .login`). The other account, `Ben0189`, lacks the `project` scope and can't even resolve the private repo — the error looks like the repo is gone rather than like an auth problem. **Wrong account, or any gh auth problem: stop and tell Ben, stating which account is currently active. Never run `gh auth switch` yourself** — it changes his global gh state.

### ② Pick features + decide image or text

Only pick what **users would notice and care about**. Decision table:

| Kind of change | Treatment | Why |
|---|---|---|
| Has its own screen, screenshots well (e.g. Badge details page) | **With image** | One real screenshot says it fastest |
| Small or hard to capture (gestures, scrolling behaviour) | **Avatar card** | A still can't show motion. Pick a random avatar SVG from `blotztask-mobile/assets/avatars/` (avatar1–avatar12). No emoji, no illustrations. Each card in a release should use a different avatar. |
| Backend / developer-facing (telemetry, refactors, version bumps, internal timezone logic) | **Leave out** | Nobody reads a card about these |

**Write down what you picked, what you skipped, and why** — step ④'s review checklist needs it.

### ③ Produce the assets (only for features that need an image)

Screenshots must be **real** — never sourced from the web, never mocked up. If no card needs an image this month, skip ③ entirely.

#### 1. Produce the screenshot brief

After settling ②, write a clear brief listing every screenshot needed. Each screenshot card needs **two** screenshots — one with the app in Chinese, one with the app in English (switch language in Settings) — never the same image reused for both. For each card, state:

- **Screen / state**: exactly where in the app to navigate (e.g. "Badges tab → tap any badge → Badge Detail sheet")
- **What to show**: what should be visible in the frame (e.g. "the badge image, name, description, and progress bar — ideally with the badge already unlocked")
- **Filenames**: the target filenames in `blotztask-mobile/assets/images-png/whatsnew/`, one per language, e.g. `whatsnew-badge-detail-zh.png` and `whatsnew-badge-detail-en.png`

Present this list to the developer and ask them to take both language versions of each screenshot and send them back in the conversation. Screenshots come from a real device or simulator running a build that already has the unreleased features — the developer chooses which.

#### 2. Receive and save the screenshots

The developer sends the screenshots directly in the conversation. When they arrive:

1. **Delete all existing files** in `blotztask-mobile/assets/images-png/whatsnew/` — each release replaces the previous one entirely. Old screenshots are dead weight: users have already seen that What's New screen and will never see it again, and each build is self-contained so older installs are unaffected.
2. Note which `-zh` / `-en` filename each image maps to from the brief.
3. Save each one to `blotztask-mobile/assets/images-png/whatsnew/<filename>.png` — this is the final location the app code will reference, so no second move is needed.
4. If an image is very wide (original device resolution), scale it to ~480 px wide: `sips --resampleWidth 480 <file>`.

**Confirm the account shown**: if any screenshot shows account-identifying UI (Settings → Account), verify the email is `blotztest1@gmail.com`, not a personal account. If it isn't, flag it and ask for a retake.

### ④ Produce the preview artifact (with a review checklist)

Build a phone-shaped, swipeable What's New page, with a **"what's covered" checklist** at the top or bottom: on one side the features included (tagged image / text / placeholder), on the other the ones skipped, each with a one-line reason. A reviewer can scan the checklist in seconds.

- Generate the HTML fresh each release — embed screenshots as base64 (artifacts can't load external files). Save the output to `.claude/skills/generate-whatsnew/blotz-whatsnew.html` for the review session. **Never commit this file** — it is gitignored (`.claude/skills/generate-whatsnew/blotz-whatsnew.html` is listed in `.gitignore`) to prevent it from ever reaching the remote repo.
- Take the visual language from the app itself: lime-green accent, deep ink-green text, rounded display type (`ui-rounded`), mascot gradients.
- Run through the `artifact-design` skill before publishing.

### ⑤ Review · revise until approved

Give the artifact to the reviewer (the developer / Ben). Revise whatever they don't like — the copy, which features made the cut, whether a screenshot is the right one. **Keep revising until they say OK**; never wave it through yourself.

### ⑥ Put it into the app

Once approved, **Claude edits the code but does not open the PR** (Ben's decision, 2026-07-19).

1. Create a branch and fill the copy into the content slot the developer left. For each screenshot card in `cards.ts`, set both `imageZh` and `imageEn` to the matching `-zh` / `-en` file from ③.
2. Hand it over: tell them the branch name and which files changed.
3. **The developer opens the app locally, swipes through the onboarding, confirms it renders correctly — and opens the PR themselves.**

Claude doesn't open the PR, doesn't merge, and doesn't decide "it works". Reason: this page is the first thing every user sees after updating, and Claude hasn't seen it running. That local look is the only gate in this flow — don't skip it.

## Content rules

- **English and Chinese for every card** — one version each, following the user's language (the app already supports both). Both versions are written as originals, not one translated in a hurry from the other.
- Write from the user's point of view: short, concrete, clear about what this new feature lets them do.
- Card format: one feature per card, image or text + title + one line of explanation; page dots at the bottom with next / skip.

## Notes

- The screenshots and copy in the prototype are throwaway illustrations — **never ship them**.
- **Not doing** for now: an automated pipeline, remote config / CMS, A/B testing. All deferred.
- Only include **unreleased** features; users have already seen anything that shipped.
