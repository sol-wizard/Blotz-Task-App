#!/usr/bin/env python3
from __future__ import annotations

import json
import sys
import urllib.error
import urllib.request
from typing import Any

from monthly_report_common import (
    build_parser,
    ensure_month_dirs,
    load_env_file,
    parse_month,
    require_env,
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
]


def query_definitions(start: str, end: str) -> dict[str, str]:
    window = f"timestamp >= toDateTime('{start}') AND timestamp < toDateTime('{end}')"
    return {
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
                countIf(has(open_days, addDays(install_date, 30))) AS d30_users
            FROM (
                SELECT
                    person_id,
                    minIf(toDate(timestamp), event = 'Application Installed') AS install_date,
                    toStartOfMonth(install_date) AS cohort_month,
                    groupUniqArrayIf(toDate(timestamp), event = 'Application Opened') AS open_days
                FROM events
                WHERE event IN ('Application Installed', 'Application Opened')
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
