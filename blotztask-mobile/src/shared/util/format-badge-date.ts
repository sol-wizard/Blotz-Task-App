import { format } from "date-fns";
import i18n from "@/i18n";

export function formatBadgeDate(date: Date): string {
  const isChinese = i18n.language === "zh";
  const pattern = isChinese ? "yyyy年M月d日" : "MMMM d, yyyy";
  return format(date, pattern);
}
