export const ReliabilityBadge = ({
  passCount,
  totalRuns,
}: {
  passCount: number;
  totalRuns: number;
}) => {
  const rate = passCount / totalRuns;
  const color =
    rate === 1
      ? "bg-emerald-950 text-emerald-400 border-emerald-800"
      : rate >= 0.6
        ? "bg-amber-950 text-amber-400 border-amber-800"
        : "bg-red-950 text-red-400 border-red-800";

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border ${color}`}>
      {passCount}/{totalRuns}
    </span>
  );
};
