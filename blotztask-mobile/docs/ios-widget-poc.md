# iOS Widget POC

## Scheme

This POC uses `expo-widgets` to add an iOS-only home screen widget named
`TodayTasksWidget`. The widget UI is written with `@expo/ui/swift-ui` and receives
timeline props through `TodayTasksWidget.updateSnapshot(...)`.

iOS is first because WidgetKit requires an iOS extension target and shared App Group
storage. `expo-widgets` can generate that target from the Expo config plugin. Android
is intentionally not enabled in this PR.

## Data Flow

The app does not expose React Query cache directly to the widget. Instead:

1. `useSelectedDayTasks` loads task data through the existing task API query.
2. When the selected day is today, the app builds a lightweight widget snapshot.
3. The iOS sync layer calls `TodayTasksWidget.updateSnapshot(snapshot)`.
4. `expo-widgets` stores the layout and timeline props in the App Group used by the
   widget extension.
5. The iOS widget renders the latest snapshot.

The widget-owned snapshot layer lives in
`src/feature/widget/models/today-tasks-widget-snapshot.ts` and is platform-neutral.
It stores only display fields:

- task id
- title
- short due label
- existing task label name/color
- task detail deep link when the task has a persisted id
- generated timestamp
- widget state

It does not store full task API responses, auth tokens, or user profile data.

## States

The widget supports:

- `placeholder`: task data is still loading.
- `content`: one or more unfinished tasks are available.
- `empty`: there are no unfinished tasks for today.
- `fallback`: the app could not load today's tasks.

## Implemented Behavior

The current POC displays today's unfinished tasks after the app loads the existing
selected-day task query. It supports small, medium, and large iOS home screen widget
families.

Implemented:

- placeholder state while today's tasks are loading
- content state with up to five unfinished tasks
- empty state when today has no unfinished tasks
- fallback state when today's task query fails
- tap widget root to open BlotzTask
- tap a persisted task row to open that task's detail route

Not implemented:

- Android widget rendering
- completing, editing, or creating tasks from the widget
- real-time widget updates
- task detail deep links for virtual recurring occurrences

## Navigation

The widget root uses `blotztask://` so tapping the widget opens BlotzTask.
Persisted task rows use:

```text
blotztask://task-details?mode=persisted&taskId=<id>
```

Virtual recurring occurrences are displayed, but they do not get a task detail deep
link because their detail route currently depends on React Query virtual cache keys
created inside the app session.

## Native Project Generation

`expo-widgets` is configured in `app.config.js`. Because this repository has an
existing `ios/` directory, the native widget target is generated when the Expo config
plugin is applied during prebuild/build.

Run from `blotztask-mobile/` when you are ready to materialize native changes:

```sh
npx expo prebuild --platform ios
```

Then install pods if the workflow does not do it automatically:

```sh
cd ios
pod install
```

This POC did not run prebuild automatically because project instructions prohibit
code-generation commands unless explicitly allowed.

## Local Testing

You need a native iOS rebuild before the widget can appear in the iOS widget gallery.
`npm start` alone is not enough because adding `expo-widgets` changes native iOS
targets and entitlements.

After the native target has been generated and the app has been rebuilt:

1. Run the iOS app once.
2. Sign in and open the calendar/today task screen.
3. Confirm the app loads today's tasks.
4. Add the BlotzTask widget from the iOS home screen widget gallery.
5. Check the widget state:
   - no loaded data yet: placeholder/fallback
   - no unfinished tasks today: empty
   - unfinished tasks today: content
6. Tap the widget background to open BlotzTask.
7. Tap a persisted task row to open the task detail screen.

If the widget shows stale data, reopen the app and revisit today's task screen. The
POC writes a new snapshot when that query loads or refreshes, but WidgetKit still
controls the final refresh timing.

## Current Limits

- iOS only.
- Requires a development build or native build; it does not work in Expo Go.
- Widget updates are not real-time. The app writes a snapshot when today's task query
  loads or refreshes, and WidgetKit controls actual reload timing.
- The widget does not mutate tasks. No complete/edit/create actions are implemented.
- Task detail deep links are limited to persisted task ids.
- The widget may need the app to be opened once after install so `expo-widgets` can
  register the JS layout in shared storage.

## Android Follow-Up

The shared snapshot builder can be reused for Android. Android-specific rendering can
be added later with one of these approaches:

- Jetpack Glance
- native `AppWidgetProvider` / `RemoteViews`
- `react-native-android-widget`

The Android layer should consume the same lightweight snapshot shape and keep task
mutations inside the app, not inside the widget.
