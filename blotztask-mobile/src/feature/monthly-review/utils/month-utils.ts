import { format } from "date-fns";
import { enUS, zhCN } from "date-fns/locale";

export function formatMonth(date: Date, lang: string): string {
  const isZh = lang.toLowerCase().startsWith("zh");
  return format(date, isZh ? "yyyy年M月" : "MMMM yyyy", {
    locale: isZh ? zhCN : enUS,
  });
}
