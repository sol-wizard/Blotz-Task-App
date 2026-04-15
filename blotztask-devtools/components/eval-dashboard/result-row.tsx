import type { EvalCaseResult } from "@/types/eval";
import { StatusBadge } from "./status-badge";
import { ChecksDetail } from "./checks-detail";

export const ResultRow = ({
  result,
  expanded,
  onToggle,
}: {
  result: EvalCaseResult;
  expanded: boolean;
  onToggle: () => void;
}) => {
  const passedChecks = result.checks.filter((c) => c.passed).length;

  return (
    <>
      <tr
        onClick={onToggle}
        className="border-t border-zinc-800 cursor-pointer transition-colors hover:bg-zinc-900/60"
      >
        <td className="px-4 py-3 text-zinc-500">
          <span className={`inline-block transition-transform ${expanded ? "rotate-90" : ""}`}>
            &#9654;
          </span>
        </td>
        <td className="px-4 py-3 font-medium font-[family-name:var(--font-geist-mono)]">
          {result.id}
        </td>
        <td className="px-4 py-3">
          <StatusBadge passed={result.passed} />
        </td>
        <td className="px-4 py-3 text-right text-zinc-400 font-[family-name:var(--font-geist-mono)]">
          {(result.timeMs / 1000).toFixed(1)}s
        </td>
        <td className="px-4 py-3 text-right text-zinc-400">
          {passedChecks}/{result.checks.length}
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={5} className="bg-zinc-900/40 px-4 py-2">
            <ChecksDetail checks={result.checks} />
          </td>
        </tr>
      )}
    </>
  );
};
