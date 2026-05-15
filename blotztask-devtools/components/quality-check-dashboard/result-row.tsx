import type { QualityCheckCaseResult } from "@/types/quality-check";
import { StatusBadge } from "./status-badge";
import { ReliabilityBadge } from "./reliability-badge";
import { ChecksDetail } from "./checks-detail";

const formatMs = (ms: number) =>
  ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(2)}s`;

export const ResultRow = ({
  result,
  expanded,
  onToggle,
}: {
  result: QualityCheckCaseResult;
  expanded: boolean;
  onToggle: () => void;
}) => {
  const isReliabilityMode = result.totalRuns != null && result.totalRuns > 1;
  const passedChecks = result.checks.filter((c) => c.passed).length;

  return (
    <>
      <tr
        onClick={isReliabilityMode ? undefined : onToggle}
        className={`border-t border-zinc-800 transition-colors ${isReliabilityMode ? "" : "cursor-pointer hover:bg-zinc-900/60"}`}>
        <td className="px-4 py-3 text-zinc-500">
          {isReliabilityMode ? (
            <span className="inline-block text-zinc-700">&#9654;</span>
          ) : (
            <span
              className={`inline-block transition-transform ${expanded ? "rotate-90" : ""}`}>
              &#9654;
            </span>
          )}
        </td>
        <td className="px-4 py-3 font-medium font-[family-name:var(--font-geist-mono)] text-zinc-100">
          {result.id}
        </td>
        <td className="px-4 py-3">
          {isReliabilityMode ? (
            <ReliabilityBadge
              passCount={result.passCount!}
              totalRuns={result.totalRuns!}
            />
          ) : (
            <StatusBadge passed={result.passed} />
          )}
        </td>
        <td className="px-4 py-3 text-right text-zinc-100 font-[family-name:var(--font-geist-mono)]">
          {formatMs(result.aiTimeMs)}
        </td>
        <td className="px-4 py-3 text-right text-zinc-500 font-[family-name:var(--font-geist-mono)]">
          {formatMs(result.initTimeMs)}
        </td>
        <td className="px-4 py-3 text-right text-zinc-500 font-[family-name:var(--font-geist-mono)]">
          {result.totalTokens}
        </td>
        <td className="px-4 py-3 text-right text-zinc-400">
          {isReliabilityMode ? (
            <span className="text-zinc-600 text-xs">—</span>
          ) : (
            `${passedChecks}/${result.checks.length}`
          )}
        </td>
      </tr>
      {!isReliabilityMode && expanded && (
        <tr>
          <td colSpan={7} className="bg-zinc-900/40 px-6 py-4">
            <div className="mb-4">
              <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">
                Input
              </p>
              <p className="text-sm text-zinc-100 italic">
                &ldquo;{result.input}&rdquo;
              </p>
            </div>
            <ChecksDetail
              checks={result.checks}
              extractedTasks={result.extractedTasks}
              extractedNotes={result.extractedNotes ?? []}
            />
            <div className="mt-6 border-t border-zinc-800 pt-3 flex items-center justify-end gap-6 text-xs font-[family-name:var(--font-geist-mono)] text-zinc-500">
              <span>InputTokens: {result.inputTokens.toLocaleString()}</span>
              <span>OutputTokens: {result.outputTokens.toLocaleString()}</span>
            </div>
          </td>
        </tr>
      )}
    </>
  );
};
