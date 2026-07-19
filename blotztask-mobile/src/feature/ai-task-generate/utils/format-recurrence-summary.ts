import { parseISO, format } from "date-fns";

// Builds a human-readable schedule label for a recurring draft card, e.g. "Weekly · Mon, Wed, Fri
// · 7:00 AM". English-only for now; localise if needed.

// WeeklyDayFlags bitmask (Mon=1, Tue=2, Wed=4, Thu=8, Fri=16, Sat=32, Sun=64).
const DAY_FLAGS: { flag: number; short: string }[] = [
  { flag: 1, short: "Mon" },
  { flag: 2, short: "Tue" },
  { flag: 4, short: "Wed" },
  { flag: 8, short: "Thu" },
  { flag: 16, short: "Fri" },
  { flag: 32, short: "Sat" },
  { flag: 64, short: "Sun" },
];

function decodeDays(mask: number): string {
  return DAY_FLAGS.filter((d) => (mask & d.flag) !== 0)
    .map((d) => d.short)
    .join(", ");
}

function formatTimeOfDay(templateStartTime: string): string {
  try {
    return format(parseISO(templateStartTime), "h:mm a");
  } catch {
    return "";
  }
}

export function formatRecurrenceSummary(params: {
  frequency: string;
  interval: number;
  daysOfWeek?: number | null;
  dayOfMonth?: number | null;
  templateStartTime: string;
}): string {
  const { frequency, interval, daysOfWeek, dayOfMonth, templateStartTime } = params;
  const time = formatTimeOfDay(templateStartTime);

  let base: string;
  switch (frequency) {
    case "Weekly": {
      const every = interval > 1 ? `Every ${interval} weeks` : "Weekly";
      const days = daysOfWeek ? decodeDays(daysOfWeek) : "";
      base = days ? `${every} · ${days}` : every;
      break;
    }
    case "Daily":
      base = interval > 1 ? `Every ${interval} days` : "Daily";
      break;
    case "Monthly": {
      const every = interval > 1 ? `Every ${interval} months` : "Monthly";
      base = dayOfMonth ? `${every} · Day ${dayOfMonth}` : every;
      break;
    }
    case "Yearly":
      base = interval > 1 ? `Every ${interval} years` : "Yearly";
      break;
    default:
      base = frequency;
  }

  return time ? `${base} · ${time}` : base;
}
