export const StatCard = ({
  label,
  value,
  variant,
}: {
  label: string;
  value: string;
  variant?: "pass" | "fail";
}) => {
  const valueColor =
    variant === "pass"
      ? "text-emerald-400"
      : variant === "fail"
        ? "text-red-400"
        : "text-zinc-100";

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3">
      <p className="text-xs text-zinc-500 uppercase tracking-wider">{label}</p>
      <p className={`text-xl font-bold mt-1 ${valueColor}`}>{value}</p>
    </div>
  );
};
