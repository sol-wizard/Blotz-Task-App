#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path
from typing import Any

from monthly_report_common import REPOSITORY_ROOT, parse_month, utc_now_iso


SCRIPT_DIR = Path(__file__).resolve().parent
SOURCE_KEYS = {
    "posthog": ("posthog",),
    "app-store": ("app_store_connect",),
    "all": ("posthog", "app_store_connect"),
}
USABLE_SOURCE_STATUSES = {"ok", "partial"}


def run_step(
    script_name: str,
    month: str,
    environment: dict[str, str],
    extra_args: list[str] | None = None,
) -> bool:
    command = [sys.executable, str(SCRIPT_DIR / script_name), "--month", month]
    command.extend(extra_args or [])
    print(f"Running {script_name} for {month}...", flush=True)
    result = subprocess.run(command, env=environment, check=False)
    if result.returncode != 0:
        print(f"{script_name} exited with code {result.returncode}.", file=sys.stderr)
        return False
    return True


def read_json(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {}
    data = json.loads(path.read_text(encoding="utf-8"))
    return data if isinstance(data, dict) else {}


def write_json(path: Path, data: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def source_selected(sources: str, source: str) -> bool:
    return sources == "all" or sources == source


def has_usable_requested_source(sources: str, statuses: dict[str, str]) -> bool:
    return any(
        statuses.get(source) in USABLE_SOURCE_STATUSES
        for source in SOURCE_KEYS[sources]
    )


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Collect monthly App Store and PostHog metrics for AI report analysis."
    )
    parser.add_argument("--month", required=True, help="Target month in YYYY-MM format.")
    parser.add_argument(
        "--sources",
        choices=["all", "posthog", "app-store"],
        default="all",
        help="Sources to collect; defaults to all.",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=REPOSITORY_ROOT / "reports",
        help="Directory that will contain the monthly report folder.",
    )
    parser.add_argument(
        "--create-missing-app-store-request",
        action="store_true",
        help="Create a ONE_TIME_SNAPSHOT request when the app has no analytics request.",
    )
    args = parser.parse_args()

    try:
        month, _, _ = parse_month(args.month)
    except Exception as error:  # noqa: BLE001
        print(f"Invalid --month: {error}", file=sys.stderr)
        return 2

    failures: list[str] = []
    with tempfile.TemporaryDirectory(prefix="blotz-monthly-report-") as temporary_dir:
        work_root = Path(temporary_dir) / "work"
        environment = dict(os.environ)
        environment["BLOTZ_MONTHLY_WORK_DIR"] = str(work_root)

        if source_selected(args.sources, "posthog"):
            if not run_step("collect-posthog.py", month, environment):
                failures.append("collect-posthog")
            if not run_step("normalize-posthog.py", month, environment):
                failures.append("normalize-posthog")

        if source_selected(args.sources, "app-store"):
            app_store_args = (
                ["--create-missing"] if args.create_missing_app_store_request else []
            )
            if not run_step("collect-app-store.py", month, environment, app_store_args):
                failures.append("collect-app-store")
            if not run_step("normalize-app-store.py", month, environment):
                failures.append("normalize-app-store")

        if not run_step(
            "build-summary.py",
            month,
            environment,
            ["--sources", args.sources],
        ):
            failures.append("build-summary")

        monthly_work_dir = work_root / month
        metrics = read_json(monthly_work_dir / "normalized" / "monthly_metrics_summary.json")
        manifest = read_json(monthly_work_dir / "manifest.json")
        data_quality = read_json(monthly_work_dir / "data-quality.json")
        if not metrics or not manifest:
            print("Could not build a metrics snapshot.", file=sys.stderr)
            return 1

        snapshot = {
            "schema_version": 1,
            "month": month,
            "generated_at": utc_now_iso(),
            "sources": manifest.get("sources", {}),
            "data_quality": data_quality.get("checks", []),
            "metrics": metrics,
            "collection_failures": failures,
        }
        report_dir = args.output_dir.expanduser().resolve() / month
        snapshot_path = report_dir / "metrics-snapshot.json"
        write_json(snapshot_path, snapshot)
        source_details = manifest.get("sources", {})
        source_statuses = {
            name: str(details.get("status") or "failed")
            for name, details in source_details.items()
            if isinstance(details, dict)
        }
        has_usable_source = has_usable_requested_source(args.sources, source_statuses)

    print(f"Metrics snapshot: {snapshot_path}")
    print("Temporary raw App Store and PostHog data was removed.")
    if failures:
        print("Collection completed with warning(s): " + ", ".join(failures))
    if not has_usable_source:
        print("All requested data sources failed or produced no usable metrics.", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
