import type { QualityCheckCaseResult } from "@/types/quality-check";
import { StatusBadge } from "./status-badge";
import { ChecksDetail } from "./checks-detail";
import { TaskCardPreview } from "./task-card-preview";

const formatMs = (ms: number) => `${(ms / 1000).toFixed(1)}s`;

export const ResultRow = ({
  result,
  expanded,
  onToggle,
}: {
  result: QualityCheckCaseResult;
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
        <td className="px-4 py-3 text-right text-zinc-100 font-[family-name:var(--font-geist-mono)]">
          {formatMs(result.aiTimeMs)}
        </td>
        <td className="px-4 py-3 text-right text-zinc-500 font-[family-name:var(--font-geist-mono)]">
          {formatMs(result.initTimeMs)}
        </td>
        <td className="px-4 py-3 text-right text-zinc-400">
          {passedChecks}/{result.checks.length}
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={6} className="bg-zinc-900/40 px-6 py-4">
            {result.extractedTasks.length > 0 && (
              <div className="mb-4">
                <p className="text-xs text-zinc-500 uppercase tracking-wider mb-3">
                  Task Preview
                </p>
                <div className="flex flex-col gap-2">
                  {result.extractedTasks.map((task, i) => (
                    <TaskCardPreview key={i} task={task} />
                  ))}
                </div>
              </div>
            )}
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">
              Checks
            </p>
            <ChecksDetail checks={result.checks} />
          </td>
        </tr>
      )}
    </>
  );
};
