# Source Metrics

Use only these first-version metrics for the Blotz monthly PM report dataset. Record useful-but-unsupported metrics as data-quality warnings in `metrics-snapshot.json`, not as inferred values.

## App Store Connect

Collect acquisition and store performance data when available:

| Metric | Decision Use | Required |
|---|---|---|
| First-time downloads, redownloads, and total downloads | Acquisition volume | Yes |
| App updates and restores | Separate acquisition from maintenance traffic | Optional |
| Product page views | Store listing traffic | Yes |
| Conversion rate | Store listing effectiveness | Yes |
| Source type breakdown | Source-level acquisition mix | Yes |
| Territory breakdown | Regional acquisition mix | Yes |
| App version or platform breakdown | Version/platform anomalies | Optional |
| Crashes | Quality risk | Optional |

Do not combine App Store acquisition source data with PostHog product behavior unless a reliable attribution join exists.

Record coverage separately from values. A zero is valid only when a successfully parsed Standard report covers that metric for the target month. Use `null` when no recognized row establishes coverage. App Store source status is `ok` only when downloads, product page views, and product page download-button taps are all covered; use `partial` when only some are covered.

Among instances whose exposed dates match the target month, use exactly one time granularity per App Store report in this order: `MONTHLY`, then all target-month `DAILY` instances, then `WEEKLY`, then `UNKNOWN`. Only use undated instances as a fallback when no dated instance matches. Never add different time granularities for the same report. When multiple instances represent the same coverage period, keep the latest `processingDate`. Persist the contributing report and instance IDs, selected granularity, and processing date in the normalized summary so totals remain auditable after temporary raw files are removed.

## PostHog

Collect only currently instrumented useful events:

| Event | Metrics | Decision Use |
|---|---|---|
| `active_user_5s` | DAU, WAU, MAU, active days per user | Product activity |
| `create_task_manually` | Manual task count, creators, per-active-user rate | Core task usage |
| `ai_task_generation_session` | AI sessions, users, outcomes, mutually exclusive voice-only/text-only/mixed/unknown input modes, turns, generated task/note counts | AI task generation value |
| `ai_task_generation_failed` | Failure count, users, stage, error code, input mode, duration | AI reliability |
| `breakdown_task` | Usage, users, success rate, duration, generated subtask count | AI breakdown comparison |
| `note_created` | Total, manual, AI-created, and unknown-source notes; AI share only with complete source coverage | Notes usage, AI assist, and instrumentation health |
| `screen_viewed` | Notes and Gashapon visits/users only; `SignIn` views feed the login funnel | Limited feature discovery |
| Event inventory | Event count, user count, first/last seen, current-month health | Instrumentation health |
| `Application Installed` + `Application Opened` | Mature D1/D7/D30 cohorts | Retention baseline |
| Three AI event generations + manual task generations | AI/manual user combinations and active days | Behavior mix |
| `ai_task_generation_failed` | Weekly failure trend | Reliability trend |
| Geo and `app_version` properties | Active audience by country/version | Audience anomalies |
| `screen_viewed` (`SignIn`) + `login_started` + `login_succeeded` + `login_failed` | Per-user login steps within the month (saw sign-in screen, tapped continue, succeeded), per-user outcome of those who never logged in (closed the page themselves, hit an error, no recorded outcome), attempt-level counts split into user exits vs real errors, error-code breakdown | Login conversion and Auth0 reliability |
| `Application Installed` + login events + task/AI/note events within 7 days of install (`new_users`) | New installs per month for the target month and six before it, change vs last month, per-user login steps within 7 days of install, what users who logged in did in that week, and three mutually exclusive first-week groups (completed a task / created but never completed / neither) | New-user acquisition and first-week value |
| `active_user_5s` by month (`user_lifecycle`) | Monthly active users split into returning from last month, first-time active, and back after a gap; last-month users retained this month; users lost since last month; daily/monthly active ratio | Whether users come back |
| `Application Installed` + `active_user_5s` (`installation_retention`) | New users still active in the calendar month after they installed; next-day return (`d1`) | Whether new users stay |
| Feature events among active users (`feature_usage`) | Users and share of active users for task creation, task completion, AI generation, AI breakdown, notes, Pomodoro, gashapon, badges, sharing and reviews; change vs last month | Which features people use |
| AI failures, AI breakdown and login by month (`reliability`) | AI failures grouped by the problem users saw, with users and change vs last month; AI breakdown users, success rate and average duration vs last month; login success vs last month | What broke and whether it is getting better |

## Coverage And Comparison Rules

- An event covers a month `complete`ly when it first appeared before that month started, `partial`ly when it first appeared during the month, and `none` when it had not appeared yet. Coverage uses the day after an event's first appearance, so a month is never marked complete by a single late event.
- Values for `none` months are `null`, never zero. Values for `partial` months are real counts for part of the month and carry their `coverage_start`.
- New-user login and first-week metrics only count installs from `new_users.coverage_start`, the first day on which every event they depend on existed. Earlier installs still count toward installs.
- Month-over-month changes are only computed when the target month has ended (`report_context.month_complete`) and both months are `complete`. Otherwise the change fields are `null`.
- When the target month has not ended, `new_users.same_period` compares installs over the same day range of both months instead of whole months.
- New-user login and first-week values need every install in the month to have had 7 days; `mature` is false until then.

## Unsupported In First Version

Do not collect or infer:

- Onboarding conversion beyond the instrumented login steps (sign-in screen view, continue tap, login success); post-login onboarding screens are not measured.
- New-user activation beyond the first-week behaviors in `new_users`; there is no agreed activation definition or target.
- Per-task completion rate (created tasks that were later completed); only "completed at least one task" per user is supported.
- AI-generated task completion.
- A complete feature usage ranking; only the instrumented feature events above are counted.
- DDL, Calendar, Settings, or complete screen usage.
- Exact-day D7/D30 return in the report; the snapshot keeps them for reference, but the counts are too small and the single day is arbitrary.
- App Store source to product activation.
- Subscription, revenue, trial, subscription churn, or AI cost ROI.
- AI quality from edited/deleted/regenerated outputs.
- AI 0/1-2/3+ frequency buckets across all three generations until event-count semantics are normalized.
- AI-group retention until the three AI generations have a stable usage-unit contract.
- Return visits after first AI success/failure until attempts can be joined reliably.
