import type { EvalExtractedTask } from "@/types/eval";

const LABEL_COLORS: Record<string, { bar: string; text: string }> = {
  Work:     { bar: "#c2e49f", text: "#3A442F" },
  Life:     { bar: "#cce7db", text: "#3D4541" },
  Learning: { bar: "#d6faf9", text: "#3E415C" },
  Health:   { bar: "#bad5fa", text: "#373F4B" },
};

const FALLBACK_COLOR = { bar: "#a1a1aa", text: "#3f3f46" };

const formatTime = (iso: string) => {
  const d = new Date(iso);
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
};

const formatDate = (iso: string) => {
  const d = new Date(iso);
  const today = new Date();
  const isToday =
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear();
  if (isToday) return "Today";
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

const formatTimeRange = (task: EvalExtractedTask) => {
  const start = new Date(task.startTime);
  const end = new Date(task.endTime);
  if (start.getTime() === end.getTime()) return formatTime(task.startTime);
  return `${formatTime(task.startTime)} – ${formatTime(task.endTime)}`;
};

const Field = ({ label, value }: { label: string; value: string }) => (
  <div className="flex flex-col gap-0.5">
    <span className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</span>
    <span className="text-sm text-zinc-200">{value || <span className="text-zinc-600 italic">—</span>}</span>
  </div>
);

export const TaskCardPreview = ({ task }: { task: EvalExtractedTask }) => {
  const colors = LABEL_COLORS[task.labelName] ?? FALLBACK_COLOR;

  return (
    <div className="rounded-xl border border-zinc-700 bg-zinc-800 overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-700">
        <div className="w-1 h-5 rounded-full flex-shrink-0" style={{ backgroundColor: colors.bar }} />
        <span className="text-base font-semibold text-zinc-100 flex-1">{task.title}</span>
        <span
          className="text-xs font-semibold px-2.5 py-0.5 rounded-full"
          style={{ backgroundColor: colors.bar, color: colors.text }}
        >
          {task.labelName}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-4 px-4 py-3">
        <Field label="Date" value={formatDate(task.startTime)} />
        <Field label="Time" value={formatTimeRange(task)} />
        <Field label="Description" value={task.description} />
      </div>
    </div>
  );
};
