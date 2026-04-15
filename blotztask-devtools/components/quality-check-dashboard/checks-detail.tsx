import type { EvalCheck } from "@/types/quality-check";

export const ChecksDetail = ({ checks }: { checks: EvalCheck[] }) => {
  return (
    <table className="w-full text-xs font-[family-name:var(--font-geist-mono)]">
      <thead>
        <tr className="text-zinc-500 text-left">
          <th className="px-3 py-1.5">Field</th>
          <th className="px-3 py-1.5">Expected</th>
          <th className="px-3 py-1.5">Actual</th>
          <th className="px-3 py-1.5 text-right">Result</th>
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
            <td className="px-3 py-1.5">{check.field}</td>
            <td className="px-3 py-1.5">{check.expected}</td>
            <td className="px-3 py-1.5">{check.actual}</td>
            <td className="px-3 py-1.5 text-right">
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
};
