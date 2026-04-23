export const StatusBadge = ({ passed }: { passed: boolean }) => {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        passed
          ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
          : "bg-red-950 text-red-400 border border-red-800"
      }`}
    >
      {passed ? "PASS" : "FAIL"}
    </span>
  );
};
