"use client";

import { useState } from "react";
import type { QualityCheckScorecard } from "@/types/quality-check";
import { LoadingState } from "@/components/quality-check-dashboard/loading-state";
import { ErrorBanner } from "@/components/quality-check-dashboard/error-banner";
import { SummaryBar } from "@/components/quality-check-dashboard/summary-bar";
import { ScorecardView } from "@/components/quality-check-dashboard/scorecard-view";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5027";

export default function QualityCheckDashboard() {
  const [scorecard, setScorecard] = useState<QualityCheckScorecard | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMode, setLoadingMode] = useState<"single" | "reliability">("single");
  const [error, setError] = useState<string | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const isReliabilityMode =
    (scorecard?.results[0]?.totalRuns ?? 1) > 1;

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
        }),
      });
      if (!res.ok) {
        throw new Error(`Backend returned ${res.status}: ${res.statusText}`);
      }
      const data: QualityCheckScorecard = await res.json();
      setScorecard(data);
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
            onClick={() => runQualityCheck(1)}
            disabled={loading}
            className={`rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              !isReliabilityMode && scorecard
                ? "bg-emerald-500 ring-2 ring-emerald-400 ring-offset-2 ring-offset-zinc-950"
                : "bg-emerald-600 hover:bg-emerald-500"
            }`}
          >
            {loading && loadingMode === "single" ? "Checking..." : "Check AI Accuracy"}
          </button>
          <button
            onClick={() => runQualityCheck(5)}
            disabled={loading}
            title="Run each case 5 times in parallel to measure reliability"
            className={`rounded-lg border px-5 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              isReliabilityMode
                ? "border-violet-600 bg-violet-700 text-white ring-2 ring-violet-400 ring-offset-2 ring-offset-zinc-950"
                : "border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white"
            }`}
          >
            {loading && loadingMode === "reliability" ? "Running 5×..." : "Run 5×"}
          </button>
        </div>
      </header>

      <div className="space-y-6">
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
