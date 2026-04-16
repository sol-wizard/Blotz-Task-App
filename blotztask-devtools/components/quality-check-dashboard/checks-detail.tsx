import type { EvalCheck, QualityCheckExtractedTask } from "@/types/quality-check";
import { TaskCardPreview } from "./task-card-preview";

const LABEL_COLORS: Record<string, string> = {
  Work: "text-emerald-300",
  Life: "text-sky-300",
  Learning: "text-violet-300",
  Health: "text-rose-300",
};

const SummaryChecks = ({ checks }: { checks: EvalCheck[] }) => (
  <div className="flex flex-wrap gap-2 mb-6">
    {checks.map((check, i) => (
      <div
        key={i}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-[family-name:var(--font-geist-mono)] ${
          check.passed
            ? "border-zinc-700 bg-zinc-800/60 text-zinc-300"
            : "border-red-800 bg-red-950/30 text-red-300"
        }`}
      >
        <span className="text-zinc-500">{check.field}</span>
        <span className="text-zinc-600">·</span>
        <span>expected {check.expected}</span>
        <span className="text-zinc-600">·</span>
        <span>got {check.actual}</span>
        <span className={check.passed ? "text-emerald-400" : "text-red-400"}>
          {check.passed ? "✓" : "✗"}
        </span>
      </div>
    ))}
  </div>
);

const TaskChecksTable = ({ checks }: { checks: EvalCheck[] }) => (
  <table className="w-full text-xs font-[family-name:var(--font-geist-mono)]">
    <thead>
      <tr className="text-zinc-600 text-left">
        <th className="pb-1.5 pr-4">Field</th>
        <th className="pb-1.5 pr-4">Expected</th>
        <th className="pb-1.5 pr-4">Actual</th>
        <th className="pb-1.5 text-right">Result</th>
      </tr>
    </thead>
    <tbody>
      {checks.map((check, i) => (
        <tr
          key={i}
          className={`border-t border-zinc-800/50 ${
            check.passed ? "text-zinc-400" : "text-red-300 bg-red-950/20"
          }`}
        >
          <td className="py-1.5 pr-4">{check.field}</td>
          <td className="py-1.5 pr-4">{check.expected}</td>
          <td className="py-1.5 pr-4">{check.actual}</td>
          <td className="py-1.5 text-right">
            {check.passed ? (
              <span className="text-emerald-400">PASS</span>
            ) : (
              <span className="text-red-400">FAIL</span>
            )}
          </td>
        </tr>
      ))}
    </tbody>
  </table>
);

export const ChecksDetail = ({
  checks,
  extractedTasks,
}: {
  checks: EvalCheck[];
  extractedTasks: QualityCheckExtractedTask[];
}) => {
  const summaryChecks = checks.filter((c) => !c.field.startsWith("task["));

  const taskGroups = checks
    .filter((c) => c.field.startsWith("task["))
    .reduce<Record<number, EvalCheck[]>>((acc, check) => {
      const match = check.field.match(/^task\[(\d+)\]\.(.+)$/);
      if (!match) return acc;
      const index = Number(match[1]);
      const shortField = match[2];
      if (!acc[index]) acc[index] = [];
      acc[index].push({ ...check, field: shortField });
      return acc;
    }, {});

  return (
    <div>
      {summaryChecks.length > 0 && <SummaryChecks checks={summaryChecks} />}

      <div className="flex flex-col gap-6">
        {Object.entries(taskGroups).map(([indexStr, taskChecks]) => {
          const index = Number(indexStr);
          const task = extractedTasks[index];
          const allPassed = taskChecks.every((c) => c.passed);

          return (
            <div
              key={index}
              className={`rounded-xl border overflow-hidden ${
                allPassed ? "border-zinc-700" : "border-red-900"
              }`}
            >
              <div
                className={`flex items-center justify-between px-4 py-2 text-xs font-[family-name:var(--font-geist-mono)] border-b ${
                  allPassed
                    ? "border-zinc-700 bg-zinc-800/40 text-zinc-500"
                    : "border-red-900 bg-red-950/20 text-red-400"
                }`}
              >
                <span>task[{index}]</span>
                {task && (
                  <span className={LABEL_COLORS[task.labelName] ?? "text-zinc-400"}>
                    {task.labelName}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 divide-x divide-zinc-800">
                <div className="p-4">
                  {task ? (
                    <TaskCardPreview task={task} />
                  ) : (
                    <div className="flex items-center justify-center h-full text-xs text-zinc-600 italic">
                      task not extracted
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <TaskChecksTable checks={taskChecks} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
