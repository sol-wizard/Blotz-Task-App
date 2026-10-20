import type { ComponentProps } from "react";
import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import Ionicons from "@react-native-vector-icons/ionicons/static";
import { format } from "date-fns";
import useSelectedDayTasks from "@/shared/hooks/useSelectedDayTasks";
import { CoachMark } from "./coach-header";

type Starter = {
  key: "planTomorrow" | "breakDown" | "focusNow" | "talk";
  icon: ComponentProps<typeof Ionicons>["name"];
  tint: string;
  color: string;
};

const STARTERS: Starter[] = [
  { key: "planTomorrow", icon: "calendar-outline", tint: "#EAF3FC", color: "#2563A8" },
  { key: "breakDown", icon: "list-outline", tint: "#F1F9E1", color: "#4D7300" },
  { key: "focusNow", icon: "timer-outline", tint: "#FFF3E6", color: "#C2410C" },
  { key: "talk", icon: "chatbubble-ellipses-outline", tint: "#F1EEFB", color: "#6D4FC2" },
];

/** First screen of an empty chat: a greeting, today at a glance, and ways to start. */
export function CoachWelcome({ disabled, onStart }: { disabled: boolean; onStart: (text: string) => void }) {
  const { t } = useTranslation("aiCoach");
  const [today] = useState(() => new Date());
  const { selectedDayTasks } = useSelectedDayTasks({ selectedDay: today });
  const hour = today.getHours();
  const greeting = t(hour < 12 ? "home.greeting.morning" : hour < 18 ? "home.greeting.afternoon" : "home.greeting.evening");

  const summary = useMemo(() => {
    const done = selectedDayTasks.filter((task) => task.isDone).length;
    const open = selectedDayTasks.filter((task) => !task.isDone);
    const next = open
      .filter((task) => new Date(task.endTime).getTime() >= today.getTime())
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())[0];
    return { done, open: open.length, total: selectedDayTasks.length, next };
  }, [selectedDayTasks, today]);

  return (
    <View className="gap-5 pt-3 pb-4">
      <View className="gap-3.5">
        <CoachMark size={56} />
        <View className="gap-1.5">
          <Text className="font-balooExtraBold text-[28px] leading-[34px] text-secondary">{greeting}</Text>
          <Text className="font-inter text-[15px] leading-[22px] text-[#5B6175]">{t("home.intro")}</Text>
        </View>
      </View>

      {summary.total > 0 && (
        <View className="rounded-[20px] bg-white px-4 py-3.5 gap-2.5">
          <View className="flex-row items-center justify-between">
            <Text className="font-balooBold text-[15px] text-secondary">{t("chat.today")}</Text>
            <Text className="font-inter text-[13px] text-[#6B7280]">
              {t("home.todaySummary", { open: summary.open, done: summary.done })}
            </Text>
          </View>
          <View className="h-1.5 rounded-full bg-[#EEF1F3] overflow-hidden">
            <View className="h-1.5 bg-checked" style={{ width: `${(summary.done / summary.total) * 100}%` }} />
          </View>
          {summary.next && (
            <View className="flex-row items-center gap-2.5">
              <Text className="w-11 font-inter font-semibold text-[13px] text-[#6B7280]"
                style={{ fontVariant: ["tabular-nums"] }}>{format(new Date(summary.next.startTime), "HH:mm")}</Text>
              <View className="w-1 h-5 rounded-full"
                style={{ backgroundColor: summary.next.label?.color ?? "#3D8DE0" }} />
              <Text className="flex-1 font-inter font-medium text-[15px] text-secondary" numberOfLines={1}>
                {summary.next.title}
              </Text>
              <View className="rounded-lg bg-[#F1F9E1] px-2 py-0.5">
                <Text className="font-inter text-xs text-[#4D7300]">{t("home.next")}</Text>
              </View>
            </View>
          )}
        </View>
      )}

      <View className="gap-2.5">
        <Text className="font-inter font-semibold text-[13px] text-[#6B7280]">{t("home.startersTitle")}</Text>
        <View className="flex-row flex-wrap gap-2.5">
          {STARTERS.map((starter) => (
            <Pressable key={starter.key} disabled={disabled} accessibilityRole="button"
              onPress={() => onStart(t(`home.starters.${starter.key}.prompt`))}
              className={`grow basis-[45%] rounded-[18px] bg-white p-3.5 gap-2.5 ${disabled ? "opacity-50" : ""}`}>
              <View className="w-8 h-8 rounded-[10px] items-center justify-center" style={{ backgroundColor: starter.tint }}>
                <Ionicons name={starter.icon} size={18} color={starter.color} />
              </View>
              <Text className="font-balooBold text-[15px] leading-5 text-secondary">
                {t(`home.starters.${starter.key}.title`)}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );
}
