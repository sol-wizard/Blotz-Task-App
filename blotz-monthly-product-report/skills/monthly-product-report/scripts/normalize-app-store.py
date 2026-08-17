#!/usr/bin/env python3
from __future__ import annotations

import csv
import gzip
import sys
from collections import defaultdict
from pathlib import Path
from typing import Any

from monthly_report_common import (
    build_parser,
    ensure_month_dirs,
    month_date_bounds,
    month_dir,
    number,
    read_json,
    write_json,
)


DATE_COLUMNS = ["date", "Date", "processingDate", "Processing Date", "Event Date", "Download Date"]
COUNT_COLUMNS = ["counts", "count"]
DOWNLOAD_TYPE_COLUMNS = ["download type"]
EVENT_COLUMNS = ["event"]
PAGE_TYPE_COLUMNS = ["page type"]
ENGAGEMENT_TYPE_COLUMNS = ["engagement type"]
SOURCE_COLUMNS = ["source type", "Source Type", "source", "Source"]
TERRITORY_COLUMNS = ["territory", "Territory", "country", "Country", "storefront", "Storefront"]


def lower_keys(row: dict[str, str]) -> dict[str, str]:
    return {key.strip().lower(): value for key, value in row.items() if key is not None}


def value_for(row: dict[str, str], candidates: list[str]) -> Any:
    lowered = lower_keys(row)
    for candidate in candidates:
        value = lowered.get(candidate.lower())
        if value not in (None, ""):
            return value
    for key, value in lowered.items():
        if any(candidate.lower() in key for candidate in candidates) and value not in (None, ""):
            return value
    return None


def row_in_month(row: dict[str, str], month: str) -> bool:
    _, start_date, end_date = month_date_bounds(month)
    for column in DATE_COLUMNS:
        value = row.get(column)
        if isinstance(value, str) and len(value) >= 10:
            date = value[:10]
            if start_date <= date < end_date:
                return True
    return False


def read_tsv_gz(path: Path) -> list[dict[str, str]]:
    with gzip.open(path, "rt", encoding="utf-8-sig", newline="") as handle:
        return list(csv.DictReader(handle, delimiter="\t"))


def add_breakdown(target: dict[str, float], key: Any, amount: float | int | None) -> None:
    if key in (None, "") or amount is None:
        return
    target[str(key)] += float(amount)


def top_items(values: dict[str, float], limit: int = 10) -> list[dict[str, Any]]:
    return [
        {"name": key, "value": round(value, 6)}
        for key, value in sorted(values.items(), key=lambda item: item[1], reverse=True)[:limit]
    ]


def write_csv(path: Path, fieldnames: list[str], records: list[dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(records)


def main() -> int:
    parser = build_parser("Normalize Blotz monthly App Store Connect Analytics Reports.")
    args = parser.parse_args()
    month = args.month
    paths = ensure_month_dirs(month)
    raw_dir = paths["raw_app_store"]
    normalized_dir = paths["normalized"]
    metadata = read_json(raw_dir / "_metadata.json", {})
    segment_records = metadata.get("segments_downloaded", [])
    warnings = list(metadata.get("warnings", []))

    first_time_downloads = 0.0
    redownloads = 0.0
    app_updates = 0.0
    restores = 0.0
    downloads_report_seen = False
    page_views_total = 0.0
    page_views_seen = False
    product_page_gets = 0.0
    product_page_gets_seen = False
    source_downloads: dict[str, float] = defaultdict(float)
    territory_downloads: dict[str, float] = defaultdict(float)
    rows_scanned = 0
    rows_used = 0
    acquisition_rows: list[dict[str, Any]] = []
    selected_instances: list[dict[str, Any]] = []
    selected_instance_keys: set[tuple[str, str]] = set()

    for segment in segment_records:
        relative_path = segment.get("path")
        if not relative_path:
            continue
        file_path = raw_dir / relative_path
        if not file_path.exists():
            warnings.append(f"Downloaded segment file is missing: {relative_path}")
            continue
        report_name = str(segment.get("report_name") or "")
        if not report_name.endswith(" Standard"):
            continue
        try:
            rows = read_tsv_gz(file_path)
        except Exception as error:  # noqa: BLE001
            warnings.append(f"Could not parse App Store segment {relative_path}: {type(error).__name__}")
            continue

        rows_used_before_segment = rows_used
        for row in rows:
            rows_scanned += 1
            if not row_in_month(row, month):
                continue
            rows_used += 1
            lower_report = report_name.lower()
            count_value = number(value_for(row, COUNT_COLUMNS))
            download_type = str(value_for(row, DOWNLOAD_TYPE_COLUMNS) or "")
            event = str(value_for(row, EVENT_COLUMNS) or "")
            page_type = str(value_for(row, PAGE_TYPE_COLUMNS) or "")
            engagement_type = str(value_for(row, ENGAGEMENT_TYPE_COLUMNS) or "")

            if "download" in lower_report and count_value is not None:
                normalized_type = download_type.strip().lower()
                if normalized_type == "first-time download":
                    first_time_downloads += float(count_value)
                    downloads_report_seen = True
                elif normalized_type == "redownload":
                    redownloads += float(count_value)
                    downloads_report_seen = True
                elif normalized_type in {"auto-update", "manual update"}:
                    app_updates += float(count_value)
                    downloads_report_seen = True
                elif normalized_type == "restore":
                    restores += float(count_value)
                    downloads_report_seen = True

                if normalized_type in {"first-time download", "redownload"}:
                    add_breakdown(source_downloads, value_for(row, SOURCE_COLUMNS), count_value)
                    add_breakdown(territory_downloads, value_for(row, TERRITORY_COLUMNS), count_value)

            is_product_page_view = (
                ("discovery" in lower_report or "engagement" in lower_report)
                and event.strip().lower() == "page view"
                and page_type.strip().lower() == "product page"
            )
            if is_product_page_view and count_value is not None:
                page_views_total += float(count_value)
                page_views_seen = True

            is_product_page_get = (
                ("discovery" in lower_report or "engagement" in lower_report)
                and event.strip().lower() == "tap"
                and page_type.strip().lower() == "product page"
                and engagement_type.strip().lower() == "get"
            )
            if is_product_page_get and count_value is not None:
                product_page_gets += float(count_value)
                product_page_gets_seen = True

            acquisition_rows.append(
                {
                    "report_name": report_name,
                    "download_type": download_type or None,
                    "event": event or None,
                    "page_type": page_type or None,
                    "engagement_type": engagement_type or None,
                    "count": count_value,
                    "source": value_for(row, SOURCE_COLUMNS),
                    "territory": value_for(row, TERRITORY_COLUMNS),
                }
            )

        report_id = str(segment.get("report_id") or "")
        instance_id = str(segment.get("instance_id") or "")
        instance_key = (report_id, instance_id)
        if (
            rows_used > rows_used_before_segment
            and instance_id
            and instance_key not in selected_instance_keys
        ):
            selected_instance_keys.add(instance_key)
            selected_instances.append(
                {
                    "report_name": report_name,
                    "report_id": report_id or None,
                    "instance_id": instance_id,
                    "granularity": str(
                        segment.get("instance_granularity") or "UNKNOWN"
                    ).upper(),
                    "processing_date": segment.get("instance_processing_date"),
                }
            )

    downloads_total = first_time_downloads + redownloads
    conversion_rate = (
        product_page_gets / page_views_total
        if product_page_gets_seen and page_views_seen and page_views_total
        else None
    )
    coverage = {
        "downloads": downloads_report_seen,
        "product_page_views": page_views_seen,
        "product_page_gets": product_page_gets_seen,
    }

    summary = {
        "downloads": int(downloads_total)
        if downloads_report_seen and downloads_total.is_integer()
        else (downloads_total if downloads_report_seen else None),
        "first_time_downloads": int(first_time_downloads)
        if downloads_report_seen and first_time_downloads.is_integer()
        else (first_time_downloads if downloads_report_seen else None),
        "redownloads": int(redownloads)
        if downloads_report_seen and redownloads.is_integer()
        else (redownloads if downloads_report_seen else None),
        "app_updates": (
            int(app_updates) if app_updates.is_integer() else app_updates
        ) if downloads_report_seen else None,
        "restores": (
            int(restores) if restores.is_integer() else restores
        ) if downloads_report_seen else None,
        "product_page_views": int(page_views_total)
        if page_views_seen and page_views_total.is_integer()
        else (page_views_total if page_views_seen else None),
        "product_page_gets": int(product_page_gets)
        if product_page_gets_seen and product_page_gets.is_integer()
        else (product_page_gets if product_page_gets_seen else None),
        "conversion_rate": round(conversion_rate, 6) if conversion_rate is not None else None,
        "top_sources": top_items(source_downloads),
        "top_territories": top_items(territory_downloads),
        "coverage": coverage,
        "report_granularity": "Standard" if any(coverage.values()) else None,
        "selected_instances": selected_instances,
        "warnings": warnings,
        "rows_scanned": rows_scanned,
        "rows_used": rows_used,
    }

    write_csv(
        normalized_dir / "app_store_acquisition.csv",
        [
            "report_name",
            "download_type",
            "event",
            "page_type",
            "engagement_type",
            "count",
            "source",
            "territory",
        ],
        acquisition_rows,
    )
    write_json(normalized_dir / "app_store_summary.json", summary)
    print(f"Normalized App Store Connect metrics for {month}.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
