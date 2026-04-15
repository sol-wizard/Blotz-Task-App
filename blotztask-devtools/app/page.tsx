"use client";

import { useState } from "react";
import type { EvalScorecard } from "@/types/eval";
import { LoadingState } from "@/components/eval-dashboard/loading-state";
import { ErrorBanner } from "@/components/eval-dashboard/error-banner";
import { EmptyState } from "@/components/eval-dashboard/empty-state";
import { ScorecardView } from "@/components/eval-dashboard/scorecard-view";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5027";

export default function EvalDashboard() {
  const [scorecard, setScorecard] = useState<EvalScorecard | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const runEval = async () => {
    setLoading(true);
    setError(null);
    setScorecard(null);
    setExpandedRows(new Set());

    try {
      const res = await fetch(`${API_URL}/dev/ai-eval`, { method: "POST" });
      if (!res.ok) {
        throw new Error(`Backend returned ${res.status}: ${res.statusText}`);
      }
      const data: EvalScorecard = await res.json();
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
          <h1 className="text-2xl font-bold tracking-tight">AI Eval Dashboard</h1>
          <p className="text-sm text-zinc-400 mt-1">{API_URL}/dev/ai-eval</p>
        </div>
        <button
          onClick={runEval}
          disabled={loading}
          className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Running..." : "Run Eval"}
        </button>
      </header>

      {loading && <LoadingState />}
      {error && <ErrorBanner message={error} />}
      {scorecard && (
        <ScorecardView
          scorecard={scorecard}
          expandedRows={expandedRows}
          onToggle={toggleRow}
        />
      )}
      {!loading && !error && !scorecard && <EmptyState />}
    </main>
  );
}
