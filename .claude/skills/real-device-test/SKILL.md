---
name: real-device-test
description: Use when the user wants something verified on a physical phone — "真机测试一下", "test this on my iPhone", "check it on a real device", "run it on my phone" — or wants the AI to drive the installed app on a USB-connected iPhone/Android and report what it saw.
---

# Real-device test

Drive the Blotz dev build on a **physical phone** with `agent-device`, then report evidence (screenshots, UI tree, logs), not opinions. Validated on iPhone 2026-09-10; Android uses the same tool but has not been run in this project yet — say so if you use it.

**Never** silently fall back to the simulator and call it a device pass. If the phone is unreachable, report the blocker.

## 0. Readiness gate — run it every time, in this order

Walk the checklist top to bottom. For each item: run the check; if it fails, apply the fix if the AI can, otherwise give the user the exact step and **wait** for them to say it's done. Do not start §4 until every row is ✅. Tell the user which rows passed and which are pending so they always know what is being waited on.

| # | Check (AI runs) | Passes when | If it fails |
|---|---|---|---|
| 1 | `agent-device --version` | prints a version | AI: `npm install -g agent-device@latest` (needs Node 22.12+; the project's Node 22 is fine) |
| 2 | `DevToolsSecurity -status` | "enabled" | **User**, in their own terminal: `sudo DevToolsSecurity -enable` (Mac password). agent-device's error for this says "Developer mode is disabled" — it means the **Mac**, not the phone |
| 3 | `xcrun devicectl list devices` | the phone is listed as `available` | **User**: plug the phone in with a **data** cable, unlock it, tap **Trust** on the phone. If it stays `unavailable`, AI runs `xcrun devicectl manage pair --device <CoreDevice id>` which pops the Trust prompt |
| 4 | `xcrun devicectl device info details --device <CoreDevice id>` → `developerModeStatus` | `enabled` | **User**: Settings → Privacy & Security → Developer Mode → on → phone restarts → confirm "Turn On". (The toggle only appears after step 3) |
| 5 | same command → note `udid` (`00008…`) and `osVersionNumber` | recorded for the report | — |
| 6 | `xcrun devicectl device info apps --device <CoreDevice id> \| grep -i com.Blotz.BlotzTask.dev` | the dev build is installed | see **§1 Getting the dev build onto this phone** — the only step that may need Ben |
| 7 | native change since that build? (`git log` / `git status` touching `modules/`, `app.config.js` plugins, a library with native code, `expo prebuild` output) | no | rebuild per §1; JS/TS/style changes never need this |
| 8 | Apple signing for the **agent-device runner**: `xcrun devicectl … details` shows the phone; then try `agent-device open …` in §4 | runner builds and installs | Ben's Mac: `export AGENT_DEVICE_IOS_TEAM_ID=Z6GFDAYSP9`. Anyone else: sign into Xcode (Xcode → Settings → Apple Accounts) with **any** Apple ID — a free Personal Team is enough for the runner — and export that team's id instead (find it under the account's "Developer Team" in that settings page). Free signing expires after 7 days; the runner just rebuilds |
| 9 | backend chosen (§2) and Metro serving the phone (§3) | `iOS Bundled …` line in the Metro log after launch | fix per §3 |
| 10 | phone is logged in (§4 snapshot shows the Today screen, not "Continue with Phone") | logged in as **blotztest1@gmail.com** | **User** logs in on the phone; never search for the password. If another account is signed in: Settings → Log out first (Auth0 remembers the last account) |

Android equivalents: `adb devices -l` (USB debugging on, "Allow this computer" tapped), package `com.blotz.blotztask`, `agent-device … --platform android --serial <serial>`. Rows 2, 4 and 8 do not apply.

## 1. Getting the dev build onto this phone

The dev build is bundle id `com.Blotz.BlotzTask.dev`. It coexists with the App Store app — never install over `com.Blotz.BlotzTask`.

Apple only lets a development build run on phones **registered under the Blotz Apple team (`Z6GFDAYSP9`)**, and that team is an Individual account, so **only Ben can register a phone and only Ben's Mac can sign the app**. That is the one place a teammate depends on Ben; it happens once per phone (about 10 minutes on Ben's side, and several phones can be batched).

**Teammates — EAS path.** Tell the user to ask Ben for the two things below; do not try to work around Apple signing.
1. Ben runs `eas device:create` → chooses **Website** → sends the registration link. The teammate opens it **on the phone** and taps through; the UDID registers itself, nobody types it.
2. Ben runs `eas build --profile development --platform ios` and shares the install link. The teammate installs from it. The profile in `eas.json` already sets the `.dev` bundle id and the staging backend.
Repeat step 2 only when native code changes (row 7). JS changes come from the teammate's own Metro (§3).

**Ben's Mac — local build** (Xcode signed into team Z6GFDAYSP9):
```bash
cd blotztask-mobile
BUNDLE_IDENTIFIER=com.Blotz.BlotzTask.dev npx expo prebuild --platform ios --clean
cd ios && xcodebuild -workspace BlotzTask.xcworkspace -scheme BlotzTask -configuration Debug \
  -destination 'id=<UDID>' -allowProvisioningUpdates -allowProvisioningDeviceRegistration build
xcrun devicectl device install app --device <CoreDevice id> \
  ~/Library/Developer/Xcode/DerivedData/BlotzTask-*/Build/Products/Debug-iphoneos/BlotzTask.app
```
`-destination 'id=<UDID>'` matters: a `generic/platform=iOS` build does not register the phone in the profile and the install fails. `prebuild --clean` regenerates the gitignored `ios/` — warn any parallel session, and always pass `BUNDLE_IDENTIFIER` or the simulator build's bundle id changes too.

## 2. Choose the backend — one question, with a recommendation

`localhost` in `blotztask-mobile/.env` is the **phone itself**, so the phone can never reach the API through it. Two working options:

| Backend | When | Metro env |
|---|---|---|
| **staging** — recommend for teammates and UI-only changes | nothing needed locally | `EXPO_PUBLIC_URL=https://app-blotz-task-api-stag.azurewebsites.net/ EXPO_PUBLIC_URL_WITH_API=https://app-blotz-task-api-stag.azurewebsites.net/api` |
| **local** — cross-stack changes | API started with `--urls http://0.0.0.0:5027`, SQL container up | `EXPO_PUBLIC_URL=http://<Mac LAN IP>:5027 EXPO_PUBLIC_URL_WITH_API=http://<Mac LAN IP>:5027/api` |

Detect: `lsof -nP -iTCP:5027 -sTCP:LISTEN` → if something is listening, offer local, otherwise recommend staging. The dev build allows plain HTTP to the LAN (`NSAllowsLocalNetworking`), so no ATS change is needed. Mac LAN IP: `ipconfig getifaddr en0`; phone and Mac must be on the same Wi-Fi.

**Local backend + login:** users are registered by an Auth0 post-login webhook that only reaches hosted backends. The account the phone signs in with must already exist in the local `AppUsers` table, or every request 401s with "User is not registered in this app" and the app logs itself out. The seeded test account **blotztest1@gmail.com** exists locally and on staging — use it. A missing `PomodoroSettings` row shows as a 404 toast — insert one, don't debug the app.

## 3. Metro and launch

Port **8082** so it never collides with a simulator session on 8081. No `CI=1` (it disables Fast Refresh).

```bash
cd blotztask-mobile
<backend env from §2> nohup npx expo start --dev-client --port 8082 --non-interactive < /dev/null > /tmp/metro-8082.log 2>&1 &
xcrun devicectl device process launch --device <CoreDevice id> --terminate-existing \
  --payload-url "blotztask://expo-development-client/?url=http%3A%2F%2F<Mac LAN IP>%3A8082" com.Blotz.BlotzTask.dev
grep "iOS Bundled" /tmp/metro-8082.log     # proves the phone pulled the bundle from *this* Metro
```

The dev client tries whatever is on 8081 first before honouring the URL; a stale bundle looks like `AxiosError: Network Error` on a Loading screen. Relaunch with the command above. Re-run the launch command whenever you need a cold start (persistence checks).

## 4. Drive the phone

```bash
export AGENT_DEVICE_IOS_TEAM_ID=<team id from row 8>   # first run builds the XCTest runner (~1 min)
agent-device open com.Blotz.BlotzTask.dev --platform ios --udid <UDID>   # always pass --udid: the tool prefers simulators
agent-device snapshot -i                          # UI tree with @eN refs — read this before every action
agent-device press @e12 | press <x> <y>           # tap by ref or by points
agent-device fill @e13 "text"                     # replaces the field's text; press the keyboard "done" ref after
agent-device screenshot ./artifacts/<step>.png
agent-device logs start … logs stop … logs path   # device log for the window you care about
agent-device close
```

Runner build fails with `Build input file cannot be found: …mobileprovision` → `rm -rf ~/.agent-device/apple-runner/derived/ios-device` and retry.

## 5. Report format

For each scenario: device (name, iOS version), build (bundle id, backend used, Metro "Bundled" line), then steps as **pass / fail / not verified**, each with the screenshot path and the log lines that justify it. A tap that "succeeded" is not a pass — the pass is the observable result (count changed, row in DB, still there after a cold start). Say explicitly what could not be exercised on hardware (camera, biometrics, background time, TestFlight-only behaviour).

## Known gotchas — environment, not product bugs

| Symptom | Cause / fix |
|---|---|
| Tapping the top-right "Skip" does nothing | the dev-client floating gear button sits over it; use "Continue" or other elements |
| The "+" add-task tab is not in the UI tree | it has no accessibility label; screenshot and tap by points (centre of the 4th tab icon) |
| Create Task form: title field has no label | it is the first editable `text-field`; the bottom "Create Task" node is the save button |
| 401 "User is not registered in this app" | local DB lacks the account — see §2 |
| 404 "Pomodoro setting … not found" | local DB lacks the row for that user — insert, don't debug |
| `AxiosError: Network Error` on Loading | bundle came from the wrong Metro (8081) → relaunch per §3 |
| Runner error "Developer mode is disabled" | Mac `DevToolsSecurity` (row 2), not the phone |
| `expo-notifications` push-token WARN in Metro | dev builds have no push entitlement; ignore |
| Chinese/emoji input on Android | agent-device uses a test IME (`--test-ime`); verify keyboard UX manually, never change product validation to suit the tool |
