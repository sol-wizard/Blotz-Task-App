"use client";

import { useEffect, useState } from "react";
import type { QualityCheckCaseSummary, QualityCheckScorecard } from "@/types/quality-check";
import { LoadingState } from "@/components/quality-check-dashboard/loading-state";
import { ErrorBanner } from "@/components/quality-check-dashboard/error-banner";
import { SummaryBar } from "@/components/quality-check-dashboard/summary-bar";
import { ScorecardView } from "@/components/quality-check-dashboard/scorecard-view";
import { CasePicker } from "@/components/quality-check-dashboard/case-picker";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5027";
const RELIABILITY_RUNS = 3;
// Tokens one run of each case used last time, so the buttons can show the cost before a click.
const TOKENS_PER_CASE_KEY = "quality-check-tokens-per-case";

const readTokensPerCase = (): Record<string, number> => {
  try {
    const raw = localStorage.getItem(TOKENS_PER_CASE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, number>) : {};
  } catch {
    return {};
  }
};

// Cases with no history are estimated at the average of the ones we have seen.
const estimateTokens = (ids: string[], perCase: Record<string, number>) => {
  const known = Object.values(perCase);
  if (known.length === 0) return null;
  const average = known.reduce((sum, n) => sum + n, 0) / known.length;
  return ids.reduce((sum, id) => sum + (perCase[id] ?? average), 0);
};

const formatTokens = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : `${Math.max(1, Math.round(n / 1000))}k`;

export default function QualityCheckDashboard() {
  const [scorecard, setScorecard] = useState<QualityCheckScorecard | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMode, setLoadingMode] = useState<"single" | "reliability">("single");
  const [error, setError] = useState<string | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [cases, setCases] = useState<QualityCheckCaseSummary[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [tokensPerCase, setTokensPerCase] = useState<Record<string, number>>({});

  useEffect(() => {
    setTokensPerCase(readTokensPerCase());
    fetch(`${API_URL}/dev/ai-quality-check/cases`)
      .then((res) => {
        if (!res.ok) throw new Error(`Backend returned ${res.status}: ${res.statusText}`);
        return res.json() as Promise<QualityCheckCaseSummary[]>;
      })
      .then((data) => {
        setCases(data);
        setSelected(new Set(data.map((c) => c.id)));
      })
      .catch((err) =>
        setError(`Could not load the case list: ${err instanceof Error ? err.message : "Unknown error"}`),
      );
  }, []);

  const isReliabilityMode =
    (scorecard?.results[0]?.totalRuns ?? 1) > 1;

  const selectedIds = cases.filter((c) => selected.has(c.id)).map((c) => c.id);
  // If the case list failed to load, fall back to running every case.
  const nothingSelected = cases.length > 0 && selectedIds.length === 0;
  const estimate = selectedIds.length > 0 ? estimateTokens(selectedIds, tokensPerCase) : null;
  const failedIds = scorecard?.results.filter((r) => !r.passed).map((r) => r.id) ?? [];

  const rememberTokens = (data: QualityCheckScorecard) => {
    const next = { ...tokensPerCase };
    for (const result of data.results) {
      if (result.totalTokens > 0) next[result.id] = Math.round(result.totalTokens / (result.totalRuns ?? 1));
    }
    setTokensPerCase(next);
    try {
      localStorage.setItem(TOKENS_PER_CASE_KEY, JSON.stringify(next));
    } catch {
      // Storage can be unavailable (private window); the estimate just resets next visit.
    }
  };

  const runQualityCheck = async (reliabilityRuns = 1) => {
    setLoading(true);
    setLoadingMode(reliabilityRuns > 1 ? "reliability" : "single");
    setError(null);
    setScorecard(null);
    setExpandedRows(new Set());

    try {
      const res = await fetch(`${API_URL}/dev/ai-quality-check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          reliabilityRuns,
          // Omitted when every case is ticked, so the backend runs the whole file.
          caseIds: selectedIds.length < cases.length ? selectedIds : undefined,
        }),
      });
      if (!res.ok) {
        throw new Error(`Backend returned ${res.status}: ${res.statusText}`);
      }
      const data: QualityCheckScorecard = await res.json();
      setScorecard(data);
      rememberTokens(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <main className="flex-1 p-6 max-w-5xl mx-auto w-full font-[family-name:var(--font-geist-sans)]">
      <header className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">AI Accuracy Dashboard</h1>
          <p className="text-sm text-zinc-400 mt-1">{API_URL}/dev/ai-quality-check</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => runQualityCheck(1)}
            disabled={loading || nothingSelected}
            title={estimate === null ? "The cost estimate appears after the first run" : undefined}
            className={`rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              !isReliabilityMode && scorecard
                ? "bg-emerald-500 ring-2 ring-emerald-400 ring-offset-2 ring-offset-zinc-950"
                : "bg-emerald-600 hover:bg-emerald-500"
            }`}
          >
            {loading && loadingMode === "single" ? "Checking..." : "Check AI Accuracy"}
            {estimate !== null && (
              <span className="ml-2 font-normal text-emerald-100/80">≈{formatTokens(estimate)} tokens</span>
            )}
          </button>
          <button
            type="button"
            onClick={() => runQualityCheck(RELIABILITY_RUNS)}
            disabled={loading || nothingSelected}
            title={`Run each selected case ${RELIABILITY_RUNS} times in parallel to measure reliability. Use it for the final numbers, not while tuning.`}
            className={`rounded-lg border px-5 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              isReliabilityMode
                ? "border-violet-600 bg-violet-700 text-white ring-2 ring-violet-400 ring-offset-2 ring-offset-zinc-950"
                : "border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white"
            }`}
          >
            {loading && loadingMode === "reliability" ? `Running ${RELIABILITY_RUNS}×...` : `Run ${RELIABILITY_RUNS}×`}
            {estimate !== null && (
              <span className="ml-2 font-normal opacity-80">≈{formatTokens(estimate * RELIABILITY_RUNS)} tokens</span>
            )}
          </button>
        </div>
      </header>

      <div className="space-y-6">
        {cases.length > 0 && (
          <CasePicker
            cases={cases}
            selected={selected}
            onChange={setSelected}
            failedIds={failedIds}
            disabled={loading}
          />
        )}
        <SummaryBar scorecard={scorecard} isReliabilityMode={isReliabilityMode} />
        {error && <ErrorBanner message={error} />}
        {loading && <LoadingState />}
        {scorecard && (
          <ScorecardView
            scorecard={scorecard}
            expandedRows={expandedRows}
            onToggle={toggleRow}
            isReliabilityMode={isReliabilityMode}
          />
        )}
      </div>
    </main>
  );
}
