---
name: generate-whatsnew
description: Use when creating the monthly "What's New" / update-onboarding page for an upcoming Blotz release — read the unreleased release draft, pick the features worth showing users, take real screenshots, write the copy, produce a swipeable preview artifact with a "what's covered" review checklist, and after approval put the content into the app.
---

# Generate the What's New update-onboarding

When a user updates and opens the app for the first time, a few swipeable cards introduce what's new in this version. The goal is **that new features get seen and used** — which matters most for ADHD users, who are exactly the ones who skip past a silent update.

> 🚧 **This is a first draft — the flow has never been run end to end.** The expensive, most likely to break step is ③ (building for screenshots). Whoever runs it first: **record what breaks directly in this file as you go.**

## Who does what (important)

- **🤖 Claude (monthly)** — read the draft, pick features, build + screenshot, produce the preview artifact, revise until approved, then put the content into the app. **This skill is the working manual for Claude's half.**
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
| Small or hard to capture (gestures, scrolling behaviour) | **Text only** | A still can't show motion; use a GIF if it really needs one, never a misleading still |
| Backend / developer-facing (telemetry, refactors, version bumps, internal timezone logic) | **Leave out** | Nobody reads a card about these |

**Write down what you picked, what you skipped, and why** — step ④'s review checklist needs it.

### ③ Produce the assets (only for features that need an image)

Screenshots must be **real** — never sourced from the web, never mocked up. And they must come from a **build that contains these unreleased features**: an older build doesn't have them.

⚠️ **This step is expensive** — a build takes 20+ minutes. So: **settle ② first and capture everything in one pass**, rather than building, thinking, and rebuilding. If no card needs an image this month, skip ③ entirely.

#### 1. Pull latest main

```
git -C development/Blotz-Task-App fetch origin --quiet
git -C development/Blotz-Task-App pull --ff-only origin main
git -C development/Blotz-Task-App log --oneline -1        # record which commit the screenshots came from
```

Ben's local `main` is a **read-only mirror of origin** — he never writes code on it — so **pull automatically, don't ask** (his rule, 2026-07-19). `--ff-only` is the safety catch: it refuses rather than merging. **If the pull fails (not a fast-forward, or it would clobber local changes) — stop and tell Ben.** Don't "fix" it with `git stash`, `git reset`, `git checkout --`, or a merge; those destroy work.

#### 2. Build for the simulator

Run from `development/Blotz-Task-App/blotztask-mobile`, **with `--local` by default**:

```
npx --yes eas-cli@latest build --profile preview-simulator --platform ios --local --non-interactive
```

**Why `--local` is required (Ben's decision, 2026-07-19):** without it this runs on EAS's servers and **consumes the account's build quota**. They already spend ~20 builds a month on releases; screenshots have no business taking another one. `--local` compiles on Ben's Mac — no EAS servers, no billing — at the cost of tying up the machine for 15–30 minutes.

> ⚠️ `--local` **has never actually been run successfully** (only cloud builds had been run when this rule was set). First person to run it: if it fails (missing Xcode components, CocoaPods, fastlane, …), **record the error here first**, then decide whether to fix the local toolchain or fall back to a cloud build for this run. **Falling back to a cloud build needs Ben's OK first** — it spends his money.

- **`eas` is not installed and is not a local dependency** — both `eas` and `npx eas` fail (`command not found` / `could not determine executable to run`). Always `npx --yes eas-cli@latest`. The `--yes` matters: without it npx prompts for confirmation and an unattended run hangs there.
- **There is no `--simulator` flag** (removed in eas-cli 21). The simulator setting lives in the `preview-simulator` profile in `eas.json`. Confirm a build is right with `isForIosSimulator: true` in `eas build:list --json`.
- Use `preview-simulator`, not `npx expo run:ios` — the latter is a debug build, not what users actually install.
- Run it **in the background** and write copy meanwhile. Before starting, check `build:list`: if the newest simulator build is already at the current main commit, reuse it instead of building again.
- With `--local` the artifact lands in the current directory; only cloud builds need the `.tar.gz` downloaded.

Install: extract the `.tar.gz` → `xcrun simctl install booted BlotzTask.app` → `xcrun simctl launch booted com.Blotz.BlotzTask.staging`.

#### 3. Drive the app for screenshots (Maestro 2.6.1)

**Confirm the account first**: Settings → Account must show the email `blotztest1@gmail.com`. Go by the email, not the display name — the display name is just profile data and can be changed at any time, so it proves nothing. The simulator's Safari cookie jar keeps the Auth0 session across reinstalls, so login is often skipped silently — never assume who you're signed in as.

Things already learned the hard way:

- **Targeting by text mostly fails** — most elements have no accessibility label, so `tapOn: "Account"` and similar miss. Use percentage coordinates, `point: "X%,Y%"`.
- **Percentages must be integers** — `92.5%` throws `NumberFormatException`.
- **The keyboard shifts the layout** — a coordinate tap aimed at a bottom control can land on the keyboard instead. Dismiss it first.
- **Wait for animations** — use `extendedWaitUntil`. A screenshot or tap right after navigation usually failed on timing, not on a real defect.
- **System dialogs are invisible to Maestro** (e.g. the notifications prompt) — tap them by coordinate.
- **Screenshots failing with "Macintosh HD is read only"** → `killall -9 com.apple.CoreSimulator.CoreSimulatorService`, then reboot the simulator. Always write screenshots under `/private/tmp`, never `$HOME`.
- **Don't add a missing `testID` yourself.** (A `testID` is a hidden name tag on an element so a tap can't land in the wrong place — one line of code per element, and a developer has to add it.) Note it and tell Ben; changing product code is his call. When raising it with him, **explain it from scratch every time** — he doesn't work in test automation, so the bare term means nothing to him.

Put captures in `/private/tmp/blotz-onboarding-shots/` and scale to ~480px wide before use (`sips --resampleWidth 480`).

### ④ Produce the preview artifact (with a review checklist)

Build a phone-shaped, swipeable What's New page, with a **"what's covered" checklist** at the top or bottom: on one side the features included (tagged image / text / placeholder), on the other the ones skipped, each with a one-line reason. A reviewer can scan the checklist in seconds.

- Reuse the existing prototype and generator script (in Ben's scratchpad: `blotz-whatsnew.html` / `gen_whatsnew.py`) — embed screenshots as base64, since artifacts can't load external images, and support both light and dark.
- Take the visual language from the app itself: lime-green accent, deep ink-green text, rounded display type (`ui-rounded`), mascot gradients.
- Run through the `artifact-design` skill before publishing.

### ⑤ Review · revise until approved

Give the artifact to the reviewer (the developer / Ben). Revise whatever they don't like — the copy, which features made the cut, whether a screenshot is the right one. **Keep revising until they say OK**; never wave it through yourself.

### ⑥ Put it into the app

Once approved, **Claude edits the code but does not open the PR** (Ben's decision, 2026-07-19).

1. Create a branch and fill the copy and images into the content slot the developer left.
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
