import { useState } from "react";
import type { QualityCheckCaseSummary } from "@/types/quality-check";

export const CasePicker = ({
  cases,
  selected,
  onChange,
  failedIds,
  disabled = false,
}: {
  cases: QualityCheckCaseSummary[];
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
  failedIds: string[];
  disabled?: boolean;
}) => {
  const [open, setOpen] = useState(false);

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange(next);
  };

  const chipClass =
    "rounded-md border border-zinc-700 bg-zinc-800 px-3 py-1 text-xs font-semibold text-zinc-300 hover:bg-zinc-700 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed";

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/60">
      <div className="flex flex-wrap items-center gap-2 px-4 py-3">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="text-sm font-semibold text-zinc-200 hover:text-white"
        >
          {open ? "▾" : "▸"} Cases
          <span className="ml-2 font-normal text-zinc-400">
            {selected.size} of {cases.length} selected
          </span>
        </button>
        <div className="ml-auto flex gap-2">
          <button
            type="button"
            className={chipClass}
            disabled={disabled}
            onClick={() => onChange(new Set(cases.map((c) => c.id)))}
          >
            All
          </button>
          <button
            type="button"
            className={chipClass}
            disabled={disabled}
            onClick={() => onChange(new Set())}
          >
            None
          </button>
          <button
            type="button"
            className={chipClass}
            disabled={disabled || failedIds.length === 0}
            onClick={() => onChange(new Set(failedIds))}
            title="Select only the cases that failed in the last run"
          >
            Failed ({failedIds.length})
          </button>
        </div>
      </div>

      {open && (
        <ul className="max-h-80 overflow-y-auto border-t border-zinc-800 text-sm">
          {cases.map((c) => (
            <li key={c.id} className="border-b border-zinc-800/60 last:border-b-0">
              <label className="flex cursor-pointer items-start gap-3 px-4 py-2 hover:bg-zinc-800/50">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={selected.has(c.id)}
                  disabled={disabled}
                  onChange={() => toggle(c.id)}
                />
                <span className="w-72 shrink-0 font-[family-name:var(--font-geist-mono)] text-xs text-zinc-200">
                  {c.id}
                  {c.turns > 1 && <span className="ml-2 text-zinc-500">{c.turns} turns</span>}
                </span>
                <span className="truncate text-zinc-400">{c.input}</span>
              </label>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
