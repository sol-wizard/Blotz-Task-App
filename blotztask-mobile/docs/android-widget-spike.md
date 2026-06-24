# Android widget spike

Date: 2026-06-24

This spike evaluates an Android-only home screen widget path for BlotzTask. It does not install packages, modify native files, or change the existing iOS widget work.

## Local findings

- The app is Expo + React Native + Expo Router.
- `package.json` currently uses Expo `^56.0.4`, Expo Router `~56.2.6`, React Native `0.85.3`, and `expo-dev-client`.
- `app.config.js` already defines the app scheme as `blotztask` and the Android package as `com.blotz.blotztask`.
- There is no committed `android/` directory in the current working tree. Android widget validation requires a native Android build via prebuild/dev client, not Expo Go.
- `react-native-android-widget` is installed for the Android widget POC.
- The current JS tree contains a shared widget snapshot model plus an Android-readable lightweight cache under `src/feature/widget`.
- Task data is loaded through React Query in `src/shared/hooks/useSelectedDayTasks.ts`, backed by `fetchTasksForDate`.
- Task detail navigation already exists at `src/app/(protected)/task-details.tsx`. Route groups are not part of the public URL, so a persisted task can use a deep link shaped like `blotztask://task-details?mode=persisted&taskId=123`.

## Feasibility conclusion

Android widget support is feasible, but it needs a native Android build.

`react-native-android-widget` is the best first spike candidate because it has Expo support through a config plugin, supports Expo Router entry registration, and its documented React Native support covers React Native `0.76.0+`; this project is on React Native `0.85.3`.

It is not a `npm start` only feature. A widget requires Android manifest/provider resources and a dev client/native build.

## Recommended approach

Use `react-native-android-widget` for the spike.

Reasons:

- It lets the widget UI be written in TSX with its widget primitives.
- It provides an Expo config plugin for Android provider/manifest generation.
- It supports widget update handlers, app-open clicks, and URI/deep-link clicks.
- It is enough to validate data flow, update timing, and click behavior without hand-writing a native widget first.

Fallback if the library is not stable enough in this build:

- Native `AppWidgetProvider + RemoteViews`: lowest-level and most predictable Android option, but more XML/Kotlin/Java code.
- Jetpack Glance: Kotlin/Compose-style widget API, cleaner than raw RemoteViews, but it introduces Android-native UI ownership and Gradle/Kotlin setup.

## Minimal implementation path

1. Add `react-native-android-widget`.
2. Create an Expo Router-compatible entry file:
   - Change `package.json` `main` from `expo-router/entry` to `index.ts`.
   - In `index.ts`, import `expo-router/entry` and register the Android widget task handler.
3. Add an Android-only widget feature folder:
   - `src/feature/widget/models/today-tasks-widget-snapshot.ts`
   - `src/feature/widget/services/today-tasks-widget-cache.ts`
   - `src/feature/widget/android/today-tasks-widget.tsx`
   - `src/feature/widget/android/widget-task-handler.tsx`
4. Keep the snapshot model platform-neutral:
   - task id
   - title
   - due label / priority or label metadata
   - deep link
   - generatedAt
   - state: `placeholder`, `content`, `empty`, `fallback`
5. In `useSelectedDayTasks`, when the selected day is today, build and persist the snapshot after query loading/success/error states.
6. On Android, call `requestWidgetUpdate` after writing the snapshot while the app is open.
7. Configure the widget in `app.config.js` through the `react-native-android-widget` config plugin, scoped to Android only.
8. Rebuild the Android dev client with `expo run:android` or EAS development build.

## Data flow

Target flow:

```text
React Query today task data
  -> build TodayTasksWidgetSnapshot
  -> persist lightweight snapshot
  -> request Android widget update
  -> Android widget task handler reads snapshot
  -> render placeholder / empty / content / fallback
```

For the spike, `@react-native-async-storage/async-storage` is enough for the JS-driven Android widget path because the widget task handler runs JS and can read the same serialized snapshot.

For a native fallback, prefer Android `SharedPreferences` or Jetpack DataStore instead. Native RemoteViews/Glance should not depend on React Query or RN AsyncStorage internals.

Do not write full task API responses, auth tokens, user profile data, descriptions, subtasks, or note content into the widget snapshot.

## Click behavior

Whole-widget click:

- Use the library's `OPEN_APP` action, or an `OPEN_URI` action with `blotztask://`.

Task item click:

- Use `OPEN_URI` with a persisted-task deep link:

```text
blotztask://task-details?mode=persisted&taskId=123
```

This should open `TaskDetailsScreen`, which can fetch the persisted task by id.

Important limitation: virtual recurring occurrences are not good deep-link targets yet. The current in-app virtual route depends on a React Query cache entry seeded before navigation. A widget launch cannot rely on that cache. For virtual recurring tasks, the safer spike behavior is to open the app or a today list, not direct task detail.

## Update behavior

Android supports a few update paths:

- App-open update: write snapshot and call `requestWidgetUpdate`.
- Widget add/update/resize: widget task handler reads the last persisted snapshot and renders it.
- Periodic update: `updatePeriodMillis`, but Android does not deliver these more often than every 30 minutes.

This still does not guarantee real-time task freshness. If the user never opens the app, the widget can only show the last local snapshot unless we add background fetch/push/native scheduling.

Recommended stale behavior:

- Include `snapshotDate` or derive the local date from `generatedAt`.
- If the snapshot is not for today, render a fallback state such as "Open BlotzTask to refresh today's tasks."

## Completing tasks from the widget

Do not implement this in the spike.

To support complete-task later, we would need:

- A widget click action per task row.
- Auth-safe access to an API credential in a headless/background context.
- A mutation path equivalent to `toggleTaskCompletion`.
- Cache invalidation for React Query after the app opens.
- Widget snapshot rewrite after mutation success/failure.
- Handling virtual recurring occurrences, which may require materializing an occurrence before completing it.
- Careful retry/error UX because Android widget actions happen outside the normal app screen.

This is significantly higher risk than display + open/deep-link.

## Risks and limits

- Requires Android native build; Expo Go cannot validate it.
- The project currently has no Android native directory, so plugin behavior must be verified after prebuild.
- The current working tree does not contain the shared widget snapshot/cache files; they must be added before Android can reuse them.
- `react-native-android-widget` widgets use library primitives, not regular React Native `View`/`Text`.
- The library renders widget content through Android widget mechanisms and has size/reporting limitations on some launchers.
- Deep links into protected routes depend on Auth0 session restoration; unauthenticated users will be routed through auth.
- Periodic Android widget refresh is system controlled and cannot be treated as an exact timer.

## Source references

- `react-native-android-widget` docs: https://saleksovski.github.io/react-native-android-widget/docs
- Expo registration docs: https://saleksovski.github.io/react-native-android-widget/docs/tutorial/register-task-handler
- Expo config plugin docs: https://saleksovski.github.io/react-native-android-widget/docs/tutorial/register-widget-expo
- Widget update docs: https://saleksovski.github.io/react-native-android-widget/docs/update-widget
- Widget click docs: https://saleksovski.github.io/react-native-android-widget/docs/handling-clicks
- Android `updatePeriodMillis`: https://developer.android.com/reference/android/appwidget/AppWidgetProviderInfo#updatePeriodMillis
- Jetpack Glance: https://developer.android.com/develop/ui/compose/glance
