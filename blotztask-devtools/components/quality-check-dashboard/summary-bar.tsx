import type { QualityCheckScorecard } from "@/types/quality-check";
import { StatCard } from "./stat-card";

export const SummaryBar = ({
  scorecard,
  isReliabilityMode = false,
}: {
  scorecard: QualityCheckScorecard | null;
  isReliabilityMode?: boolean;
}) => {
  return (
    <div className="space-y-3">
      {/* Quality row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label="Total Cases"
          value={scorecard ? scorecard.totalCases.toString() : "—"}
          tooltip="Total number of test cases in quality-check-cases.json."
        />
        <StatCard
          label={isReliabilityMode ? "Stable" : "Correct"}
          value={scorecard ? scorecard.passed.toString() : "—"}
          variant="pass"
          tooltip={
            isReliabilityMode
              ? "Cases that passed on every run — safe to rely on."
              : "Cases where every check passed."
          }
        />
        <StatCard
          label={isReliabilityMode ? "Flaky" : "Incorrect"}
          value={scorecard ? scorecard.failed.toString() : "—"}
          variant="fail"
          tooltip={
            isReliabilityMode
              ? "Cases that failed at least once — non-deterministic AI behaviour detected."
              : "Cases where at least one check failed."
          }
        />
        <StatCard
          label="Accuracy"
          value={scorecard ? scorecard.passRate : "—"}
          tooltip="Percentage of cases that passed all checks."
        />
      </div>

      {/* Model row */}
      {scorecard && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg border border-violet-800 bg-violet-950/60 text-sm font-[family-name:var(--font-geist-mono)]">
          <span className="text-violet-400 font-semibold uppercase tracking-wider text-xs">
            Model
          </span>
          <span className="text-violet-100 font-bold">{scorecard.modelId}</span>
        </div>
      )}

      {/* Timing row */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard
          label="Run Duration"
          value={
            scorecard ? `${(scorecard.totalTimeMs / 1000).toFixed(1)}s` : "—"
          }
          tooltip="Wall-clock time for the full test run. Cases run in parallel so this equals the slowest batch, not the sum of all cases."
        />
        <StatCard
          label="Avg Wait Time"
          value={
            scorecard ? `${(scorecard.avgAiTimeMs / 1000).toFixed(1)}s` : "—"
          }
          tooltip="Average AI response time per case. This is how long a real user typically waits after sending a message."
        />
        <StatCard
          label="Max Wait Time"
          value={
            scorecard ? `${(scorecard.maxAiTimeMs / 1000).toFixed(1)}s` : "—"
          }
          tooltip="Slowest AI response across all cases. This is the worst-case wait a user could experience."
        />
      </div>
      {/* Token usage row */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard
          label="Input Tokens"
          value={scorecard ? (scorecard.totalInputTokens ?? 0).toLocaleString() : "—"}
          tooltip="Total prompt tokens consumed across all test cases."
        />
        <StatCard
          label="Output Tokens"
          value={scorecard ? (scorecard.totalOutputTokens ?? 0).toLocaleString() : "—"}
          tooltip="Total completion tokens generated across all test cases."
        />
        <StatCard
          label="Total Tokens"
          value={scorecard ? (scorecard.totalTokens ?? 0).toLocaleString() : "—"}
          tooltip="Total token consumption (prompt + completion) for this quality check run."
        />
      </div>
    </div>
  );
};
