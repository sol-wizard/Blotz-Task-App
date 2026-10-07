---
name: real-device-test
description: Use when the user wants something verified on a physical phone — "真机测试一下", "test this on my iPhone", "check it on a real device", "run it on my phone" — or wants the AI to drive the installed app on a USB-connected iPhone/Android and report what it saw. Also use it when a teammate needs the dev build on their own iPhone for the first time, or the tech lead is asked to register a teammate's phone or make them a development build.
---

# Real-device test

Drive the Blotz dev build on a **physical phone**, then report evidence (screenshots, UI tree, logs), not opinions. iPhone: `agent-device`, validated 2026-09-10. Android: adb, validated 2026-10-07 — it has its own gate, build and commands in **§6**.

**Never** silently fall back to the simulator and call it a device pass. If the phone is unreachable, report the blocker.

## 0. Readiness gate — run it every time, in this order

Walk the checklist top to bottom. For each item: run the check; if it fails, apply the fix if the AI can, otherwise give the user the exact step and **wait** for them to say it's done. Do not start §4 until every row is ✅. Tell the user which rows passed and which are pending so they always know what is being waited on.

**Before row 1, ask one question:** "Has this phone ever had the Blotz **dev** build installed? The staging/TestFlight app does not count." If the answer is no or not sure, go to §1 and hand over the message for the tech lead **now**, then carry on with rows 1–6 while waiting. The tech lead is the slow step (a day, the first time), and everything else in the gate can be done in the meantime. A "yes" is not proof it is still there: apps get deleted. Row 7 checks what is installed **now**; if it fails on a phone that had the build before, the phone is already registered, so only the install step of §1 is needed.

| # | Check (AI runs) | Passes when | If it fails |
|---|---|---|---|
| 1 | `agent-device --version` | prints a version | AI: `npm install -g agent-device@latest` (needs Node 22.12+; the project's Node 22 is fine) |
| 2 | `DevToolsSecurity -status` | "enabled" | **User**, in their own terminal: `sudo DevToolsSecurity -enable` (Mac password). agent-device's error for this says "Developer mode is disabled" — it means the **Mac**, not the phone |
| 3 | `xcrun devicectl list devices` | the phone is listed as `available` | **User**: plug the phone in with a **data** cable, unlock it, tap **Trust** on the phone. If it stays `unavailable`, AI runs `xcrun devicectl manage pair --device <CoreDevice id>` which pops the Trust prompt |
| 4 | `xcrun devicectl device info details --device <CoreDevice id>` → `developerModeStatus` | `enabled` | **User**: Settings → Privacy & Security → Developer Mode → on → phone restarts → confirm "Turn On". (The toggle only appears after step 3) |
| 5 | same command → note `udid` (`00008…`) and `osVersionNumber` | recorded for the report | — |
| 6 | JS deps match the lockfile: `npm ls expo-iap` (or whichever package landed most recently) resolves in `blotztask-mobile/` | no `(empty)` or "not found" | AI: `npm install` in `blotztask-mobile/`. A `node_modules` left behind by a branch switch or `git pull` shows up as a Metro `PluginError: Failed to resolve plugin for module "<pkg>"`, which does not look like a missing dependency |
| 7 | `xcrun devicectl device info apps --device <CoreDevice id> \| grep -i com.Blotz.BlotzTask.dev` | the dev build is installed | see **§1 Getting the dev build onto this phone** — the only step that may need the tech lead |
| 8 | native change since that build? (`git log` / `git status` touching `modules/`, `app.config.js` plugins, a library with native code, `expo prebuild` output) | no | rebuild per §1; JS/TS/style changes never need this |
| 9 | Apple signing for the **agent-device runner**: `xcrun devicectl … details` shows the phone; then try `agent-device open …` in §4 | runner builds and installs | Tech lead's Mac: `export AGENT_DEVICE_IOS_TEAM_ID=Z6GFDAYSP9`. Anyone else: sign into Xcode (Xcode → Settings → Apple Accounts) with **any** Apple ID — a free Personal Team is enough for the runner — and export that team's id instead (find it under the account's "Developer Team" in that settings page). Free signing expires after 7 days; the runner just rebuilds |
| 10 | **local backend only** — DB is current: `dotnet ef migrations list --no-build` in `blotztask-api/` | nothing is marked `(Pending)` | **"Unable to determine which migrations have been applied"** = no database at all: check `lsof -nP -iTCP:1433 -sTCP:LISTEN`. Nothing listening → AI starts one: `docker run -d --name blotz-sql -e ACCEPT_EULA=Y -e MSSQL_SA_PASSWORD=<sa password from appsettings.Development.json> -p 1433:1433 -v blotz-sql-data:/var/opt/mssql mcr.microsoft.com/mssql/server:2022-latest` (a stopped `blotz-sql` → `docker start blotz-sql`). `blotztask-api/appsettings.Development.json` is gitignored, so a new dev may not have it → stop and tell them to ask the tech lead for it on **Discord, by DM** (it holds secrets — never in a channel, file or PR). Then the user creates the DB with the command below; the seed adds blotztest1. Otherwise: `dotnet ef database update`. AGENTS.md has the **user** run EF commands, so ask first and only run it on their say-so. Give it with an absolute path — `! cd <repo>/blotztask-api && dotnet ef database update` — the user's shell may already be inside `blotztask-api/`. A DB behind the code 500s with `Invalid column name '<col>'`, which reads exactly like a product bug |
| 11 | backend chosen (§2), and the bundle will not call `localhost`: `grep -h "^EXPO_PUBLIC_URL" .env.local .env` in `blotztask-mobile/` (the first hit wins) | the first hit is the staging URL, or `http://<Mac LAN IP>:5027` for a local backend | put the two staging lines from §2 in `.env.local`, restart Metro with `--clear`. Skipping this gives `ERR_NETWORK` on `http://localhost:5027/...` right after login |
| 12 | Metro serving the phone (§3) | `iOS Bundled …` line in the Metro log after launch | fix per §3 |
| 13 | phone is logged in (§4 snapshot shows the Today screen, not "Continue with Phone") | logged in as **blotztest1@gmail.com** | **User** logs in on the phone; never search for the password. The dev doesn't know it → tell them to ask the tech lead or the team on **Discord, by DM** — never in a channel, and never write it into a file, commit or PR. If another account is signed in: Settings → Log out first (Auth0 remembers the last account) |

**Android phone?** The table above and §1, §3, §4 are iPhone-only. Use the §6.1 gate instead, plus rows 6, 8, 10, 11 and 13 from this table.

## 1. Getting the dev build onto this phone

The dev build is bundle id `com.Blotz.BlotzTask.dev`. It coexists with the App Store app — never install over `com.Blotz.BlotzTask`.

Apple only lets a development build run on phones **registered under the Blotz Apple team (`Z6GFDAYSP9`)**, and that team is an Individual account, so **only the tech lead can register a phone and only the tech lead's Mac can sign the app**. That is the one place a teammate depends on the tech lead; it happens once per phone (about 10 minutes on the tech lead's side, and several phones can be batched).

**Teammates — first time on this phone.** Row 7 failing on a teammate's Mac means this phone has never had a dev build. Having the staging/TestFlight app (`com.Blotz.BlotzTask.staging`) does not count: it is a different app and needs no registration. Do not try to work around Apple signing, and do not write the user a long report for the tech lead. Give them this message to send, then **wait**:

> Hi, I need the BlotzTask dev build on my iPhone (`<model>`, iOS `<version>`). Could you send me the EAS device-registration link? I'll tell you as soon as the phone is registered so you can run the development build.

The order is register → tell the tech lead → the tech lead builds. A build started before the phone is registered leaves it out of the provisioning profile, and the install fails.

**Never run `eas build` for iOS on a teammate's Mac**, even if another assistant suggests it. Their Apple ID cannot see team `Z6GFDAYSP9`, so EAS picks whatever team the account does have and stops with `Apple 403 detected - Access forbidden … check with one of your Team Admins`. Nothing is broken when that appears: the phone's registration is unaffected, and the build is simply the tech lead's step.

1. **Register** (user, on the phone): open the tech lead's link in **Safari** (other browsers cannot install profiles) → **Allow** the profile download → Settings → **Profile Downloaded** → **Install** → passcode. The download alone registers nothing. The UDID registers itself, nobody types it. Then the user tells the tech lead "registered".
2. **Install** (user, on the phone): open the install link the tech lead sends after the build, in Safari. The profile in `eas.json` already sets the `.dev` bundle id and the staging backend. If iOS refuses to install it, the phone was not in the provisioning profile: ask the tech lead to rebuild, there is nothing to debug on the teammate's side.
3. Re-run row 7, then carry on down the gate.

After that, this phone needs the tech lead again only when native code changes (row 8). JS changes come from the teammate's own Metro (§3).

**The tech lead's side of the EAS path.** `device:create` and `build` ask questions, so the tech lead runs them in their own terminal from `blotztask-mobile/`, not through the AI.
1. `npx eas-cli@latest device:create` → account `blotz` → Apple ID + 2FA code (the App Store Connect key file is not in the repo, so EAS falls back to an interactive Apple login) → if more than one Apple team is listed, pick the **Individual** one (`Z6GFDAYSP9`) → **Website** → send the printed `https://expo.dev/register-device/…` URL. The same link works for several phones, so collect every teammate who needs a dev build before building. Treat the link as private: anyone who opens it can add a phone to the team.
2. When a teammate says "registered", **the AI** names their phone; the tech lead doesn't pick from a list. Phones register as "Unknown", and the build's checklist in the next step is much easier to get right when each row has a name.
   - AI runs `npx eas-cli@latest device:list --apple-team-id Z6GFDAYSP9 --json` (no login needed). Newest first; check its `createdAt` is from after the link was sent. No new device → the teammate's registration did not finish (usually the profile was downloaded but never **Install**ed in Settings) — send them back to §1 step 1, do not build.
   - AI gives the tech lead the filled-in command to run with `!`: `npx eas-cli@latest device:rename --apple-team-id Z6GFDAYSP9 --udid <identifier> --name "<Name> iPhone" --non-interactive`. Several new phones registered together and no way to tell whose is whose → tick them all in the build anyway, and leave them unnamed rather than guess.
3. Once everyone has confirmed: `npx eas-cli@latest build --profile development --platform ios`, same Apple login and team. One build covers every phone registered by then.
   - EAS prints `The provisioning profile is missing the following devices` and asks `Would you like to choose the devices to provision again?` → **Y**.
   - In the device checklist **the new phone starts unticked**. Arrow to it and press **Space**; Return alone keeps the old selection and silently leaves the phone out. The count must equal every registered phone (`N devices selected`).
   - The same two questions come a second time for the `ExpoWidgetsTarget` target. Answer them the same way.
   - Before walking away, read `Provisioned devices` in the credentials summary: the new UDID must be listed under **both** targets. If it is not, cancel the build (`npx eas-cli@latest build:cancel`) and run it again; a finished build without the phone cannot be installed on it.
   - About 8 minutes of build time. Share the printed `https://expo.dev/accounts/blotz/projects/BlotzTask/builds/…` link.

**Tech lead's Mac — local build** (Xcode signed into team Z6GFDAYSP9):
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

**Check which URL the bundle will really get before starting Metro.** The tracked `.env` points at `localhost`, and a teammate who has run the local API usually has a `.env.local` that does too. Metro bakes `EXPO_PUBLIC_*` into the bundle, so the staging URL in `eas.json` does nothing for a dev build, and on a first-time setup (2026-09-19) the inline variables above did not win over `.env.local` either. The dependable fix is to put the two staging lines in the git-ignored `blotztask-mobile/.env.local`, then restart Metro with `--clear`. Tell the user this also moves their simulator sessions to staging until they change it back. The symptom of getting it wrong is `AxiosError: Network Error` / `ERR_NETWORK` on requests to `http://localhost:5027/...` right after login.

Detect: `lsof -nP -iTCP:5027 -sTCP:LISTEN` → if something is listening, offer local, otherwise recommend staging. The dev build allows plain HTTP to the LAN (`NSAllowsLocalNetworking`), so no ATS change is needed. Mac LAN IP: `ipconfig getifaddr en0`; phone and Mac must be on the same Wi-Fi.

**Local backend + migrations:** a pull or branch switch can bring EF migrations the local DB has not applied — clear row 10 before blaming the app.

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

The dev client tries whatever is on 8081 first before honouring the URL; a stale bundle looks like `AxiosError: Network Error` on a Loading screen. Check `lsof -nP -iTCP:8081 -sTCP:LISTEN`, stop a leftover Metro there (ask first if it may belong to a simulator session), then relaunch with the command above. Re-run the launch command whenever you need a cold start (persistence checks).

A freshly installed dev build showing **"The Internet connection appears to be offline"** while Metro answers `curl http://<Mac LAN IP>:8082/status` is iOS blocking the app: **user** turns on Settings → Privacy & Security → **Local Network** → BlotzTask (with two BlotzTask apps installed, the one that's off), keeps the phone on the Mac's Wi-Fi, then taps Reload.

## 4. Drive the phone

```bash
export AGENT_DEVICE_IOS_TEAM_ID=<team id from row 9>   # first run builds the XCTest runner (~1 min)
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

## 6. Android

Validated 2026-10-07: OnePlus 8T (ColorOS, Android 14), Windows 11 host, staging backend. Android needs **no tech lead**: there is no device registration, and any dev builds and installs the dev build from their own machine. The local backend has not been run against an Android phone yet; say so if you use it.

### 6.1 Gate

| # | Check (AI runs) | Passes when | If it fails |
|---|---|---|---|
| A1 | `adb version`, `java -version`, `echo $ANDROID_HOME` | adb prints a version, JDK **17**, the SDK path exists | **User** installs Android Studio (it brings the SDK and adb) and JDK 17 |
| A2 | `adb devices -l` | the phone is listed as `device` | **User**: Settings → About phone → tap **Build number** 7 times (search "Build number" in Settings if it's buried, e.g. OnePlus: About device → Version) → Developer options → **USB debugging** on → re-plug a **data** cable → tick "Always allow" and tap **Allow** on the phone. `unauthorized` = the prompt was not accepted. On Windows, a phone that shows up in Device Manager only as a media/WPD device means USB debugging is still off |
| A3 | Developer options → **Stay awake** | on | **User** turns it on. A locked phone gives black screenshots and a UI tree that only shows the lock screen. The screen lock itself stays on |
| A4 | `adb -s <serial> shell pm list packages \| grep blotz` and `adb -s <serial> shell dumpsys package com.blotz.blotztask \| grep installerPackageName` | not installed, or installed by us (no `installerPackageName=com.android.vending`) | Android has **no `.dev` package**: the dev build and the Play Store app are both `com.blotz.blotztask` with different signatures, so they can't coexist. Ask the user before `adb uninstall com.blotz.blotztask` — it signs them out and clears that app's local data (tasks are on the server) |
| A5 | the dev build is installed and current: `android/` exists and is newer than `app.config.js` / the last native change (row 8) | yes | build and install per §6.2 |
| A6 | row 6 (JS deps) and row 11 (backend URL) from §0 | pass | as in §0, but see §6.3 for the Android URLs |

Ask the user to keep their hands off the phone while the AI drives it: coordinates come from the last screenshot, so if the screen changed in between, the tap lands on something else. Re-screenshot before each tap, and decline any system consent dialog a stray tap opens.

### 6.2 Build and install the dev build (≈ 8 min the first time)

```bash
cd blotztask-mobile
npx expo prebuild --platform android --clean      # android/ is gitignored and regenerated; tracked files stay unchanged
cd android && ./gradlew :app:assembleDebug -PreactNativeArchitectures=arm64-v8a   # one ABI is enough for a phone
adb -s <serial> install -r app/build/outputs/apk/debug/app-debug.apk
```

On Windows run `gradlew.bat` from PowerShell. Watch the phone during `adb install`: OnePlus/OPPO (and Xiaomi, which also needs Developer options → **Install via USB**) show a confirmation dialog. Left unanswered, `adb install` hangs for minutes and then fails with an empty reason; re-run it while the user taps **Install**.

The dev build only changes when native code does (row 8). JS changes come from Metro.

### 6.3 Backend URL

`10.0.2.2` is the emulator's alias for the host and does not exist on a phone, so a `.env.local` set up for the emulator breaks the phone. Use staging (§2), or for a local backend `http://localhost:5027` plus `adb reverse tcp:5027 tcp:5027`, which reaches the host over USB with no LAN IP or shared Wi-Fi — the same setting also works on the emulator. Restart Metro with `--clear` after changing `.env.local`.

### 6.4 Metro and launch

```bash
adb -s <serial> reverse tcp:<port> tcp:<port>    # lost on re-plug or adb restart: re-run it
adb -s <serial> shell am start -a android.intent.action.VIEW \
  -d "blotztask://expo-development-client/?url=http%3A%2F%2Flocalhost%3A<port>" com.blotz.blotztask
grep "Android Bundled" <metro log>                 # proves the phone pulled from *this* Metro
```

Pressing `a` in Metro does the same (`Shift+A` to pick a device when the emulator is also connected). The first bundle takes 20–45 s and the app is a blank white screen meanwhile; it is not hung. Fast Refresh works: an edit showed on the phone about 6 s after saving, same app process id, no restart.

### 6.5 Drive the phone

`agent-device` does not start on Windows (`Failed to start daemon … EPERM: operation not permitted, ftruncate`); drive with adb directly. On a Mac `agent-device … --platform android --serial <serial>` is untested. In Git Bash, prefix commands with `MSYS_NO_PATHCONV=1`, or `/sdcard/...` gets rewritten into a Windows path.

```bash
adb -s <serial> exec-out screencap -p > artifacts/<step>.png
adb -s <serial> shell uiautomator dump /sdcard/ui.xml && adb -s <serial> shell cat /sdcard/ui.xml   # text + bounds of every node
adb -s <serial> shell input tap <x> <y>           # physical pixels, as in the bounds above (not screenshot-preview pixels)
adb -s <serial> shell input swipe <x1> <y1> <x2> <y2> 250
adb -s <serial> shell input keyevent KEYCODE_BACK # KEYCODE_HOME goes to the first home page; BACK out of the app returns to the last one
adb -s <serial> logcat -d --pid=$(adb -s <serial> shell pidof com.blotz.blotztask) | grep ReactNativeJS
```

Home-screen widgets: the user adds the widget once (long-press the home screen → Widgets → BlotzTask). Opening the app re-renders it, so cold-start the app, wait for the Today screen, then BACK to the widget's page and screenshot. `console.log` inside the widget component shows up in logcat under `ReactNativeJS`.

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
| Metro `PluginError: Failed to resolve plugin for module "<pkg>"` | stale `node_modules` after a pull or branch switch — `npm install` (row 6) |
| 500 `Invalid column name '<col>'` after a branch switch | local DB behind on migrations — `dotnet ef database update` (row 10) |
| `expo-notifications` push-token WARN in Metro | dev builds have no push entitlement; ignore |
| Android: red toast `Error getting Expo push token … Default FirebaseApp is not initialized` | a local Android build has no `google-services.json`; ignore |
| Android: app shows old code after edits, Metro log has `EMFILE: too many open files` | Metro has been up for hours; stop it and start again with `--clear` |
| Android: `adb install` runs for minutes, then fails with no reason | the phone's USB-install dialog was not answered — §6.2 |
| Android: everything worked, then Metro is unreachable | the phone was re-plugged and `adb reverse` was dropped — re-run it (§6.4) |
| Android on Windows: `assembleRelease` fails with `ninja: error: mkdir(…): No such file or directory` | Windows 260-character path limit in the CMake build. Debug builds are fine; a release build needs Windows long-path support turned on (user, admin) or the repo in a shorter path |
| Chinese/emoji input on Android | agent-device uses a test IME (`--test-ime`); verify keyboard UX manually, never change product validation to suit the tool |
