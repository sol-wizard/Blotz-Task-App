#!/usr/bin/env python3
from __future__ import annotations

import base64
import json
import os
import subprocess
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any

from monthly_report_common import (
    build_parser,
    ensure_month_dirs,
    load_env_file,
    month_date_bounds,
    parse_month,
    require_env,
    safe_slug,
    utc_now_iso,
    write_json,
)


API_BASE = "https://api.appstoreconnect.apple.com"
TARGET_REPORT_KEYWORDS = {
    "downloads": ["download"],
    "discovery_engagement": ["discovery", "engagement"],
    "crashes": ["crash"],
}
INSTANCE_GRANULARITY_PRIORITY = ("MONTHLY", "DAILY", "WEEKLY", "UNKNOWN")
INSTANCE_DATE_FIELDS = ("startDate", "endDate", "date", "reportDate")


def b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def der_to_raw_ecdsa_signature(der: bytes) -> bytes:
    if len(der) < 8 or der[0] != 0x30:
        raise ValueError("Invalid DER ECDSA signature.")
    index = 2
    if der[1] & 0x80:
        length_bytes = der[1] & 0x7F
        index = 2 + length_bytes
    if der[index] != 0x02:
        raise ValueError("Invalid DER ECDSA signature integer marker for r.")
    r_len = der[index + 1]
    r = der[index + 2 : index + 2 + r_len]
    index = index + 2 + r_len
    if der[index] != 0x02:
        raise ValueError("Invalid DER ECDSA signature integer marker for s.")
    s_len = der[index + 1]
    s = der[index + 2 : index + 2 + s_len]
    return r.lstrip(b"\x00").rjust(32, b"\x00") + s.lstrip(b"\x00").rjust(32, b"\x00")


def create_jwt(issuer_id: str, key_id: str, private_key_path: str, key_type: str) -> str:
    now = int(time.time())
    header = {"alg": "ES256", "kid": key_id, "typ": "JWT"}
    payload = {"iat": now, "exp": now + 20 * 60, "aud": "appstoreconnect-v1"}
    if key_type == "individual":
        payload["sub"] = "user"
    else:
        payload["iss"] = issuer_id
    signing_input = (
        b64url(json.dumps(header, separators=(",", ":")).encode("utf-8"))
        + "."
        + b64url(json.dumps(payload, separators=(",", ":")).encode("utf-8"))
    )
    process = subprocess.run(
        ["openssl", "dgst", "-sha256", "-sign", private_key_path],
        input=signing_input.encode("ascii"),
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=False,
    )
    if process.returncode != 0:
        raise RuntimeError("openssl failed to sign App Store Connect JWT.")
    signature = der_to_raw_ecdsa_signature(process.stdout)
    return signing_input + "." + b64url(signature)


class AppStoreClient:
    def __init__(self, token: str) -> None:
        self.token = token

    def request(self, method: str, path_or_url: str, body: dict[str, Any] | None = None) -> Any:
        url = path_or_url if path_or_url.startswith("http") else API_BASE + path_or_url
        data = json.dumps(body).encode("utf-8") if body is not None else None
        request = urllib.request.Request(
            url,
            data=data,
            method=method,
            headers={
                "Authorization": f"Bearer {self.token}",
                "Content-Type": "application/json",
            },
        )
        with urllib.request.urlopen(request, timeout=60) as response:
            content_type = response.headers.get("Content-Type", "")
            payload = response.read()
            if "json" in content_type:
                return json.loads(payload.decode("utf-8"))
            return payload

    def get_all(self, path: str) -> dict[str, Any]:
        items: list[Any] = []
        included: list[Any] = []
        next_url: str | None = path
        first: dict[str, Any] | None = None
        while next_url:
            page = self.request("GET", next_url)
            if first is None:
                first = dict(page)
            data = page.get("data", [])
            if isinstance(data, list):
                items.extend(data)
            elif data:
                items.append(data)
            if isinstance(page.get("included"), list):
                included.extend(page["included"])
            next_url = page.get("links", {}).get("next")
        result = first or {}
        result["data"] = items
        if included:
            result["included"] = included
        return result


def create_report_request(client: AppStoreClient, app_id: str, access_type: str) -> dict[str, Any]:
    return client.request(
        "POST",
        "/v1/analyticsReportRequests",
        {
            "data": {
                "type": "analyticsReportRequests",
                "attributes": {"accessType": access_type},
                "relationships": {"app": {"data": {"type": "apps", "id": app_id}}},
            }
        },
    )


def report_matches(name: str, category: str | None) -> bool:
    lower = f"{name} {category or ''}".lower()
    return any(all(keyword in lower for keyword in keywords) for keywords in TARGET_REPORT_KEYWORDS.values())


def instance_coverage_key(
    instance: dict[str, Any], granularity: str, month: str
) -> tuple[str, ...]:
    attrs = instance.get("attributes", {})
    date_values = [
        value[:10]
        for field in INSTANCE_DATE_FIELDS
        if isinstance((value := attrs.get(field)), str) and len(value) >= 10
    ]
    target_dates = sorted(value for value in date_values if value.startswith(month))
    if granularity == "MONTHLY" and target_dates:
        return (granularity, month)
    if granularity == "DAILY" and target_dates:
        return (granularity, target_dates[0])
    if date_values:
        return (granularity, *date_values)
    return (granularity, "id", str(instance.get("id") or ""))


def deduplicate_instances(
    instances: list[dict[str, Any]], granularity: str, month: str
) -> list[dict[str, Any]]:
    selected: dict[tuple[str, ...], dict[str, Any]] = {}
    for instance in instances:
        key = instance_coverage_key(instance, granularity, month)
        attrs = instance.get("attributes", {})
        rank = (
            str(attrs.get("processingDate") or ""),
            str(instance.get("id") or ""),
        )
        current = selected.get(key)
        if current is None:
            selected[key] = instance
            continue
        current_attrs = current.get("attributes", {})
        current_rank = (
            str(current_attrs.get("processingDate") or ""),
            str(current.get("id") or ""),
        )
        if rank > current_rank:
            selected[key] = instance
    return [selected[key] for key in sorted(selected)]


def selected_instances(instances: list[dict[str, Any]], month: str) -> list[dict[str, Any]]:
    _, start_date, end_date = month_date_bounds(month)
    direct_by_granularity: dict[str, list[dict[str, Any]]] = {}
    undated_by_granularity: dict[str, list[dict[str, Any]]] = {}
    for instance in instances:
        attrs = instance.get("attributes", {})
        granularity = str(attrs.get("granularity") or "UNKNOWN").upper()
        if granularity not in INSTANCE_GRANULARITY_PRIORITY:
            granularity = "UNKNOWN"
        date_values = [attrs.get(field) for field in INSTANCE_DATE_FIELDS]
        if any(
            isinstance(value, str) and start_date <= value[:10] < end_date
            for value in date_values
        ):
            direct_by_granularity.setdefault(granularity, []).append(instance)
            continue

        # Some Analytics Reports instances expose only processingDate plus granularity.
        # Keep one granularity per report and let normalization filter rows by target month.
        undated_by_granularity.setdefault(granularity, []).append(instance)

    for granularity in INSTANCE_GRANULARITY_PRIORITY:
        if direct_by_granularity.get(granularity):
            return deduplicate_instances(direct_by_granularity[granularity], granularity, month)

    for granularity in INSTANCE_GRANULARITY_PRIORITY:
        if undated_by_granularity.get(granularity):
            return deduplicate_instances(undated_by_granularity[granularity], granularity, month)
    return []


def segment_download_url(segment: dict[str, Any]) -> str | None:
    attrs = segment.get("attributes", {})
    return attrs.get("url") or attrs.get("downloadUrl")


def download_segment(url: str, destination: Path) -> None:
    request = urllib.request.Request(url, method="GET")
    with urllib.request.urlopen(request, timeout=120) as response:
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_bytes(response.read())


def main() -> int:
    parser = build_parser("Collect Blotz monthly App Store Connect Analytics Reports.")
    parser.add_argument(
        "--create-missing",
        action="store_true",
        help="Create a ONE_TIME_SNAPSHOT analytics report request if no request exists.",
    )
    args = parser.parse_args()

    try:
        month, _, _ = parse_month(args.month)
    except Exception as error:  # noqa: BLE001
        print(f"Invalid --month: {error}", file=sys.stderr)
        return 2

    load_env_file()
    try:
        env = require_env(
            [
                "APPSTORE_CONNECT_ISSUER_ID",
                "APPSTORE_CONNECT_KEY_ID",
                "APPSTORE_CONNECT_PRIVATE_KEY_PATH",
                "APPSTORE_APP_ID",
            ]
        )
    except RuntimeError as error:
        print(str(error), file=sys.stderr)
        return 2

    paths = ensure_month_dirs(month)
    raw_dir = paths["raw_app_store"]
    metadata: dict[str, Any] = {
        "month": month,
        "generated_at": utc_now_iso(),
        "source": "app_store_connect",
        "app_id": env["APPSTORE_APP_ID"],
        "reports_considered": [],
        "segments_downloaded": [],
        "warnings": [],
    }

    private_key_path = Path(env["APPSTORE_CONNECT_PRIVATE_KEY_PATH"])
    if not private_key_path.exists():
        print("Missing App Store Connect private key file.", file=sys.stderr)
        return 2

    try:
        token = create_jwt(
            env["APPSTORE_CONNECT_ISSUER_ID"],
            env["APPSTORE_CONNECT_KEY_ID"],
            str(private_key_path),
            os.environ.get("APPSTORE_CONNECT_KEY_TYPE", "team").strip().lower(),
        )
        client = AppStoreClient(token)
        app = client.request("GET", f"/v1/apps/{env['APPSTORE_APP_ID']}")
        write_json(raw_dir / "app.json", app)

        requests_path = (
            f"/v1/apps/{env['APPSTORE_APP_ID']}/analyticsReportRequests?"
            + urllib.parse.urlencode(
                {
                    "filter[accessType]": "ONE_TIME_SNAPSHOT,ONGOING",
                    "fields[analyticsReportRequests]": "accessType,stoppedDueToInactivity",
                    "limit": "200",
                }
            )
        )
        report_requests = client.get_all(requests_path)
        write_json(raw_dir / "analytics_report_requests.json", report_requests)

        requests_data = report_requests.get("data", [])
        if not requests_data and args.create_missing:
            created = create_report_request(client, env["APPSTORE_APP_ID"], "ONE_TIME_SNAPSHOT")
            write_json(raw_dir / "created_analytics_report_request.json", created)
            requests_data = [created["data"]]
            metadata["warnings"].append(
                "Created a ONE_TIME_SNAPSHOT request; report files may not be available immediately."
            )
        elif not requests_data:
            metadata["warnings"].append(
                "No analytics report request exists for this app. Re-run with --create-missing if you want to create ONE_TIME_SNAPSHOT access."
            )

        for report_request in requests_data:
            request_id = report_request["id"]
            reports = client.get_all(f"/v1/analyticsReportRequests/{request_id}/reports?limit=200")
            write_json(raw_dir / f"reports-{safe_slug(request_id)}.json", reports)
            for report in reports.get("data", []):
                attrs = report.get("attributes", {})
                name = attrs.get("name") or ""
                category = attrs.get("category")
                if not report_matches(name, category):
                    continue
                report_id = report["id"]
                report_slug = safe_slug(name or report_id)
                metadata["reports_considered"].append(
                    {
                        "request_id": request_id,
                        "report_id": report_id,
                        "name": name,
                        "category": category,
                    }
                )
                instances = client.get_all(f"/v1/analyticsReports/{report_id}/instances?limit=200")
                write_json(raw_dir / f"instances-{report_slug}-{safe_slug(report_id)}.json", instances)
                matched_instances = selected_instances(instances.get("data", []), month)
                if not matched_instances:
                    metadata["warnings"].append(
                        f"No {month} instances found for App Store report `{name or report_id}`."
                    )
                    continue

                for instance in matched_instances:
                    instance_id = instance["id"]
                    segments = client.get_all(
                        f"/v1/analyticsReportInstances/{instance_id}/segments?limit=200"
                    )
                    write_json(raw_dir / f"segments-{safe_slug(instance_id)}.json", segments)
                    for index, segment in enumerate(segments.get("data", []), start=1):
                        url = segment_download_url(segment)
                        if not url:
                            metadata["warnings"].append(
                                f"Segment {segment.get('id')} for `{name or report_id}` has no download URL."
                            )
                            continue
                        filename = f"{report_slug}-{safe_slug(instance_id)}-{index}.txt.gz"
                        destination = raw_dir / "files" / filename
                        download_segment(url, destination)
                        metadata["segments_downloaded"].append(
                            {
                                "report_name": name,
                                "report_category": category,
                                "report_id": report_id,
                                "instance_id": instance_id,
                                "instance_processing_date": instance.get("attributes", {}).get(
                                    "processingDate"
                                ),
                                "instance_granularity": instance.get("attributes", {}).get(
                                    "granularity"
                                ),
                                "segment_id": segment.get("id"),
                                "path": str(destination.relative_to(raw_dir)),
                            }
                        )

    except urllib.error.HTTPError as error:
        body = error.read().decode("utf-8", errors="replace")
        metadata["warnings"].append(f"App Store Connect HTTP {error.code}: {body[:500]}")
        write_json(raw_dir / "_metadata.json", metadata)
        print(f"App Store Connect collection failed with HTTP {error.code}.")
        return 1
    except Exception as error:  # noqa: BLE001 - scripts persist failure in metadata.
        metadata["warnings"].append(f"App Store Connect collection failed: {type(error).__name__}")
        write_json(raw_dir / "_metadata.json", metadata)
        print(f"App Store Connect collection failed: {type(error).__name__}.")
        return 1

    write_json(raw_dir / "_metadata.json", metadata)
    print(
        f"Collected App Store Connect metadata for {month}; downloaded {len(metadata['segments_downloaded'])} segment(s)."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
