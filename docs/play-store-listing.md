# Play Store listing

The Google Play listing for `com.blotz.blotztask` is kept in this repo. Nobody types it into Play Console: AI drafts it, a person approves the PR, and a workflow publishes it.

| What | Where |
|---|---|
| Title, short and full description, video link | `blotztask-mobile/store/android/metadata/<locale>/*.txt` (`en-US`, `en-AU`, `zh-CN`) |
| Screenshots, feature graphic | `blotztask-mobile/store/android/metadata/<locale>/images/` |
| Rule check (lengths, policy words) | `blotztask-mobile/store/android/check-listing.mjs` |
| Drafting the copy | the `update-play-listing` skill |
| Publishing | `.github/workflows/publish-play-listing.yml` (**Prod - Publish Play Store listing**) |

## Refresh the listing

Once per production release, after it is rolled out on Play:

1. In Claude Code, ask to "update the Play listing". The skill drafts both languages from the released code, checks them, and opens a PR.
2. Review the PR. Approval follows the PR's review level, like any other PR (`.claude/skills/pbi/review-levels.md`). Check that every feature named is in the released app and the tone fits.
3. Merge. The workflow pushes the text and images to Play. Google reviews listing changes, so the live page updates hours to days later.

Small fixes don't need the skill: edit the files and open a PR. Every PR that touches the listing runs the same check.

## Change screenshots or the feature graphic

Play requires images from the real app, so these come from a device and from design, never from AI.

- **Phone screenshots:** `images/phoneScreenshots/`, 4–8 per language, portrait, at least 1080 × 1920. They are uploaded in file name order, so name them `01.png`, `02.png`…
- **Feature graphic:** `images/featureGraphic.png`, exactly 1024 × 500, JPEG or PNG without transparency.

Add or replace the files in a PR. Only images whose content changed are uploaded again.

## Still done in Play Console

The API can't change these, so a Play Console admin does them by hand:

- Developer name
- Category and tags
- Contact email, website and privacy policy link
- "What's new" text, which stays with the release flow

## One-time setup

Needs a Play Console admin for steps 1–2 and a repo admin for step 3.

1. **Service account.** In Google Cloud, enable the *Google Play Android Developer API*, create a service account (no Cloud roles needed), and add a JSON key.
2. **Play permission.** Play Console → Users and permissions → Invite new users → the service account's email. Give it **only** the store presence permission for BlotzTask, not release rights. A leaked key then can't ship a build.
3. **GitHub secret.** Repo Settings → Secrets and variables → Actions → `PLAY_LISTING_SERVICE_ACCOUNT_JSON`, with the whole JSON file as the value.
4. **Baseline.** Pull the current listing once and commit it as-is, so later PRs show old → new:

   ```
   brew install fastlane
   fastlane supply init --package_name com.blotz.blotztask \
     --json_key <path to the JSON key> \
     --metadata_path blotztask-mobile/store/android/metadata
   ```

   Delete the `changelogs/` folders it creates ("What's new" is not managed here), run the check, open a PR. Then delete the local JSON key.

## When the workflow fails

| Log says | Do this |
|---|---|
| ❌ lines from the check | Fix those files in a new PR |
| Changes cannot be sent for review automatically | Play Console has other changes waiting. Send them for review or discard them under Publishing overview, then re-run the workflow from `main` |
| The caller does not have permission / 401 / 403 | The service account lost its Play permission, or the secret is wrong |

If Google rejects the listing, Play Console says why. Fix it in a new PR. If managed publishing is on in Play Console, approved changes wait there until someone clicks Publish.
