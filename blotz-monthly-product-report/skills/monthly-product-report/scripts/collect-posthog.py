#!/usr/bin/env python3
from __future__ import annotations

import json
import sys
import urllib.error
import urllib.request
from typing import Any

from datetime import datetime, timedelta

from monthly_report_common import (
    AI_FAILURE_PROBLEMS,
    FEATURE_EVENTS,
    FIRST_WEEK_DAYS,
    HISTORY_MONTHS,
    NEW_USER_EVENTS,
    build_parser,
    ensure_month_dirs,
    load_env_file,
    parse_month,
    require_env,
    shift_month,
    utc_now_iso,
    write_json,
)


EVENTS_QUERIED = [
    "Application Installed",
    "Application Opened",
    "$identify",
    "active_user_5s",
    "manual_task_creation",
    "create_task_manually",
    "ai_task_interaction_completed",
    "create_task_by_ai",
    "ai_task_generation_session",
    "ai_task_generation_failed",
    "breakdown_task",
    "note_created",
    "screen_viewed",
    "login_started",
    "login_succeeded",
    "login_failed",
    "task_created",
    "task_completed",
    "pomodoro_started",
    "gashapon_spin",
    "badge_unlocked",
    "share_completed",
    "review_generated",
]


def sql_list(values: tuple[str, ...] | list[str]) -> str:
    return ", ".join(f"'{value}'" for value in values)


def within_first_week(days_column: str) -> str:
    return (
        f"arrayExists(d -> d >= install_date AND d < addDays(install_date, {FIRST_WEEK_DAYS}), "
        f"{days_column})"
    )


def history_query_definitions(month: str, start: str, end: str) -> dict[str, str]:
    _, previous_start, _ = parse_month(shift_month(month, -1))
    _, history_start, _ = parse_month(shift_month(month, -HISTORY_MONTHS))
    first_week_end = (
        datetime.fromisoformat(end) + timedelta(days=FIRST_WEEK_DAYS)
    ).strftime("%Y-%m-%d %H:%M:%S")
    comparison_window = (
        f"timestamp >= toDateTime('{previous_start}') AND timestamp < toDateTime('{end}')"
    )

    feature_events = sorted({event for _, events in FEATURE_EVENTS for event in events})
    feature_columns = ",\n                ".join(
        "countIf(" + " OR ".join(f"has(events_used, '{event}')" for event in events) + f") AS {key}_users"
        for key, events in FEATURE_EVENTS
    )
    problem_cases = ", ".join(
        f"properties.error_code IN ({sql_list(codes)}), '{problem}'"
        for problem, codes in AI_FAILURE_PROBLEMS
    )
    first_week_events = [event for event in NEW_USER_EVENTS if event != "Application Installed"]

    return {
        # One row per install day: new installs, what happened at login within 7 days of install,
        # and what users who logged in did in that same week. Daily grain lets normalization drop
        # install days that fall before the underlying events existed.
        "new_user_first_week_daily": f"""
            SELECT
                install_date,
                count() AS installs,
                countIf(started) AS login_started_users,
                countIf(succeeded) AS login_succeeded_users,
                countIf(started AND NOT succeeded AND had_error) AS login_error_users,
                countIf(started AND NOT succeeded AND NOT had_error AND had_exit) AS login_exit_only_users,
                countIf(started AND NOT succeeded AND NOT had_error AND NOT had_exit) AS login_no_outcome_users,
                countIf(succeeded AND created) AS task_created_users,
                countIf(succeeded AND created_manual) AS manual_task_users,
                countIf(succeeded AND (ai_session OR breakdown)) AS ai_users,
                countIf(succeeded AND ai_session) AS ai_generation_users,
                countIf(succeeded AND ai_accepted) AS ai_accepted_users,
                countIf(succeeded AND note) AS note_users,
                countIf(succeeded AND completed) AS task_completed_users,
                countIf(succeeded AND created AND NOT completed) AS created_not_completed_users,
                countIf(succeeded AND NOT created AND NOT completed) AS no_task_users
            FROM (
                SELECT
                    install_date,
                    {within_first_week('started_days')} AS started,
                    {within_first_week('succeeded_days')} AS succeeded,
                    {within_first_week('error_days')} AS had_error,
                    {within_first_week('exit_days')} AS had_exit,
                    {within_first_week('created_days')} AS created,
                    {within_first_week('manual_days')} AS created_manual,
                    {within_first_week('ai_session_days')} AS ai_session,
                    {within_first_week('ai_accepted_days')} AS ai_accepted,
                    {within_first_week('breakdown_days')} AS breakdown,
                    {within_first_week('note_days')} AS note,
                    {within_first_week('completed_days')} AS completed
                FROM (
                    SELECT
                        person_id,
                        minIf(toDate(timestamp), event = 'Application Installed') AS install_date,
                        groupUniqArrayIf(toDate(timestamp), event = 'login_started') AS started_days,
                        groupUniqArrayIf(toDate(timestamp), event = 'login_succeeded') AS succeeded_days,
                        groupUniqArrayIf(toDate(timestamp), event = 'login_failed' AND properties.reason IN ('no_tokens', 'auth0_error')) AS error_days,
                        groupUniqArrayIf(toDate(timestamp), event = 'login_failed' AND properties.reason IN ('cancelled', 'browser_dismissed')) AS exit_days,
                        groupUniqArrayIf(toDate(timestamp), event = 'task_created') AS created_days,
                        groupUniqArrayIf(toDate(timestamp), event = 'task_created' AND properties.source = 'manual') AS manual_days,
                        groupUniqArrayIf(toDate(timestamp), event = 'ai_task_generation_session') AS ai_session_days,
                        groupUniqArrayIf(toDate(timestamp), event = 'ai_task_generation_session' AND properties.outcome = 'accepted') AS ai_accepted_days,
                        groupUniqArrayIf(toDate(timestamp), event = 'breakdown_task') AS breakdown_days,
                        groupUniqArrayIf(toDate(timestamp), event = 'note_created') AS note_days,
                        groupUniqArrayIf(toDate(timestamp), event = 'task_completed') AS completed_days
                    FROM events
                    WHERE event = 'Application Installed'
                        OR (
                            event IN ({sql_list(first_week_events)})
                            AND timestamp >= toDateTime('{history_start}')
                            AND timestamp < toDateTime('{first_week_end}')
                        )
                    GROUP BY person_id
                    HAVING install_date >= toDate('{history_start}') AND install_date < toDate('{end}')
                )
            )
            GROUP BY install_date
            ORDER BY install_date
            LIMIT 400
        """,
        # Monthly active users split into returning (active last month), new (first active month)
        # and resurrected (active before, but not last month).
        "user_lifecycle_monthly": f"""
            SELECT
                month,
                count() AS active_users,
                countIf(has(active_months, addMonths(month, -1))) AS retained_users,
                countIf(first_month = month) AS new_users,
                countIf(first_month < month AND NOT has(active_months, addMonths(month, -1))) AS resurrected_users
            FROM (
                SELECT
                    person_id,
                    groupUniqArray(toStartOfMonth(timestamp)) AS active_months,
                    min(toStartOfMonth(timestamp)) AS first_month
                FROM events
                WHERE event = 'active_user_5s' AND timestamp < toDateTime('{end}')
                GROUP BY person_id
            )
            ARRAY JOIN active_months AS month
            WHERE month >= toDate('{history_start}')
            GROUP BY month
            ORDER BY month
            LIMIT 24
        """,
        # Share of each month's active users who used each feature, for this and last month.
        "feature_usage_monthly": f"""
            SELECT
                month,
                count() AS active_users,
                {feature_columns}
            FROM (
                SELECT
                    person_id,
                    toStartOfMonth(timestamp) AS month,
                    groupUniqArray(event) AS events_used
                FROM events
                WHERE event IN ('active_user_5s', {sql_list(feature_events)}) AND {comparison_window}
                GROUP BY person_id, month
                HAVING has(events_used, 'active_user_5s')
            )
            GROUP BY month
            ORDER BY month
        """,
        "ai_failures_monthly": f"""
            SELECT
                toStartOfMonth(timestamp) AS month,
                count() AS failure_count,
                count(DISTINCT person_id) AS failure_users
            FROM events
            WHERE event = 'ai_task_generation_failed' AND {comparison_window}
            GROUP BY month
            ORDER BY month
        """,
        "ai_failures_by_problem_monthly": f"""
            SELECT
                toStartOfMonth(timestamp) AS month,
                multiIf({problem_cases}, 'other') AS problem,
                count() AS failure_count,
                count(DISTINCT person_id) AS failure_users
            FROM events
            WHERE event = 'ai_task_generation_failed' AND {comparison_window}
            GROUP BY month, problem
            ORDER BY month, failure_count DESC
            LIMIT 40
        """,
        "ai_breakdown_monthly": f"""
            SELECT
                toStartOfMonth(timestamp) AS month,
                count() AS usage_count,
                count(DISTINCT person_id) AS user_count,
                avg(if(properties.success = true, 1, 0)) AS success_rate,
                avg(toFloat(properties.duration_ms)) AS average_duration_ms
            FROM events
            WHERE event = 'breakdown_task' AND {comparison_window}
            GROUP BY month
            ORDER BY month
        """,
        "login_users_monthly": f"""
            SELECT
                month,
                countIf(starts > 0) AS started_users,
                countIf(successes > 0) AS succeeded_users
            FROM (
                SELECT
                    person_id,
                    toStartOfMonth(timestamp) AS month,
                    countIf(event = 'login_started') AS starts,
                    countIf(event = 'login_succeeded') AS successes
                FROM events
                WHERE event IN ('login_started', 'login_succeeded') AND {comparison_window}
                GROUP BY person_id, month
            )
            GROUP BY month
            ORDER BY month
        """,
    }


def query_definitions(start: str, end: str) -> dict[str, str]:
    window = f"timestamp >= toDateTime('{start}') AND timestamp < toDateTime('{end}')"
    return {
        **history_query_definitions(start[:7], start, end),
        "activity_daily": f"""
            SELECT toDate(timestamp) AS day, count(DISTINCT person_id) AS active_users
            FROM events
            WHERE event = 'active_user_5s' AND {window}
            GROUP BY day
            ORDER BY day
            LIMIT 40
        """,
        "activity_weekly": f"""
            SELECT toStartOfWeek(timestamp) AS week, count(DISTINCT person_id) AS active_users
            FROM events
            WHERE event = 'active_user_5s' AND {window}
            GROUP BY week
            ORDER BY week
            LIMIT 8
        """,
        "activity_mau": f"""
            SELECT count(DISTINCT person_id) AS mau
            FROM events
            WHERE event = 'active_user_5s' AND {window}
        """,
        "activity_active_days": f"""
            SELECT avg(active_days) AS active_days_per_user_average
            FROM (
                SELECT person_id, count(DISTINCT toDate(timestamp)) AS active_days
                FROM events
                WHERE event = 'active_user_5s' AND {window}
                GROUP BY person_id
            )
        """,
        "activity_active_day_tiers": f"""
            SELECT
                multiIf(
                    active_days = 1, '1 day',
                    active_days <= 3, '2-3 days',
                    active_days <= 7, '4-7 days',
                    '8+ days'
                ) AS tier,
                count() AS users,
                avg(active_days) AS average_active_days
            FROM (
                SELECT person_id, count(DISTINCT toDate(timestamp)) AS active_days
                FROM events
                WHERE event = 'active_user_5s' AND {window}
                GROUP BY person_id
            )
            GROUP BY tier
            ORDER BY min(active_days)
        """,
        "manual_tasks_summary": f"""
            SELECT count() AS created_count, count(DISTINCT person_id) AS creator_count
            FROM events
            WHERE event = 'create_task_manually' AND {window}
        """,
        "ai_sessions_outcomes": f"""
            SELECT
                properties.outcome AS outcome,
                count() AS session_count,
                count(DISTINCT person_id) AS user_count
            FROM events
            WHERE event = 'ai_task_generation_session' AND {window}
            GROUP BY outcome
            ORDER BY outcome
            LIMIT 10
        """,
        "ai_sessions_totals": f"""
            SELECT
                count() AS session_count,
                count(DISTINCT person_id) AS user_count,
                countIf(properties.outcome = 'accepted') AS accepted_sessions,
                countIf(properties.outcome = 'rejected') AS rejected_sessions,
                countIf(properties.outcome = 'abandoned') AS abandoned_sessions
            FROM events
            WHERE event = 'ai_task_generation_session' AND {window}
        """,
        "ai_sessions_input_modes": f"""
            SELECT
                countIf(has_voice AND NOT has_text) AS voice_only_session_count,
                countIf(has_text AND NOT has_voice) AS text_only_session_count,
                countIf(has_voice AND has_text) AS mixed_input_session_count,
                countIf(NOT has_voice AND NOT has_text) AS unknown_input_mode_session_count
            FROM (
                SELECT
                    ifNull(properties.input_modes LIKE '%voice%', false) AS has_voice,
                    ifNull(properties.input_modes LIKE '%text%', false) AS has_text
                FROM events
                WHERE event = 'ai_task_generation_session' AND {window}
            )
        """,
        "ai_sessions_turn_metrics": f"""
            SELECT
                avg(length(JSONExtractArrayRaw(ifNull(properties.turns, '[]')))) AS average_turns_per_session,
                avg(arraySum(arrayMap(item -> length(JSONExtractArrayRaw(JSONExtractRaw(item, 'generated_tasks'))), JSONExtractArrayRaw(ifNull(properties.turns, '[]'))))) AS average_generated_tasks_per_session,
                avg(arraySum(arrayMap(item -> length(JSONExtractArrayRaw(JSONExtractRaw(item, 'generated_notes'))), JSONExtractArrayRaw(ifNull(properties.turns, '[]'))))) AS average_generated_notes_per_session
            FROM events
            WHERE event = 'ai_task_generation_session' AND {window}
        """,
        "ai_failures_summary": f"""
            SELECT count() AS failure_count, count(DISTINCT person_id) AS failure_users
            FROM events
            WHERE event = 'ai_task_generation_failed' AND {window}
        """,
        "ai_failures_by_stage": f"""
            SELECT properties.stage AS stage, count() AS count
            FROM events
            WHERE event = 'ai_task_generation_failed' AND {window}
            GROUP BY stage
            ORDER BY count DESC
            LIMIT 20
        """,
        "ai_failures_by_error_code": f"""
            SELECT properties.error_code AS error_code, count() AS count
            FROM events
            WHERE event = 'ai_task_generation_failed' AND {window}
            GROUP BY error_code
            ORDER BY count DESC
            LIMIT 20
        """,
        "ai_failures_by_stage_and_error_code": f"""
            SELECT properties.stage AS stage, properties.error_code AS error_code, count() AS count
            FROM events
            WHERE event = 'ai_task_generation_failed' AND {window}
            GROUP BY stage, error_code
            ORDER BY count DESC
            LIMIT 100
        """,
        "ai_failures_weekly": f"""
            SELECT
                toStartOfWeek(timestamp) AS week,
                count() AS failure_count,
                count(DISTINCT person_id) AS failure_users
            FROM events
            WHERE event = 'ai_task_generation_failed' AND {window}
            GROUP BY week
            ORDER BY week
            LIMIT 8
        """,
        "ai_breakdown_summary": f"""
            SELECT
                count() AS usage_count,
                count(DISTINCT person_id) AS user_count,
                avg(if(properties.success = true, 1, 0)) AS success_rate,
                avg(toFloat(properties.duration_ms)) AS average_duration_ms,
                avg(toFloat(properties.subtask_count)) AS average_subtask_count
            FROM events
            WHERE event = 'breakdown_task' AND {window}
        """,
        "notes_by_source": f"""
            SELECT properties.source AS source, count() AS created_count, count(DISTINCT person_id) AS creator_count
            FROM events
            WHERE event = 'note_created' AND {window}
            GROUP BY source
            ORDER BY source
            LIMIT 10
        """,
        "screen_views": f"""
            SELECT properties.screen_name AS screen_name, count() AS views, count(DISTINCT person_id) AS viewers
            FROM events
            WHERE event = 'screen_viewed' AND {window}
            GROUP BY screen_name
            ORDER BY screen_name
            LIMIT 20
        """,
        "event_inventory": f"""
            SELECT
                event,
                count() AS total_events,
                count(DISTINCT person_id) AS total_users,
                countIf({window}) AS month_events,
                count(DISTINCT if({window}, person_id, NULL)) AS month_users,
                min(timestamp) AS first_seen,
                max(timestamp) AS last_seen
            FROM events
            GROUP BY event
            ORDER BY total_events DESC
            LIMIT 250
        """,
        "installation_retention": """
            SELECT
                cohort_month,
                count() AS users,
                countIf(has(open_days, addDays(install_date, 1))) AS d1_users,
                countIf(has(open_days, addDays(install_date, 7))) AS d7_users,
                countIf(has(open_days, addDays(install_date, 30))) AS d30_users,
                countIf(has(active_months, addMonths(cohort_month, 1))) AS next_month_active_users
            FROM (
                SELECT
                    person_id,
                    minIf(toDate(timestamp), event = 'Application Installed') AS install_date,
                    toStartOfMonth(install_date) AS cohort_month,
                    groupUniqArrayIf(toDate(timestamp), event = 'Application Opened') AS open_days,
                    groupUniqArrayIf(toStartOfMonth(timestamp), event = 'active_user_5s') AS active_months
                FROM events
                WHERE event IN ('Application Installed', 'Application Opened', 'active_user_5s')
                GROUP BY person_id
                HAVING install_date >= toDate('2025-10-01')
            )
            GROUP BY cohort_month
            ORDER BY cohort_month
            LIMIT 36
        """,
        "ai_manual_combinations": f"""
            SELECT
                multiIf(
                    ai_events > 0 AND manual_tasks > 0, 'AI + manual',
                    ai_events > 0, 'AI only',
                    manual_tasks > 0, 'manual only',
                    'neither'
                ) AS segment,
                count() AS users,
                avg(active_days) AS average_active_days
            FROM (
                SELECT
                    person_id,
                    count(DISTINCT if(event = 'active_user_5s', toDate(timestamp), NULL)) AS active_days,
                    countIf(event IN (
                        'ai_task_interaction_completed',
                        'create_task_by_ai',
                        'ai_task_generation_session'
                    )) AS ai_events,
                    countIf(event IN ('manual_task_creation', 'create_task_manually')) AS manual_tasks
                FROM events
                WHERE event IN (
                    'active_user_5s',
                    'ai_task_interaction_completed',
                    'create_task_by_ai',
                    'ai_task_generation_session',
                    'manual_task_creation',
                    'create_task_manually'
                ) AND {window}
                GROUP BY person_id
                HAVING active_days > 0
            )
            GROUP BY segment
            ORDER BY segment
        """,
        "active_by_country": f"""
            SELECT country, count() AS users, avg(active_days) AS average_active_days
            FROM (
                SELECT
                    person_id,
                    argMax(
                        if(
                            empty(ifNull(toString(properties.$geoip_country_code), '')),
                            'Unknown',
                            toString(properties.$geoip_country_code)
                        ),
                        timestamp
                    ) AS country,
                    count(DISTINCT toDate(timestamp)) AS active_days
                FROM events
                WHERE event = 'active_user_5s' AND {window}
                GROUP BY person_id
            )
            GROUP BY country
            ORDER BY users DESC
            LIMIT 20
        """,
        "active_by_app_version": f"""
            SELECT app_version, count() AS users
            FROM (
                SELECT
                    person_id,
                    argMax(
                        if(
                            empty(ifNull(toString(properties.app_version), '')),
                            'Unknown',
                            toString(properties.app_version)
                        ),
                        timestamp
                    ) AS app_version
                FROM events
                WHERE event = 'active_user_5s' AND {window}
                GROUP BY person_id
            )
            GROUP BY app_version
            ORDER BY users DESC
            LIMIT 20
        """,
        "historical_install_proxy": """
            SELECT
                count() AS installed_users,
                countIf(has_identify > 0) AS identified_users,
                countIf(has_authenticated_activity > 0) AS authenticated_active_users
            FROM (
                SELECT
                    person_id,
                    countIf(event = 'Application Installed') AS installs,
                    countIf(event = '$identify') AS has_identify,
                    countIf(event = 'active_user_5s') AS has_authenticated_activity
                FROM events
                WHERE event IN ('Application Installed', '$identify', 'active_user_5s')
                GROUP BY person_id
                HAVING installs > 0
            )
        """,
        "login_funnel_users": f"""
            SELECT
                countIf(sign_in_views > 0) AS sign_in_screen_users,
                countIf(starts > 0) AS started_users,
                countIf(successes > 0) AS succeeded_users,
                countIf(failures > 0) AS failed_users,
                countIf(failures > 0 AND successes = 0) AS failed_only_users
            FROM (
                SELECT
                    person_id,
                    countIf(event = 'screen_viewed' AND properties.screen_name = 'SignIn') AS sign_in_views,
                    countIf(event = 'login_started') AS starts,
                    countIf(event = 'login_succeeded') AS successes,
                    countIf(event = 'login_failed') AS failures
                FROM events
                WHERE (
                    (event = 'screen_viewed' AND properties.screen_name = 'SignIn')
                    OR event IN ('login_started', 'login_succeeded', 'login_failed')
                ) AND {window}
                GROUP BY person_id
            )
        """,
        "login_attempts_summary": f"""
            SELECT
                countIf(event = 'login_started') AS started_attempts,
                countIf(event = 'login_succeeded') AS succeeded_attempts,
                countIf(event = 'login_failed') AS failed_attempts,
                countIf(event = 'login_failed' AND properties.reason IN ('cancelled', 'browser_dismissed')) AS user_exit_attempts,
                countIf(event = 'login_failed' AND properties.reason IN ('no_tokens', 'auth0_error')) AS error_attempts
            FROM events
            WHERE event IN ('login_started', 'login_succeeded', 'login_failed') AND {window}
        """,
        "login_failures_by_error_code": f"""
            SELECT properties.error_code AS error_code, properties.reason AS reason, count() AS count
            FROM events
            WHERE event = 'login_failed' AND {window}
            GROUP BY error_code, reason
            ORDER BY count DESC
            LIMIT 100
        """,
        "login_outcomes_by_user": f"""
            SELECT
                countIf(successes > 0 AND failures > 0) AS succeeded_after_failure_users,
                countIf(successes = 0 AND error_failures > 0) AS error_users,
                countIf(successes = 0 AND error_failures = 0 AND exit_failures > 0) AS exit_only_users,
                countIf(successes = 0 AND failures = 0) AS no_outcome_users
            FROM (
                SELECT
                    person_id,
                    countIf(event = 'login_started') AS starts,
                    countIf(event = 'login_succeeded') AS successes,
                    countIf(event = 'login_failed') AS failures,
                    countIf(event = 'login_failed' AND properties.reason IN ('no_tokens', 'auth0_error')) AS error_failures,
                    countIf(event = 'login_failed' AND properties.reason IN ('cancelled', 'browser_dismissed')) AS exit_failures
                FROM events
                WHERE event IN ('login_started', 'login_succeeded', 'login_failed') AND {window}
                GROUP BY person_id
                HAVING starts > 0
            )
        """,
    }


def run_query(host: str, project_id: str, api_key: str, name: str, query: str) -> dict[str, Any]:
    url = f"{host.rstrip('/')}/api/projects/{project_id}/query/"
    payload = {
        "query": {
            "kind": "HogQLQuery",
            "query": " ".join(query.split()),
        },
        "name": f"blotz_monthly_{name}",
    }
    request = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(request, timeout=60) as response:
            body = response.read().decode("utf-8")
            data = json.loads(body)
            data["_collection_status"] = "ok"
            return data
    except urllib.error.HTTPError as error:
        body = error.read().decode("utf-8", errors="replace")
        return {
            "_collection_status": "failed",
            "status_code": error.code,
            "reason": error.reason,
            "body": body,
            "query": payload["query"],
        }
    except Exception as error:  # noqa: BLE001 - script should persist query failures for data-quality.
        return {
            "_collection_status": "failed",
            "reason": type(error).__name__,
            "body": str(error),
            "query": payload["query"],
        }


def query_collection_status(query_statuses: list[dict[str, Any]]) -> str:
    if not query_statuses:
        return "failed"
    failed_count = sum(item.get("status") != "ok" for item in query_statuses)
    if failed_count == len(query_statuses):
        return "failed"
    if failed_count:
        return "partial"
    return "ok"


def main() -> int:
    parser = build_parser("Collect Blotz monthly PostHog metrics.")
    args = parser.parse_args()

    try:
        month, start, end = parse_month(args.month)
    except Exception as error:  # noqa: BLE001
        print(f"Invalid --month: {error}", file=sys.stderr)
        return 2

    load_env_file()
    try:
        env = require_env(["POSTHOG_HOST", "POSTHOG_PROJECT_ID", "POSTHOG_PERSONAL_API_KEY"])
    except RuntimeError as error:
        print(str(error), file=sys.stderr)
        return 2

    paths = ensure_month_dirs(month)
    raw_dir = paths["raw_posthog"]
    query_statuses: list[dict[str, Any]] = []

    for name, query in query_definitions(start, end).items():
        result = run_query(
            env["POSTHOG_HOST"],
            env["POSTHOG_PROJECT_ID"],
            env["POSTHOG_PERSONAL_API_KEY"],
            name,
            query,
        )
        write_json(raw_dir / f"{name}.json", result)
        query_statuses.append(
            {
                "name": name,
                "status": result.get("_collection_status", "unknown"),
                "status_code": result.get("status_code"),
                "reason": result.get("reason"),
            }
        )

    collection_status = query_collection_status(query_statuses)
    metadata = {
        "month": month,
        "generated_at": utc_now_iso(),
        "source": "posthog",
        "status": collection_status,
        "project_id": env["POSTHOG_PROJECT_ID"],
        "events_queried": EVENTS_QUERIED,
        "window": {
            "start": start,
            "end": end,
        },
        "queries": query_statuses,
    }
    write_json(raw_dir / "_metadata.json", metadata)

    failed_count = sum(query["status"] != "ok" for query in query_statuses)
    if collection_status == "failed":
        print(f"All {failed_count} PostHog queries failed for {month}.", file=sys.stderr)
        return 1
    if collection_status == "partial":
        print(f"Collected PostHog data for {month} with {failed_count} query warning(s).")
    else:
        print(f"Collected PostHog data for {month}.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
