from __future__ import annotations

import gzip
import importlib.util
import io
import json
import os
import re
import subprocess
import sys
import tempfile
import unittest
from contextlib import redirect_stderr, redirect_stdout
from pathlib import Path
from types import ModuleType
from unittest import mock


REPOSITORY_ROOT = Path(__file__).resolve().parents[1]
SCRIPTS_DIR = REPOSITORY_ROOT / "skills" / "monthly-product-report" / "scripts"
sys.path.insert(0, str(SCRIPTS_DIR))


def load_script(module_name: str, filename: str) -> ModuleType:
    spec = importlib.util.spec_from_file_location(module_name, SCRIPTS_DIR / filename)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Could not load test module from {filename}.")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class ReportFragmentValidationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.render_report = load_script("render_report", "render-report.py")

    def test_existing_report_fragment_is_allowed(self) -> None:
        report_path = REPOSITORY_ROOT / "reports" / "2026-06" / "monthly-report.html"
        report = report_path.read_text(encoding="utf-8")
        fragment = report.split("<main>", 1)[1].split("</main>", 1)[0]

        replacements = {
            "retention-chart": '<div class="retention-trend"></div>',
            "failure-chart": '<div class="failure-trend"></div>',
        }
        for chart_id, placeholder in replacements.items():
            fragment, count = re.subn(
                rf'<figure class="trend-chart">(?:(?!</figure>).)*'
                rf'id="{chart_id}-title"(?:(?!</figure>).)*</figure>',
                placeholder,
                fragment,
                count=1,
                flags=re.DOTALL,
            )
            self.assertEqual(count, 1, f"Missing trusted {chart_id} output.")

        self.render_report.validate_fragment(fragment)

    def test_active_or_external_content_is_rejected(self) -> None:
        unsafe_fragments = [
            '<img src="https://example.com/track">',
            '<p onclick="alert(1)">x</p>',
            '<svg onload="alert(1)"></svg>',
            '<p><a href="javascript:alert(1)">x</a></p>',
            '<meta http-equiv="refresh" content="0;url=https://example.com">',
            '<p style="color:red">x</p>',
            '<div class="unknown">x</div>',
            '<!-- hidden -->',
        ]

        for fragment in unsafe_fragments:
            with self.subTest(fragment=fragment):
                with self.assertRaises(ValueError):
                    self.render_report.validate_fragment(fragment)

    def test_mismatched_or_unclosed_tags_are_rejected(self) -> None:
        for fragment in ["<section><p>x</section></p>", "<section><p>x</p>"]:
            with self.subTest(fragment=fragment):
                with self.assertRaises(ValueError):
                    self.render_report.validate_fragment(fragment)

    def test_report_layout_classes_and_progress_are_allowed(self) -> None:
        fragment = """
            <section>
              <p class="source-status">Sources</p>
              <div class="summary-grid">
                <article class="summary-metric">
                  <div class="metric-label">AI sessions</div>
                  <div class="metric-value">343</div>
                  <div class="metric-note">75 users</div>
                </article>
              </div>
              <div class="signal-grid">
                <article class="signal signal-positive">
                  <div class="signal-label">Positive</div>
                </article>
                <article class="signal signal-risk">
                  <div class="signal-label">Risk</div>
                </article>
              </div>
              <p class="section-intro">Section context</p>
              <div class="evidence-grid">
                <div class="evidence-column"><h3>Evidence one</h3></div>
                <div class="evidence-column"><h3>Evidence two</h3></div>
              </div>
              <div class="distribution-list">
                <div class="distribution-row">
                  <span class="distribution-label">Accepted</span>
                  <progress class="distribution-bar distribution-good" value="274" max="343" aria-label="Accepted AI sessions">79.88%</progress>
                  <span class="distribution-value">79.88%</span>
                </div>
              </div>
              <div class="decision-list">
                <article class="decision-item">
                  <span class="priority">P1</span>
                  <div class="decision-copy">
                    <p class="decision-meta">Verify next month</p>
                  </div>
                </article>
              </div>
              <div class="retention-trend"></div>
              <div class="failure-trend"></div>
            </section>
            <section class="appendix"><p>Appendix</p></section>
        """

        self.render_report.validate_fragment(fragment)

    def test_invalid_progress_attributes_are_rejected(self) -> None:
        invalid_fragments = [
            '<progress class="distribution-bar" max="10" aria-label="Usage">5</progress>',
            '<progress class="distribution-bar" value="5" aria-label="Usage">5</progress>',
            '<progress class="distribution-bar" value="-1" max="10" aria-label="Usage">-1</progress>',
            '<progress class="distribution-bar" value="5" max="0" aria-label="Usage">5</progress>',
            '<progress class="distribution-bar" value="11" max="10" aria-label="Usage">11</progress>',
            '<progress class="distribution-bar" value="nan" max="10" aria-label="Usage">NaN</progress>',
            '<progress class="distribution-bar" value="5" max="inf" aria-label="Usage">5</progress>',
            '<progress class="distribution-bar" value="1e999" max="1e999" aria-label="Usage">Huge</progress>',
            '<progress class="distribution-bar" value="5" max="10" aria-label="">5</progress>',
            '<progress class="distribution-good" value="5" max="10" aria-label="Usage">5</progress>',
            '<progress class="distribution-bar" value="5" max="10" aria-label="Usage" title="Extra">5</progress>',
            '<progress class="distribution-bar" value="5" value="6" max="10" aria-label="Usage">5</progress>',
        ]

        for fragment in invalid_fragments:
            with self.subTest(fragment=fragment):
                with self.assertRaises(ValueError):
                    self.render_report.validate_fragment(fragment)


class TrendChartRenderingTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.trend_charts = load_script("report_trend_charts", "report_trend_charts.py")

    def snapshot(self) -> dict[str, object]:
        return {
            "month": "2026-06",
            "metrics": {
                "posthog": {
                    "installation_retention": {
                        "cohorts": [
                            {
                                "cohort": "2026-03-01",
                                "users": 9,
                                "d1_rate": 0.222222,
                                "d1_mature": True,
                                "d7_rate": 0.111111,
                                "d7_mature": True,
                                "d30_rate": 0.111111,
                                "d30_mature": True,
                            },
                            {
                                "cohort": "2026-04-01",
                                "users": 111,
                                "d1_rate": 0.18018,
                                "d1_mature": True,
                                "d7_rate": 0.045045,
                                "d7_mature": True,
                                "d30_rate": 0.027027,
                                "d30_mature": True,
                            },
                            {
                                "cohort": "2026-05-01",
                                "users": 452,
                                "d1_rate": 0.181416,
                                "d1_mature": True,
                                "d7_rate": 0.035398,
                                "d7_mature": True,
                                "d30_rate": 0.00885,
                                "d30_mature": True,
                            },
                            {
                                "cohort": "2026-06-01",
                                "users": 242,
                                "d1_rate": 0.161157,
                                "d1_mature": True,
                                "d7_rate": 0.066116,
                                "d7_mature": True,
                                "d30_rate": None,
                                "d30_mature": False,
                            },
                            {
                                "cohort": "2026-07-01",
                                "users": 253,
                                "d1_rate": None,
                                "d1_mature": False,
                                "d7_rate": None,
                                "d7_mature": False,
                                "d30_rate": None,
                                "d30_mature": False,
                            },
                        ]
                    },
                    "ai_failures": {
                        "weekly": [
                            {"week": "2026-06-07", "failure_count": 26},
                            {"week": "2026-06-14", "failure_count": 49},
                            {"week": "2026-06-21", "failure_count": 94},
                            {"week": "2026-06-28", "failure_count": 33},
                        ]
                    },
                    "event_inventory": {
                        "events": [
                            {
                                "event": "ai_task_generation_failed",
                                "first_seen": "2026-06-11T09:20:53.412000Z",
                            }
                        ]
                    },
                }
            },
        }

    def test_retention_placeholder_renders_mature_target_month_series(self) -> None:
        result = self.trend_charts.render_trend_placeholders(
            '<div class="retention-trend"></div>',
            self.snapshot(),
            "2026-06",
        )

        self.assertIn('<svg class="trend-svg"', result)
        self.assertIn("次日回访率", result)
        self.assertIn("第 7 天回访率", result)
        self.assertIn("2026-06", result)
        self.assertNotIn("2026-07", result)
        self.assertNotIn("第 30 天回访率", result)
        self.assertNotIn("retention-trend", result)

    def test_failure_placeholder_marks_incomplete_boundary_weeks(self) -> None:
        result = self.trend_charts.render_trend_placeholders(
            '<div class="failure-trend"></div>',
            self.snapshot(),
            "2026-06",
        )

        self.assertIn("06-07*", result)
        self.assertIn("06-28*", result)
        self.assertIn("94", result)
        self.assertIn("星号表示该周数据覆盖不完整", result)
        self.assertNotIn("failure-trend", result)

    def test_trend_placeholders_must_be_empty(self) -> None:
        for fragment in [
            '<div class="retention-trend"><p>Injected</p></div>',
            '<div class="failure-trend">Injected</div>',
        ]:
            with self.subTest(fragment=fragment):
                with self.assertRaises(ValueError):
                    self.trend_charts.render_trend_placeholders(
                        fragment,
                        self.snapshot(),
                        "2026-06",
                    )

    def test_report_renderer_replaces_placeholders_from_month_snapshot(self) -> None:
        with tempfile.TemporaryDirectory(prefix="blotz-trend-render-test-") as temporary_dir:
            output_root = Path(temporary_dir) / "reports"
            report_dir = output_root / "2026-06"
            report_dir.mkdir(parents=True)
            (report_dir / "metrics-snapshot.json").write_text(
                json.dumps(self.snapshot()),
                encoding="utf-8",
            )
            content_path = Path(temporary_dir) / "content.html"
            content_path.write_text(
                '<section><div class="retention-trend"></div>'
                '<div class="failure-trend"></div></section>',
                encoding="utf-8",
            )

            subprocess.run(
                [
                    sys.executable,
                    str(SCRIPTS_DIR / "render-report.py"),
                    "--month",
                    "2026-06",
                    "--content-file",
                    str(content_path),
                    "--output-dir",
                    str(output_root),
                ],
                check=True,
                env={**os.environ, "PYTHONDONTWRITEBYTECODE": "1"},
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
            )

            report = (report_dir / "monthly-report.html").read_text(encoding="utf-8")
            self.assertEqual(report.count('<svg class="trend-svg"'), 2)
            self.assertNotIn('<div class="retention-trend">', report)
            self.assertNotIn('<div class="failure-trend">', report)


class ExistingReportEvidenceTests(unittest.TestCase):
    def test_failure_stage_and_error_code_are_separate_tables(self) -> None:
        report_path = REPOSITORY_ROOT / "reports" / "2026-06" / "monthly-report.html"
        report = report_path.read_text(encoding="utf-8")

        self.assertIn("<h3>错误码分布</h3>", report)
        self.assertNotIn(
            "<th>阶段</th><th>事件数</th><th>主要错误码</th>",
            report,
        )

    def test_legacy_input_mode_counts_are_not_presented_as_a_partition(self) -> None:
        report_path = REPOSITORY_ROOT / "reports" / "2026-06" / "monthly-report.html"
        report = report_path.read_text(encoding="utf-8")

        self.assertIn("两项可能重叠，不能作为输入方式构成比例", report)
        self.assertNotIn("语音占 62.97%", report)


class AppStoreNormalizationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.build_summary = load_script("build_summary", "build-summary.py")

    def run_normalizer(self, tsv: str | None = None) -> dict[str, object]:
        with tempfile.TemporaryDirectory(prefix="blotz-app-store-test-") as temporary_dir:
            work_root = Path(temporary_dir)
            raw_dir = work_root / "2026-06" / "raw" / "app-store"
            raw_dir.mkdir(parents=True)
            segments: list[dict[str, str]] = []
            if tsv is not None:
                segment_path = raw_dir / "files" / "downloads.txt.gz"
                segment_path.parent.mkdir(parents=True)
                with gzip.open(segment_path, "wt", encoding="utf-8", newline="") as handle:
                    handle.write(tsv)
                segments.append(
                    {
                        "report_name": "App Downloads Standard",
                        "report_id": "downloads-report",
                        "instance_id": "downloads-2026-06",
                        "instance_granularity": "MONTHLY",
                        "instance_processing_date": "2026-07-02",
                        "path": "files/downloads.txt.gz",
                    }
                )
            metadata = {"segments_downloaded": segments, "warnings": []}
            (raw_dir / "_metadata.json").write_text(
                json.dumps(metadata),
                encoding="utf-8",
            )
            environment = dict(os.environ)
            environment["BLOTZ_MONTHLY_WORK_DIR"] = temporary_dir
            environment["PYTHONDONTWRITEBYTECODE"] = "1"
            subprocess.run(
                [
                    sys.executable,
                    str(SCRIPTS_DIR / "normalize-app-store.py"),
                    "--month",
                    "2026-06",
                ],
                check=True,
                env=environment,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
            )
            summary_path = work_root / "2026-06" / "normalized" / "app_store_summary.json"
            result = json.loads(summary_path.read_text(encoding="utf-8"))
            if not isinstance(result, dict):
                raise AssertionError("App Store summary must be a JSON object.")
            return result

    def test_missing_metrics_remain_null_without_coverage(self) -> None:
        summary = self.run_normalizer()

        for name in [
            "downloads",
            "first_time_downloads",
            "redownloads",
            "app_updates",
            "restores",
        ]:
            with self.subTest(metric=name):
                self.assertIsNone(summary[name])
        self.assertEqual(
            summary["coverage"],
            {
                "downloads": False,
                "product_page_views": False,
                "product_page_gets": False,
            },
        )
        self.assertIsNone(summary["report_granularity"])

    def test_recognized_download_report_establishes_real_zeroes(self) -> None:
        summary = self.run_normalizer(
            "Date\tCounts\tDownload Type\tSource Type\tTerritory\n"
            "2026-06-03\t2\tFirst-Time Download\tApp Store search\tAU\n"
            "2026-06-04\t4\tAuto-Update\tApp Store search\tAU\n"
        )

        self.assertEqual(summary["downloads"], 2)
        self.assertEqual(summary["first_time_downloads"], 2)
        self.assertEqual(summary["redownloads"], 0)
        self.assertEqual(summary["app_updates"], 4)
        self.assertEqual(summary["restores"], 0)
        self.assertEqual(summary["coverage"]["downloads"], True)
        self.assertEqual(summary["report_granularity"], "Standard")
        self.assertEqual(
            summary["selected_instances"],
            [
                {
                    "report_name": "App Downloads Standard",
                    "report_id": "downloads-report",
                    "instance_id": "downloads-2026-06",
                    "granularity": "MONTHLY",
                    "processing_date": "2026-07-02",
                }
            ],
        )

    def test_source_status_uses_required_metric_coverage(self) -> None:
        metadata = {"segments_downloaded": [{}]}
        cases = [
            ({}, {}, False, "skipped"),
            (
                {
                    "coverage": {
                        "downloads": False,
                        "product_page_views": False,
                        "product_page_gets": False,
                    }
                },
                metadata,
                True,
                "failed",
            ),
            (
                {
                    "coverage": {
                        "downloads": True,
                        "product_page_views": False,
                        "product_page_gets": False,
                    }
                },
                metadata,
                True,
                "partial",
            ),
            (
                {
                    "coverage": {
                        "downloads": True,
                        "product_page_views": True,
                        "product_page_gets": True,
                    }
                },
                metadata,
                True,
                "ok",
            ),
        ]

        for summary, source_metadata, requested, expected in cases:
            with self.subTest(expected=expected):
                self.assertEqual(
                    self.build_summary.app_store_status(
                        summary,
                        source_metadata,
                        requested=requested,
                    ),
                    expected,
                )


class AppStoreInstanceSelectionTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.collect_app_store = load_script("collect_app_store", "collect-app-store.py")

    @staticmethod
    def instance(instance_id: str, granularity: str, **dates: str) -> dict[str, object]:
        return {
            "id": instance_id,
            "attributes": {"granularity": granularity, **dates},
        }

    def test_monthly_instances_take_priority_without_mixing_granularities(self) -> None:
        instances = [
            self.instance("daily-1", "DAILY", date="2026-06-01"),
            self.instance("monthly", "MONTHLY", startDate="2026-06-01"),
            self.instance("weekly", "WEEKLY", startDate="2026-06-02"),
            self.instance("daily-2", "DAILY", date="2026-06-02"),
        ]

        selected = self.collect_app_store.selected_instances(instances, "2026-06")

        self.assertEqual([item["id"] for item in selected], ["monthly"])

    def test_all_target_month_daily_instances_are_used_when_monthly_is_absent(self) -> None:
        instances = [
            self.instance("weekly", "WEEKLY", startDate="2026-06-02"),
            self.instance("daily-1", "DAILY", date="2026-06-01"),
            self.instance("daily-2", "DAILY", date="2026-06-02"),
        ]

        selected = self.collect_app_store.selected_instances(instances, "2026-06")

        self.assertEqual(
            [item["id"] for item in selected],
            ["daily-1", "daily-2"],
        )

    def test_out_of_month_high_priority_instance_is_not_selected(self) -> None:
        instances = [
            self.instance("may-monthly", "MONTHLY", startDate="2026-05-01"),
            self.instance("june-daily", "DAILY", date="2026-06-08"),
        ]

        selected = self.collect_app_store.selected_instances(instances, "2026-06")

        self.assertEqual([item["id"] for item in selected], ["june-daily"])

    def test_latest_processing_version_wins_for_the_same_month(self) -> None:
        instances = [
            self.instance(
                "monthly-old",
                "MONTHLY",
                startDate="2026-06-01",
                processingDate="2026-07-01",
            ),
            self.instance(
                "monthly-new",
                "MONTHLY",
                startDate="2026-06-01",
                processingDate="2026-07-03",
            ),
        ]

        selected = self.collect_app_store.selected_instances(instances, "2026-06")

        self.assertEqual([item["id"] for item in selected], ["monthly-new"])

    def test_daily_instances_are_deduplicated_per_day(self) -> None:
        instances = [
            self.instance(
                "day-1-old",
                "DAILY",
                date="2026-06-01",
                processingDate="2026-06-02",
            ),
            self.instance(
                "day-1-new",
                "DAILY",
                date="2026-06-01",
                processingDate="2026-06-03",
            ),
            self.instance(
                "day-2",
                "DAILY",
                date="2026-06-02",
                processingDate="2026-06-03",
            ),
        ]

        selected = self.collect_app_store.selected_instances(instances, "2026-06")

        self.assertEqual(
            [item["id"] for item in selected],
            ["day-1-new", "day-2"],
        )


class AiFailureNormalizationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.collect_posthog = load_script("collect_posthog", "collect-posthog.py")

    def test_query_groups_failure_stage_and_error_code_together(self) -> None:
        query = self.collect_posthog.query_definitions(
            "2026-06-01 00:00:00",
            "2026-07-01 00:00:00",
        )["ai_failures_by_stage_and_error_code"]

        self.assertIn("GROUP BY stage, error_code", " ".join(query.split()))

    def test_joint_failure_distribution_reaches_normalized_summary(self) -> None:
        with tempfile.TemporaryDirectory(prefix="blotz-posthog-test-") as temporary_dir:
            work_root = Path(temporary_dir)
            raw_dir = work_root / "2026-06" / "raw" / "posthog"
            raw_dir.mkdir(parents=True)
            raw_results = {
                "ai_failures_summary": [[3, 2]],
                "ai_failures_by_stage": [["generation", 2], ["send", 1]],
                "ai_failures_by_error_code": [["NoTasksExtracted", 2], ["NetworkError", 1]],
                "ai_failures_by_stage_and_error_code": [
                    ["generation", "NoTasksExtracted", 2],
                    ["send", "NetworkError", 1],
                ],
                "ai_failures_weekly": [["2026-06-01", 3, 2]],
            }
            for name, results in raw_results.items():
                payload = {"_collection_status": "ok", "results": results}
                (raw_dir / f"{name}.json").write_text(
                    json.dumps(payload),
                    encoding="utf-8",
                )
            (raw_dir / "_metadata.json").write_text(
                json.dumps({"queries": []}),
                encoding="utf-8",
            )
            environment = dict(os.environ)
            environment["BLOTZ_MONTHLY_WORK_DIR"] = temporary_dir
            environment["PYTHONDONTWRITEBYTECODE"] = "1"
            subprocess.run(
                [
                    sys.executable,
                    str(SCRIPTS_DIR / "normalize-posthog.py"),
                    "--month",
                    "2026-06",
                ],
                check=True,
                env=environment,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
            )
            summary_path = work_root / "2026-06" / "normalized" / "posthog_summary.json"
            summary = json.loads(summary_path.read_text(encoding="utf-8"))

        self.assertEqual(
            summary["ai_failures"]["by_stage_and_error_code"],
            [
                {"stage": "generation", "error_code": "NoTasksExtracted", "count": 2},
                {"stage": "send", "error_code": "NetworkError", "count": 1},
            ],
        )


class AiInputModeNormalizationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.collect_posthog = load_script("collect_posthog_modes", "collect-posthog.py")
        cls.normalize_posthog = load_script("normalize_posthog_modes", "normalize-posthog.py")

    def test_query_returns_four_mutually_exclusive_input_mode_buckets(self) -> None:
        query = self.collect_posthog.query_definitions(
            "2026-06-01 00:00:00",
            "2026-07-01 00:00:00",
        )["ai_sessions_input_modes"]
        normalized_query = " ".join(query.split())

        for alias in [
            "voice_only_session_count",
            "text_only_session_count",
            "mixed_input_session_count",
            "unknown_input_mode_session_count",
        ]:
            with self.subTest(alias=alias):
                self.assertIn(f"AS {alias}", normalized_query)

    def test_normalizer_preserves_exclusive_and_compatible_mode_counts(self) -> None:
        raw_queries = {
            "ai_sessions_outcomes": {"_collection_status": "ok", "results": []},
            "ai_sessions_totals": {
                "_collection_status": "ok",
                "results": [[10, 4, 5, 2, 3]],
            },
            "ai_sessions_input_modes": {
                "_collection_status": "ok",
                "results": [[4, 3, 2, 1]],
            },
            "ai_sessions_turn_metrics": {
                "_collection_status": "ok",
                "results": [[1.2, 1.5, 0.2]],
            },
        }
        warnings: list[str] = []
        with tempfile.TemporaryDirectory(prefix="blotz-input-mode-test-") as temporary_dir:
            with mock.patch.object(
                self.normalize_posthog,
                "raw_query",
                side_effect=lambda month, name: raw_queries[name],
            ):
                summary = self.normalize_posthog.normalize_ai_sessions(
                    "2026-06",
                    Path(temporary_dir),
                    warnings,
                )

        self.assertEqual(summary["voice_only_session_count"], 4)
        self.assertEqual(summary["text_only_session_count"], 3)
        self.assertEqual(summary["mixed_input_session_count"], 2)
        self.assertEqual(summary["unknown_input_mode_session_count"], 1)
        self.assertEqual(summary["voice_session_count"], 6)
        self.assertEqual(summary["text_session_count"], 5)
        self.assertEqual(
            sum(
                summary[name]
                for name in [
                    "voice_only_session_count",
                    "text_only_session_count",
                    "mixed_input_session_count",
                    "unknown_input_mode_session_count",
                ]
            ),
            summary["session_count"],
        )
        self.assertEqual(len(warnings), 1)
        self.assertIn("1", warnings[0])

    def test_failed_input_mode_query_keeps_all_mode_counts_unavailable(self) -> None:
        raw_queries = {
            "ai_sessions_outcomes": {"_collection_status": "ok", "results": []},
            "ai_sessions_totals": {
                "_collection_status": "ok",
                "results": [[10, 4, 5, 2, 3]],
            },
            "ai_sessions_input_modes": {
                "_collection_status": "failed",
                "reason": "fixture failure",
            },
            "ai_sessions_turn_metrics": {
                "_collection_status": "ok",
                "results": [[1.2, 1.5, 0.2]],
            },
        }
        warnings: list[str] = []
        with tempfile.TemporaryDirectory(prefix="blotz-input-mode-test-") as temporary_dir:
            with mock.patch.object(
                self.normalize_posthog,
                "raw_query",
                side_effect=lambda month, name: raw_queries[name],
            ):
                summary = self.normalize_posthog.normalize_ai_sessions(
                    "2026-06",
                    Path(temporary_dir),
                    warnings,
                )

        for name in [
            "voice_session_count",
            "text_session_count",
            "voice_only_session_count",
            "text_only_session_count",
            "mixed_input_session_count",
            "unknown_input_mode_session_count",
        ]:
            with self.subTest(metric=name):
                self.assertIsNone(summary[name])
        self.assertEqual(len(warnings), 1)


class NoteNormalizationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.normalize_posthog = load_script("normalize_posthog_notes", "normalize-posthog.py")

    def normalize_notes(
        self, results: list[list[object]] | None
    ) -> tuple[dict[str, object], list[str]]:
        raw = (
            {"_collection_status": "ok", "results": results}
            if results is not None
            else {"_collection_status": "failed", "reason": "fixture failure"}
        )
        warnings: list[str] = []
        with tempfile.TemporaryDirectory(prefix="blotz-notes-test-") as temporary_dir:
            with mock.patch.object(self.normalize_posthog, "raw_query", return_value=raw):
                summary = self.normalize_posthog.normalize_notes(
                    "2026-06",
                    Path(temporary_dir),
                    warnings,
                )
        return summary, warnings

    def test_known_note_sources_produce_complete_ai_share(self) -> None:
        summary, warnings = self.normalize_notes(
            [["manual", 3, 2], ["ai", 1, 1]]
        )

        self.assertEqual(
            summary,
            {
                "created_count": 4,
                "manual_created_count": 3,
                "ai_created_count": 1,
                "unknown_created_count": 0,
                "ai_share": 0.25,
            },
        )
        self.assertEqual(warnings, [])

    def test_unknown_note_sources_are_counted_but_disable_ai_share(self) -> None:
        summary, warnings = self.normalize_notes(
            [["manual", 3, 2], ["ai", 1, 1], [None, 4, 3], ["import", 2, 1]]
        )

        self.assertEqual(summary["created_count"], 10)
        self.assertEqual(summary["manual_created_count"], 3)
        self.assertEqual(summary["ai_created_count"], 1)
        self.assertEqual(summary["unknown_created_count"], 6)
        self.assertIsNone(summary["ai_share"])
        self.assertEqual(len(warnings), 1)
        self.assertIn("6", warnings[0])

    def test_successful_empty_note_query_produces_real_zeroes(self) -> None:
        summary, warnings = self.normalize_notes([])

        self.assertEqual(summary["created_count"], 0)
        self.assertEqual(summary["manual_created_count"], 0)
        self.assertEqual(summary["ai_created_count"], 0)
        self.assertEqual(summary["unknown_created_count"], 0)
        self.assertIsNone(summary["ai_share"])
        self.assertEqual(warnings, [])

    def test_failed_note_query_keeps_every_metric_unavailable(self) -> None:
        summary, warnings = self.normalize_notes(None)

        self.assertEqual(
            summary,
            {
                "created_count": None,
                "manual_created_count": None,
                "ai_created_count": None,
                "unknown_created_count": None,
                "ai_share": None,
            },
        )
        self.assertEqual(len(warnings), 1)


class LoginFunnelNormalizationTests(unittest.TestCase):
    HAPPY_USERS = [[210, 168, 113, 91, 55]]
    HAPPY_ATTEMPTS = [[429, 189, 192, 150, 42]]
    # succeeded_after_failure, error, exit_only, no_outcome: 2 + 38 + 15 == 168 - 113
    HAPPY_OUTCOMES = [[51, 2, 38, 15]]
    # Deliberately unsorted, with two error codes sharing `auth0_error`, so the
    # normalizer's sort and per-reason aggregation are both exercised.
    HAPPY_FAILURES = [
        ["NoTokensReturned", "no_tokens", 12],
        ["NETWORK_ERROR", "auth0_error", 18],
        ["USER_CANCELLED", "cancelled", 120],
        ["ACCESS_DENIED", "auth0_error", 12],
        ["BROWSER_TERMINATED", "browser_dismissed", 30],
    ]
    FAILED_QUERY = {"_collection_status": "failed", "reason": "fixture failure"}

    @classmethod
    def setUpClass(cls) -> None:
        cls.collect_posthog = load_script("collect_posthog_login", "collect-posthog.py")
        cls.normalize_posthog = load_script("normalize_posthog_login", "normalize-posthog.py")
        cls.build_summary = load_script("build_summary_login", "build-summary.py")

    @staticmethod
    def ok(results: list[list[object]]) -> dict[str, object]:
        return {"_collection_status": "ok", "results": results}

    def normalize_login_funnel(
        self,
        users: dict[str, object],
        attempts: dict[str, object],
        failures: dict[str, object],
        outcomes: dict[str, object] | None = None,
    ) -> tuple[dict[str, object], list[str]]:
        raw_queries = {
            "login_funnel_users": users,
            "login_attempts_summary": attempts,
            "login_failures_by_error_code": failures,
            "login_outcomes_by_user": outcomes if outcomes is not None else self.ok(self.HAPPY_OUTCOMES),
        }
        warnings: list[str] = []
        with tempfile.TemporaryDirectory(prefix="blotz-login-funnel-test-") as temporary_dir:
            with mock.patch.object(
                self.normalize_posthog,
                "raw_query",
                side_effect=lambda month, name: raw_queries[name],
            ):
                summary = self.normalize_posthog.normalize_login_funnel(
                    "2026-08",
                    Path(temporary_dir),
                    warnings,
                )
        return summary, warnings

    def test_queries_split_user_exits_from_errors_and_group_by_person(self) -> None:
        queries = self.collect_posthog.query_definitions(
            "2026-08-01 00:00:00",
            "2026-09-01 00:00:00",
        )
        attempts_query = " ".join(queries["login_attempts_summary"].split())
        users_query = " ".join(queries["login_funnel_users"].split())

        self.assertIn(
            "properties.reason IN ('cancelled', 'browser_dismissed')) AS user_exit_attempts",
            attempts_query,
        )
        self.assertIn(
            "properties.reason IN ('no_tokens', 'auth0_error')) AS error_attempts",
            attempts_query,
        )
        self.assertIn("GROUP BY person_id", users_query)
        self.assertIn("properties.screen_name = 'SignIn'", users_query)

        outcomes_query = " ".join(queries["login_outcomes_by_user"].split())
        self.assertIn("HAVING starts > 0", outcomes_query)
        self.assertIn("countIf(successes = 0 AND error_failures > 0) AS error_users", outcomes_query)
        self.assertIn(
            "countIf(successes = 0 AND error_failures = 0 AND exit_failures > 0) AS exit_only_users",
            outcomes_query,
        )
        self.assertIn("countIf(successes = 0 AND failures = 0) AS no_outcome_users", outcomes_query)

    def test_happy_path_produces_ratios_and_reason_split(self) -> None:
        summary, warnings = self.normalize_login_funnel(
            self.ok(self.HAPPY_USERS),
            self.ok(self.HAPPY_ATTEMPTS),
            self.ok(self.HAPPY_FAILURES),
        )

        self.assertEqual(
            summary,
            {
                "sign_in_screen_users": 210,
                "started_users": 168,
                "succeeded_users": 113,
                "failed_users": 91,
                "failed_only_users": 55,
                "sign_in_to_started_ratio": 0.8,
                "started_to_succeeded_ratio": 0.672619,
                "steps_monotonic": True,
                "is_strict_funnel": False,
                "succeeded_after_failure_users": 51,
                "not_succeeded_users": 55,
                "exit_only_users": 38,
                "error_users": 2,
                "no_outcome_users": 15,
                "exit_only_user_ratio": 0.22619,
                "error_user_ratio": 0.011905,
                "no_outcome_user_ratio": 0.089286,
                "started_attempts": 429,
                "succeeded_attempts": 189,
                "failed_attempts": 192,
                "user_exit_attempts": 150,
                "error_attempts": 42,
                "unknown_reason_attempts": 0,
                "unresolved_attempts": 48,
                "attempt_success_rate": 0.440559,
                "user_exit_rate": 0.34965,
                "error_rate": 0.097902,
                "unresolved_rate": 0.111888,
                "by_reason": [
                    {"reason": "cancelled", "category": "user_exit", "count": 120},
                    {"reason": "auth0_error", "category": "error", "count": 30},
                    {"reason": "browser_dismissed", "category": "user_exit", "count": 30},
                    {"reason": "no_tokens", "category": "error", "count": 12},
                ],
                "by_error_code": [
                    {
                        "error_code": "USER_CANCELLED",
                        "reason": "cancelled",
                        "category": "user_exit",
                        "count": 120,
                    },
                    {
                        "error_code": "BROWSER_TERMINATED",
                        "reason": "browser_dismissed",
                        "category": "user_exit",
                        "count": 30,
                    },
                    {
                        "error_code": "NETWORK_ERROR",
                        "reason": "auth0_error",
                        "category": "error",
                        "count": 18,
                    },
                    {
                        "error_code": "ACCESS_DENIED",
                        "reason": "auth0_error",
                        "category": "error",
                        "count": 12,
                    },
                    {
                        "error_code": "NoTokensReturned",
                        "reason": "no_tokens",
                        "category": "error",
                        "count": 12,
                    },
                ],
            },
        )
        self.assertEqual(warnings, [])

    def test_unknown_reason_is_counted_and_warned(self) -> None:
        summary, warnings = self.normalize_login_funnel(
            self.ok(self.HAPPY_USERS),
            self.ok([[429, 189, 192, 150, 40]]),
            self.ok(self.HAPPY_FAILURES),
        )

        self.assertEqual(summary["unknown_reason_attempts"], 2)
        self.assertEqual(summary["error_attempts"], 40)
        self.assertEqual(len(warnings), 1)
        self.assertIn("unsupported or missing reason", warnings[0])

    def test_more_outcomes_than_starts_disables_unresolved(self) -> None:
        summary, warnings = self.normalize_login_funnel(
            self.ok(self.HAPPY_USERS),
            self.ok([[100, 60, 50, 40, 10]]),
            self.ok(self.HAPPY_FAILURES),
        )

        self.assertIsNone(summary["unresolved_attempts"])
        self.assertIsNone(summary["unresolved_rate"])
        self.assertEqual(summary["attempt_success_rate"], 0.6)
        self.assertEqual(len(warnings), 1)
        self.assertIn("more login outcomes", warnings[0])

    def test_successful_empty_queries_produce_real_zeroes(self) -> None:
        summary, warnings = self.normalize_login_funnel(self.ok([]), self.ok([]), self.ok([]), self.ok([]))

        for key in [
            "sign_in_screen_users",
            "started_users",
            "succeeded_users",
            "failed_users",
            "failed_only_users",
            "succeeded_after_failure_users",
            "not_succeeded_users",
            "exit_only_users",
            "error_users",
            "no_outcome_users",
            "started_attempts",
            "succeeded_attempts",
            "failed_attempts",
            "user_exit_attempts",
            "error_attempts",
            "unknown_reason_attempts",
            "unresolved_attempts",
        ]:
            with self.subTest(key=key):
                self.assertEqual(summary[key], 0)
        for key in [
            "sign_in_to_started_ratio",
            "started_to_succeeded_ratio",
            "attempt_success_rate",
            "user_exit_rate",
            "error_rate",
            "unresolved_rate",
            "exit_only_user_ratio",
            "error_user_ratio",
            "no_outcome_user_ratio",
        ]:
            with self.subTest(key=key):
                self.assertIsNone(summary[key])
        self.assertIs(summary["steps_monotonic"], True)
        self.assertEqual(summary["by_reason"], [])
        self.assertEqual(summary["by_error_code"], [])
        self.assertEqual(warnings, [])

    def test_failed_queries_keep_every_metric_unavailable(self) -> None:
        summary, warnings = self.normalize_login_funnel(
            self.FAILED_QUERY,
            self.FAILED_QUERY,
            self.FAILED_QUERY,
            self.FAILED_QUERY,
        )

        for key, value in summary.items():
            with self.subTest(key=key):
                if key == "is_strict_funnel":
                    self.assertIs(value, False)
                elif key in ("by_reason", "by_error_code"):
                    self.assertEqual(value, [])
                else:
                    self.assertIsNone(value)
        self.assertEqual(len(warnings), 4)

    def test_non_monotonic_steps_disable_user_ratios_and_warn(self) -> None:
        summary, warnings = self.normalize_login_funnel(
            self.ok([[100, 120, 130, 10, 5]]),
            self.ok(self.HAPPY_ATTEMPTS),
            self.ok(self.HAPPY_FAILURES),
        )

        self.assertIs(summary["steps_monotonic"], False)
        self.assertIsNone(summary["sign_in_to_started_ratio"])
        self.assertIsNone(summary["started_to_succeeded_ratio"])
        self.assertEqual(summary["attempt_success_rate"], 0.440559)
        # Non-monotonic steps also make the per-user outcome partition impossible.
        self.assertEqual(len(warnings), 2)
        self.assertIn("not monotonic", warnings[0])
        self.assertIn("do not partition", warnings[1])
        self.assertIsNone(summary["exit_only_user_ratio"])

    def test_user_outcomes_that_do_not_partition_non_succeeded_users_warn_and_drop_ratios(self) -> None:
        summary, warnings = self.normalize_login_funnel(
            self.ok(self.HAPPY_USERS),
            self.ok(self.HAPPY_ATTEMPTS),
            self.ok(self.HAPPY_FAILURES),
            self.ok([[51, 2, 30, 15]]),
        )

        self.assertEqual(summary["not_succeeded_users"], 55)
        self.assertEqual(summary["exit_only_users"], 30)
        self.assertIsNone(summary["exit_only_user_ratio"])
        self.assertIsNone(summary["error_user_ratio"])
        self.assertIsNone(summary["no_outcome_user_ratio"])
        self.assertEqual(summary["started_to_succeeded_ratio"], 0.672619)
        self.assertEqual(len(warnings), 1)
        self.assertIn("do not partition", warnings[0])

    def test_summary_keys_match_empty_posthog_defaults(self) -> None:
        summary, _ = self.normalize_login_funnel(
            self.FAILED_QUERY,
            self.FAILED_QUERY,
            self.FAILED_QUERY,
            self.FAILED_QUERY,
        )

        self.assertEqual(
            set(summary),
            set(self.build_summary.EMPTY_POSTHOG["login_funnel"]),
        )


class SourceExecutionStatusTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.build_summary = load_script("build_summary_status", "build-summary.py")
        cls.collect_posthog = load_script("collect_posthog_status", "collect-posthog.py")
        cls.run_report = load_script("run_report", "run.py")

    def test_unrequested_source_is_skipped_but_requested_missing_source_failed(self) -> None:
        self.assertEqual(
            self.build_summary.posthog_status({}, {}, requested=False),
            "skipped",
        )
        self.assertEqual(
            self.build_summary.posthog_status({}, {}, requested=True),
            "failed",
        )
        self.assertEqual(
            self.build_summary.app_store_status({}, {}, requested=False),
            "skipped",
        )
        self.assertEqual(
            self.build_summary.app_store_status({}, {}, requested=True),
            "failed",
        )

    def test_posthog_status_reflects_query_coverage(self) -> None:
        summary = {"activity": {"mau": 10}}
        cases = [
            ([{"status": "ok"}, {"status": "ok"}], "ok"),
            ([{"status": "ok"}, {"status": "failed"}], "partial"),
            ([{"status": "failed"}, {"status": "failed"}], "failed"),
            ([], "failed"),
        ]

        for queries, expected in cases:
            with self.subTest(expected=expected):
                self.assertEqual(
                    self.build_summary.posthog_status(
                        summary,
                        {"queries": queries},
                        requested=True,
                    ),
                    expected,
                )

    def test_posthog_collector_marks_all_query_failures_as_failed(self) -> None:
        self.assertEqual(
            self.collect_posthog.query_collection_status(
                [{"status": "failed"}, {"status": "failed"}]
            ),
            "failed",
        )
        self.assertEqual(
            self.collect_posthog.query_collection_status(
                [{"status": "ok"}, {"status": "failed"}]
            ),
            "partial",
        )
        self.assertEqual(
            self.collect_posthog.query_collection_status(
                [{"status": "ok"}, {"status": "ok"}]
            ),
            "ok",
        )

    def test_run_succeeds_only_when_a_requested_source_is_usable(self) -> None:
        cases = [
            ("all", {"posthog": "failed", "app_store_connect": "failed"}, False),
            ("all", {"posthog": "partial", "app_store_connect": "failed"}, True),
            ("posthog", {"posthog": "ok", "app_store_connect": "skipped"}, True),
            ("posthog", {"posthog": "failed", "app_store_connect": "ok"}, False),
            ("app-store", {"posthog": "ok", "app_store_connect": "partial"}, True),
        ]

        for sources, statuses, expected in cases:
            with self.subTest(sources=sources, statuses=statuses):
                self.assertEqual(
                    self.run_report.has_usable_requested_source(sources, statuses),
                    expected,
                )

    def test_run_writes_diagnostic_snapshot_before_returning_source_status(self) -> None:
        cases = [
            ({"posthog": "failed", "app_store_connect": "failed"}, 1),
            ({"posthog": "partial", "app_store_connect": "failed"}, 0),
        ]

        for statuses, expected_exit_code in cases:
            with self.subTest(statuses=statuses):
                with tempfile.TemporaryDirectory(prefix="blotz-run-test-") as output_dir:
                    build_summary_args: list[list[str] | None] = []

                    def fake_run_step(
                        script_name: str,
                        month: str,
                        environment: dict[str, str],
                        extra_args: list[str] | None = None,
                    ) -> bool:
                        if script_name != "build-summary.py":
                            return True
                        build_summary_args.append(extra_args)
                        work_dir = Path(environment["BLOTZ_MONTHLY_WORK_DIR"]) / month
                        normalized_dir = work_dir / "normalized"
                        normalized_dir.mkdir(parents=True, exist_ok=True)
                        (normalized_dir / "monthly_metrics_summary.json").write_text(
                            json.dumps({"month": month, "app_store": {}, "posthog": {}}),
                            encoding="utf-8",
                        )
                        (work_dir / "manifest.json").write_text(
                            json.dumps(
                                {
                                    "sources": {
                                        name: {"status": status}
                                        for name, status in statuses.items()
                                    }
                                }
                            ),
                            encoding="utf-8",
                        )
                        (work_dir / "data-quality.json").write_text(
                            json.dumps({"checks": []}),
                            encoding="utf-8",
                        )
                        return True

                    argv = [
                        "run.py",
                        "--month",
                        "2026-06",
                        "--output-dir",
                        output_dir,
                    ]
                    with (
                        mock.patch.object(self.run_report, "run_step", side_effect=fake_run_step),
                        mock.patch.object(sys, "argv", argv),
                        redirect_stdout(io.StringIO()),
                        redirect_stderr(io.StringIO()),
                    ):
                        exit_code = self.run_report.main()

                    snapshot_path = Path(output_dir) / "2026-06" / "metrics-snapshot.json"
                    self.assertTrue(snapshot_path.exists())
                    self.assertEqual(build_summary_args, [["--sources", "all"]])
                    self.assertEqual(exit_code, expected_exit_code)

    def test_build_summary_omits_checks_for_unrequested_sources(self) -> None:
        cases = [
            ("posthog", "app_store_connect", "app_store_data_present"),
            ("app-store", "posthog", "posthog_activity_events_present"),
        ]

        for sources, skipped_source, omitted_check in cases:
            with self.subTest(sources=sources):
                with tempfile.TemporaryDirectory(prefix="blotz-summary-test-") as temporary_dir:
                    environment = dict(os.environ)
                    environment["BLOTZ_MONTHLY_WORK_DIR"] = temporary_dir
                    environment["PYTHONDONTWRITEBYTECODE"] = "1"
                    subprocess.run(
                        [
                            sys.executable,
                            str(SCRIPTS_DIR / "build-summary.py"),
                            "--month",
                            "2026-06",
                            "--sources",
                            sources,
                        ],
                        check=True,
                        env=environment,
                        stdout=subprocess.PIPE,
                        stderr=subprocess.PIPE,
                        text=True,
                    )
                    work_dir = Path(temporary_dir) / "2026-06"
                    manifest = json.loads(
                        (work_dir / "manifest.json").read_text(encoding="utf-8")
                    )
                    data_quality = json.loads(
                        (work_dir / "data-quality.json").read_text(encoding="utf-8")
                    )

                self.assertEqual(manifest["sources"][skipped_source]["status"], "skipped")
                self.assertEqual(manifest["sources"][skipped_source]["warnings"], [])
                self.assertNotIn(
                    omitted_check,
                    [item["name"] for item in data_quality["checks"]],
                )


if __name__ == "__main__":
    unittest.main()
