import type { EvalCaseResult } from "@/types/eval";
import { ResultRow } from "./result-row";

export const ResultsTable = ({
  results,
  expandedRows,
  onToggle,
}: {
  results: EvalCaseResult[];
  expandedRows: Set<string>;
  onToggle: (id: string) => void;
}) => {
  return (
    <div className="rounded-lg border border-zinc-800 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-zinc-900 text-zinc-400 text-left text-xs uppercase tracking-wider">
            <th className="px-4 py-3 w-8" />
            <th className="px-4 py-3">Case ID</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3 text-right">AI Time</th>
            <th className="px-4 py-3 text-right">Init Time</th>
            <th className="px-4 py-3 text-right">Checks</th>
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
