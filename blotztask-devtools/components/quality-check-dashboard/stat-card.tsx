export const StatCard = ({
  label,
  value,
  variant,
  tooltip,
}: {
  label: string;
  value: string;
  variant?: "pass" | "fail";
  tooltip?: string;
}) => {
  const valueColor =
    variant === "pass"
      ? "text-emerald-400"
      : variant === "fail"
        ? "text-red-400"
        : "text-zinc-100";

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3">
      <div className="flex items-center gap-1.5">
        <p className="text-xs text-zinc-500 uppercase tracking-wider">{label}</p>
        {tooltip && (
          <div className="relative group flex items-center">
            <span className="flex items-center justify-center w-3.5 h-3.5 rounded-full border border-zinc-600 text-zinc-500 text-[9px] font-bold cursor-default select-none leading-none">
              ?
            </span>
            <div className="invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-opacity duration-150 absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-52 text-xs bg-zinc-700 text-zinc-200 rounded-md px-3 py-2 z-10 shadow-xl pointer-events-none">
              {tooltip}
              <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-zinc-700" />
            </div>
          </div>
        )}
      </div>
      <p className={`text-xl font-bold mt-1 ${valueColor}`}>{value}</p>
    </div>
  );
};
