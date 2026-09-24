# Current PostHog Events

This reference records the Blotz instrumentation contract at the time this skill was packaged. Update this contract and the bundled queries together when production event names or properties change.

## Client Configuration

- Tracking is enabled only when `EXPO_PUBLIC_APP_ENV` is `production`.
- Autocapture is disabled.
- Session replay is enabled only in production.
- Registered super properties include `env`, `platform`, `os_version`, and optionally `app_version`.
- Authenticated users are identified with Auth0 `user.sub`; `email` and `name` are attached when available.
- `personProfiles` is `always`: pre-login events on the anonymous distinct id get a person profile and merge into the identified person at `$identify`. Logout calls `reset()`, so the next login starts on a fresh anonymous id that merges again. Query login steps by `person_id`.

## Events And Properties

### Historical AI generations

The project has three AI task-generation event generations:

| Event | Observed coverage | Safe use |
|---|---|---|
| `ai_task_interaction_completed` | 2025-10 to 2026-04 | Historical AI-user presence only |
| `create_task_by_ai` | 2025-12 to 2026-06-16 | Historical AI-user presence only |
| `ai_task_generation_session` | 2026-05-14 onward | Current sessions, outcomes, modes, and output counts |

Do not add event counts across generations. Their counting units are not proven equivalent and some users emit both legacy and current events during the overlap. It is safe to union distinct users for “used any AI” analyses and AI/manual behavior combinations.

### `Application Installed` and `Application Opened`

Use the earliest `Application Installed` date per merged PostHog person as the installation cohort, then use exact-day `Application Opened` events for D1, D7, and D30. Only publish a retention window after the entire monthly cohort has matured for that window.

This is a PostHog person-based retention metric, not App Store download conversion.

### `active_user_5s`

Meaning: User stayed active in the authenticated app area for at least 5 seconds. Fires once per local calendar day.

Properties:

- `seconds`: `5`
- `day`: local day as `yyyy-MM-dd`
- `source`: `foreground`

Use for DAU, WAU, MAU, active days per user, and activity trend.

### `create_task_manually`

Meaning: Manual task creation succeeded from the create-task screen.

Properties:

- `is_recurring`
- `is_deadline`

Current caveat: callers currently do not pass these properties, so recurring/deadline breakdowns are not reliable.

Use for manual task count, manual task creators, and manual tasks per active user.

### `ai_task_generation_session`

Meaning: AI task generation sheet ended with accepted, rejected, or abandoned generated content.

Properties:

- `outcome`: `accepted`, `rejected`, or `abandoned`
- `input_modes`: distinct input modes used in the session
- `turns`: array of generated turns

Each turn includes:

- `turn_index`
- `input_mode`: `voice` or `text`
- `user_input`
- `generated_tasks`
- `generated_notes`

Current caveat: `turns` can contain sensitive user input and generated content. Prefer aggregate counts in normalized output and avoid exposing raw text in reports.

Use for AI sessions, AI users, acceptance rate, rejection/abandonment rate, input mode mix, average turns, generated tasks per session, and generated notes per session. Classify session input modes into four mutually exclusive buckets: voice only, text only, both modes, and unknown. The compatibility fields for sessions containing voice or text include the mixed bucket and therefore overlap.

### `ai_task_generation_failed`

Meaning: AI task generation failed at a client or backend stage.

Properties:

- `input_mode`: `voice`, `text`, or `unknown`
- `stage`: `permission`, `recording`, `send`, `transcription`, or `generation`
- `error_code`
- `duration_ms` when available

Use for AI reliability, top failure stages, top error codes, and failure trend.

### `breakdown_task`

Meaning: AI subtask breakdown completed or failed.

Properties:

- `success`
- `duration_ms`
- `subtask_count`

Use for AI breakdown usage, success rate, latency, and generated subtask count.

### `note_created`

Meaning: A note was created.

Properties:

- `source`: `manual` or `ai`

Use for total, manual, AI-created, and unknown-source note counts. Calculate AI share only when every returned event has a supported `manual` or `ai` source. Unexpected or missing source values remain part of the total and must produce a data-quality warning.

### Task lifecycle and engagement events

These events reached production between 2026-08-04 and 2026-08-23, so August 2026 is the first month with any coverage and September 2026 the first full month. Check `coverage` in the snapshot before comparing months.

| Event | Meaning | Properties used |
|---|---|---|
| `task_created` | A task was created from the task form, the AI sheet, or the onboarding voice coach. Recurring tasks fire once per series; preset tasks seeded by the server never fire it. | `source`: `manual`, `ai`, `onboarding_ai` |
| `task_completed` | A user marked a task as complete. Fires per occurrence for recurring tasks; never fires on un-completing. | — |
| `pomodoro_started` | A Pomodoro focus session started. | — |
| `gashapon_spin` | The user spun the gashapon machine. | — |
| `badge_unlocked` | A badge was unlocked. | — |
| `share_completed` | A share (weekly/monthly review or badge) finished successfully. | — |
| `review_generated` | A weekly or monthly review was generated. | — |

Use them for per-user presence only: whether a user did it at least once in a month or in their first week. New users can complete preset tasks they never created, so "completed a task" does not imply "created a task".

### `screen_viewed`

Meaning: A manually tracked screen was viewed.

Properties:

- `screen_name`

Current tracked values:

- `SignIn` (login funnel only; not part of `screen_views`)
- `Notes`
- `GashaponMachine`

Use only for limited Notes and Gashapon discovery and as the first login funnel step. Do not treat this as full product screen coverage.

### `login_started`

Meaning: The user tapped a sign-in button on the SignIn screen, before the Auth0 browser opens. Fires on the anonymous distinct id before `$identify`.

Properties:

- `connection`: `default` or `sms` (`sms` is only rendered outside production)

Use for the login attempt denominator and the "tapped continue" funnel step.

### `login_succeeded`

Meaning: Auth0 returned both an access token and a refresh token. Fires before the redirect into the authenticated area and before `$identify`, on the same anonymous distinct id as `login_started`.

Properties:

- `connection`
- `duration_ms`: milliseconds from tap to token receipt

Current caveat: it does not prove the user reached the authenticated area; that last hop is not instrumented.

Use for attempt-level success rate and the "login succeeded" funnel step.

### `login_failed`

Meaning: A login attempt ended without tokens. Exactly one of `login_succeeded` or `login_failed` follows each `login_started` unless the app is killed mid-attempt; those attempts are reported as unresolved, not failed.

Properties:

- `connection`
- `reason`: `cancelled`, `browser_dismissed`, `no_tokens`, or `auth0_error`
- `error_code`: one of react-native-auth0 `WebAuthErrorCodes` (for example `USER_CANCELLED`, `BROWSER_TERMINATED`, `NETWORK_ERROR`, `TRANSACTION_ACTIVE_ALREADY`, `ACCESS_DENIED`, `UNKNOWN_ERROR`) or `NoTokensReturned`
- `duration_ms`

Current caveat: `cancelled` and `browser_dismissed` are user exits, not failures; only `no_tokens` and `auth0_error` measure Auth0 reliability. `reason` is derived from `error_code` in the app, so every error code maps to exactly one reason.

Use for the user-exit vs real-error split (per attempt and per user), top login error codes, and failed-user reach.
