# Interpretation Rules

Apply these rules when turning metrics into PM conclusions.

## 决策标签

综合使用量、价值、可靠性、数据质量和不确定性后，选择一个内部决策代码；最终报告只显示对应的中文标签：

- `double_down` → `加大投入`：使用和价值信号强，可靠性可接受。
- `monitor` → `持续观察`：存在使用，但还需要更多历史或对比。
- `fix_reliability` → `优先修复可靠性`：价值信号存在，但失败或延迟是主要问题。
- `fix_instrumentation_first` → `优先完善数据`：数据缺口阻碍主要产品决策。
- `no_clear_signal` → `暂无明确信号`：使用量或数据不足以判断。

英文代码只用于内部一致性，不出现在 PM 可见的 HTML 中。

## AI Task Generation

- Treat acceptance rate as a value signal only alongside session volume, user reach, abandonment, and data quality.
- Treat meaningful usage plus meaningful acceptance as evidence that users receive value, not proof of retention or business impact.
- Consider failure-event volume and affected-user reach alongside session volume, but do not combine them into a failure rate without a stable attempt denominator. Surface material reliability impact even when acceptance is strong.
- Compare input modes only as usage mix, not as quality or retention. Calculate composition from the mutually exclusive voice-only, text-only, mixed, and unknown buckets. Sessions-containing-voice and sessions-containing-text counts overlap when mixed sessions exist and are not a partition.
- Treat sessions per AI user as an aggregate usage intensity. It does not establish a repeat-use rate or show how many users returned for another session without a per-user frequency distribution.
- Use generated task/note averages as output volume, not output quality.

## AI Reliability

- In the PM-facing report, group failures by the problem users saw (`reliability.ai_failures_by_problem`: no usable tasks, network, microphone permission, recording) rather than by stage and error code. Keep stage × error code for the appendix.
- Top failure stages and error codes should drive engineering follow-up.
- Associate a failure stage with an error code only when `by_stage_and_error_code` contains that exact pair. Separate `by_stage` and `by_error_code` totals do not prove which errors occurred at each stage.
- Treat failure events and affected users as reliability impact, not a failure rate. A failure rate requires a stable attempt denominator and a reliable way to join each attempt, its intermediate failures, and its final outcome.
- Treat the first and last weekly buckets as partial when they do not cover seven complete target-month days. Do not use partial-week movement to claim that reliability improved or worsened.
- `NoTasksExtracted` means the AI flow completed but failed to produce usable task output; treat it as quality/relevance risk.
- `NetworkError`, `RecordingStartFailed`, `NotRecording`, and permission failures are product/reliability/friction risks.

## AI Breakdown

- Interpret success rate together with usage volume, failure definitions, and affected-user count.
- Interpret duration as a UX signal in product context; call out material latency without using one number as an automatic decision boundary.
- An average duration does not reveal typical or slow-request waiting time. Do not infer percentiles or set numerical performance targets unless the snapshot, an approved product target, or an explicit benchmark supports them.
- Do not compare AI breakdown and AI task generation as direct substitutes; they solve different user jobs.

## Reasoning Discipline

- Do not select a decision label by mechanically applying one threshold.
- Explain which evidence materially changed the recommendation and which evidence merely adds context.
- Prefer a qualified conclusion over false precision when the snapshot lacks a comparison month, cohort, or denominator.
- Separate four evidence levels in the report wording:
  1. **Observed fact**: directly present in a successful snapshot metric.
  2. **Interpretation**: a qualified product meaning supported by those facts, without adding causality.
  3. **Validation hypothesis**: a possible explanation that is explicitly labelled `待验证假设`; never present it as a finding or mix it into a metric label.
  4. **Recommended action**: an action tied to evidence, its boundary, and a current or future validation method.
- Include a validation hypothesis only when it changes a concrete follow-up. Do not fill the report with speculative causes such as missing reminders, weak completion value, or first-use friction when the snapshot does not observe them.
- Distinguish currently measurable validation from instrumentation-dependent validation. Label the latter `完善数据后验证` instead of presenting it as a current result metric.

## Visual And Relational Claims

- A disclaimer does not make a misleading visual relationship acceptable. Omit the visual when its structure implies an unsupported sequence, partition, comparison, or cause.
- Draw a funnel only when the snapshot contains ordered steps for a consistently identified population and exposes the required denominators. Never arrange App Store downloads, PostHog active users, AI users, or AI/manual behavior groups as one funnel.
- Draw a composition only when categories are mutually exclusive, collectively cover the stated denominator, and use the same counting unit. Do not convert overlapping compatibility counts into percentages that appear to sum to 100%.
- Treat AI/manual behavior groups as correlations, not a path from AI use to manual task creation. A conversion requires event order and a defined eligible population.
- Use a trend only when the snapshot contains comparable time buckets. Do not manufacture month-over-month or weekly direction from unrelated aggregates or incomplete boundary buckets.

## PM-facing language

- Prefer plain Chinese over analytics and engineering shorthand.
- Explain a concept by the user-visible meaning before mentioning the underlying event or field.
- Keep event names and error codes for verification, but do not make the reader decode query terminology.
- Describe percentile latency as typical waiting time and slow-request waiting time unless the reader explicitly asks for P50/P90.
- Describe identity joins and event unions in terms of which user records are considered the same person and how duplicate users are removed.

## Product Activity

- MAU and active days per user describe product activity, not acquisition.
- Manual tasks per active user is a rough core-usage intensity metric.
- Do not infer retention cohorts without cohort data.
- Of the install-cohort return windows, show only next-day return (`d1_rate`) and still active next month (`next_month_active_rate`), and only when mature; label immature windows by omission rather than zero. Exact-day D7/D30 stay in the snapshot but not in the report: their counts are single digits and one arbitrary day decides them.
- Treat active-day tiers as frequency segments, not retention cohorts.
- Treat AI/manual combinations as correlations. More active users have more opportunities to use both workflows; the groups do not establish feature conversion or causal lift.
- The login funnel counts users who saw the sign-in screen, tapped continue, and succeeded within the same month. Steps are per-person presence, not ordered attempts: present user-level step ratios only when `steps_monotonic` is true, use `started_attempts` as the only denominator for attempt-level rates, treat `cancelled` and `browser_dismissed` as user exits rather than reliability failures, and report `unresolved_attempts` as attempts without a recorded outcome, not as failures. Explain what happened to users who never logged in with the per-user buckets (`exit_only_users`, `error_users`, `no_outcome_users`), which partition `not_succeeded_users`; a user who both hit an error and cancelled is an error user. Prefer per-user counts over per-attempt counts in PM-facing tables because retries inflate attempt counts. The sign-in screen also appears after logout, so the funnel is not a new-user or onboarding conversion.

## New Users

- A new install is a PostHog person's first `Application Installed`: the first time the app was opened, not an App Store download. Reinstalls on a new device can look new.
- Login and first-week values cover only installs from `new_users.coverage_start`. Say which install dates they cover whenever the target month is `partial`, and never compare a partial month with a complete one.
- The 7-day login steps (installed → tapped continue → logged in) are one population in order within a fixed window, so they may be shown as a funnel when `steps_monotonic` is true. They are different from the all-user login funnel, which includes returning users who logged out.
- First-week behaviors overlap and must not be added together. The three first-week groups (`task_completed`, `created_not_completed`, `no_task`) partition users who logged in and may be shown as a composition.
- First-week behavior describes what new users did, not whether it made them stay. Do not link it to retention without a joined analysis.
- A month whose installs are far below its first-time active users (for example March 2026: 9 installs, 75 first-time active users) points to an install tracking gap. Flag it and do not use it for month-over-month change.

## Returning Users

- `user_lifecycle` splits each month's active users into returning from last month, first-time active, and back after a gap; the three add up to monthly active users when `composition_complete` is true. "First-time active" means the first month with an `active_user_5s` event, which only exists from 2025-12-27, so it is not identical to new installs.
- Last-month retention (`retention_rate`) is the share of last month's active users who were active again this month. It uses the whole active base, so it is steadier than cohort windows at current volumes.
- Daily/monthly active ratio (`dau_over_mau`) is how many days in the month an average active user shows up, relative to the month; describe it as stickiness, not engagement quality.
- Active-day tiers are this month's usage frequency, not retention.

## Feature Usage

- Feature users are active users who fired the feature event at least once in the month. Features overlap; never add them or present them as a ranking of all features.
- Show a feature's share of active users only with its coverage; for a `partial` month, state the date it started. Compare with last month only when `users_change_ratio` is present.
- Absence of a feature event means the feature is not instrumented or was not used, not that the feature does not exist.

## Month-over-month

- Use the change fields the snapshot provides; never compute a change yourself from a `partial` or `none` month.
- With one previous month, describe direction only (up/down and by how much). Do not call a single month's change a trend.
- Small bases swing a lot; when either month has fewer than about 20 users, give the counts next to the percentage change.

## Instrumentation Health

- Use first seen, last seen, monthly event count, and monthly user count to identify event transitions and sudden gaps.
- Do not merge event counts across historical AI generations unless their emission units are proven equivalent.
- Distinct-user unions across AI generations are acceptable for “used any AI” presence analyses.
- A historical install/identify proxy is not a strict funnel when identified or authenticated events are incomplete or non-monotonic.

## Audience Breakdowns

- Country and App version describe observed active users; they do not establish acquisition quality or causality.
- Version user counts should use one latest observed version per person for the month.
- Do not join App Store territory to PostHog country without an attribution key.
- Do not compare or stack App Store downloads with PostHog active-user or AI-user counts as stages of one population.

## Missing App Store Data

If App Store Connect is unavailable:

- Mark acquisition metrics as unavailable.
- Continue PostHog product/AI analysis if PostHog is `ok` or `partial`, but omit metrics from failed queries and state the partial coverage once.
- State that the report cannot answer acquisition or store conversion questions, but do not let missing App Store data block AI/product usage recommendations.
