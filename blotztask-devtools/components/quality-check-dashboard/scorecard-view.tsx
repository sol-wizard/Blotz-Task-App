import type { QualityCheckScorecard } from "@/types/quality-check";
import { ResultsTable } from "./results-table";

export const ScorecardView = ({
  scorecard,
  expandedRows,
  onToggle,
  isReliabilityMode = false,
}: {
  scorecard: QualityCheckScorecard;
  expandedRows: Set<string>;
  onToggle: (id: string) => void;
  isReliabilityMode?: boolean;
}) => {
  const totalRuns = scorecard.results[0]?.totalRuns ?? 1;

  return (
    <div className="space-y-3">
      {isReliabilityMode && (
        <div className="flex items-center gap-3 rounded-lg border border-violet-800 bg-violet-950/60 px-4 py-3 text-sm text-violet-300">
          <span className="text-lg leading-none">⟳</span>
          <div>
            <span className="font-semibold text-violet-200">RELIABILITY MODE</span>
            <span className="mx-2 text-violet-600">·</span>
            <span>
              Each case ran <span className="font-semibold text-violet-200">{totalRuns}×</span> in
              parallel. STATUS shows passes out of total runs.
            </span>
          </div>
        </div>
      )}
      <ResultsTable
        results={scorecard.results}
        expandedRows={expandedRows}
        onToggle={onToggle}
        isReliabilityMode={isReliabilityMode}
      />
    </div>
  );
};
