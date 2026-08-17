# Current PostHog Events

This reference records the Blotz instrumentation contract at the time this skill was packaged. Update this contract and the bundled queries together when production event names or properties change.

## Client Configuration

- Tracking is enabled only when `EXPO_PUBLIC_APP_ENV` is `production`.
- Autocapture is disabled.
- Session replay is enabled only in production.
- Registered super properties include `env`, `platform`, `os_version`, and optionally `app_version`.
- Authenticated users are identified with Auth0 `user.sub`; `email` and `name` are attached when available.

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

### `screen_viewed`

Meaning: A manually tracked screen was viewed.

Properties:

- `screen_name`

Current tracked values:

- `Notes`
- `GashaponMachine`

Use only for limited Notes and Gashapon discovery. Do not treat this as full product screen coverage.
