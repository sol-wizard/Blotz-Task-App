import type { QualityCheckCaseResult } from "@/types/quality-check";
import { ResultRow } from "./result-row";

export const ResultsTable = ({
  results,
  expandedRows,
  onToggle,
  isReliabilityMode = false,
}: {
  results: QualityCheckCaseResult[];
  expandedRows: Set<string>;
  onToggle: (id: string) => void;
  isReliabilityMode?: boolean;
}) => {
  return (
    <div className="rounded-lg border border-zinc-800 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr
            className={`text-left text-xs uppercase tracking-wider ${isReliabilityMode ? "bg-violet-950/40 text-violet-400" : "bg-zinc-900 text-zinc-400"}`}>
            <th className="px-4 py-3 w-8" />
            <th className="px-4 py-3">Case ID</th>
            <th className="px-4 py-3">
              {isReliabilityMode ? "Reliability" : "Status"}
            </th>
            <th className="px-4 py-3 text-right">AI Time</th>
            <th className="px-4 py-3 text-right">Init Time</th>
            <th className="px-4 py-3 text-right">Total Tokens</th>
            {!isReliabilityMode && (
              <th className="px-4 py-3 text-right">Checks</th>
            )}
          </tr>
        </thead>
        <tbody>
          {results.map((result) => (
            <ResultRow
              key={result.id}
              result={result}
              expanded={expandedRows.has(result.id)}
              onToggle={() => onToggle(result.id)}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
};
