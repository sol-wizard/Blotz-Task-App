import React, { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import Modal from "react-native-modal";
import { format } from "date-fns";
import { enUS, zhCN } from "date-fns/locale";
import { useTranslation } from "react-i18next";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Animated from "react-native-reanimated";
import { MotionAnimations } from "@/shared/constants/animations/motion";
import { AnimatedDropdown, DropdownOption } from "@/shared/components/ui/animated-dropdown";
import { SingleDateCalendar } from "./single-date-calendar";

export type RepeatFrequency = "daily" | "weekly" | "monthly" | "yearly";

export type RepeatConfig = {
  frequency: RepeatFrequency;
  interval: number;
  daysOfWeek: number[];
  dayOfMonth: number | null;
  startDate: Date;
  endDate: Date | null;
};

type RepeatSelectSheetProps = {
  visible: boolean;
  selectedDate: Date;
  initialValue?: RepeatConfig | null;
  onClose: () => void;
  onConfirm: (config: RepeatConfig, summary: string) => void;
};

const toWeekdayValue = (date: Date): number => {
  const day = date.getDay();
  return day === 0 ? 7 : day;
};

const normalizeInterval = (value: number): number => {
  if (!Number.isFinite(value) || value < 1) {
    return 1;
  }
  return Math.floor(value);
};

const getOrdinal = (day: number): string => {
  const mod10 = day % 10;
  const mod100 = day % 100;
  if (mod10 === 1 && mod100 !== 11) return `${day}st`;
  if (mod10 === 2 && mod100 !== 12) return `${day}nd`;
  if (mod10 === 3 && mod100 !== 13) return `${day}rd`;
  return `${day}th`;
};

export const createDefaultRepeatConfig = (selectedDate: Date): RepeatConfig => ({
  frequency: "daily",
  interval: 1,
  daysOfWeek: [toWeekdayValue(selectedDate)],
  dayOfMonth: selectedDate.getDate(),
  startDate: selectedDate,
  endDate: null,
});

const getWeekdayText = (
  day: number,
  weekDaysMap: Record<number, string>,
  fallbackMap: Record<number, string>,
) => {
  return weekDaysMap[day] ?? fallbackMap[day] ?? "";
};

export const buildRepeatSummary = (
  config: RepeatConfig,
  isChinese: boolean,
  weekDaysMap: Record<number, string>,
): string => {
  const locale = isChinese ? zhCN : enUS;
  const fallbackMap = isChinese
    ? { 1: "周一", 2: "周二", 3: "周三", 4: "周四", 5: "周五", 6: "周六", 7: "周日" }
    : { 1: "Mon", 2: "Tue", 3: "Wed", 4: "Thu", 5: "Fri", 6: "Sat", 7: "Sun" };
  const interval = normalizeInterval(config.interval);

  if (isChinese) {
    if (config.frequency === "daily") {
      return interval === 1 ? "每天" : `每${interval}天`;
    }

    if (config.frequency === "weekly") {
      const sortedDays = [...config.daysOfWeek].sort((a, b) => a - b);
      const daysText = sortedDays
        .map((d) => getWeekdayText(d, weekDaysMap, fallbackMap))
        .filter(Boolean)
        .join("、");
      if (!daysText) {
        return interval === 1 ? "每周" : `每${interval}周`;
      }
      return interval === 1 ? `每周${daysText}` : `每${interval}周（${daysText}）`;
    }

    if (config.frequency === "monthly") {
      const day = config.dayOfMonth ?? config.startDate.getDate();
      return interval === 1 ? `每月${day}号` : `每${interval}个月的${day}号`;
    }

    const onText = format(config.startDate, "M月d日", { locale });
    return interval === 1 ? `每年${onText}` : `每${interval}年（${onText}）`;
  }

  if (config.frequency === "daily") {
    return interval === 1 ? "Every day" : `Every ${interval} days`;
  }

  if (config.frequency === "weekly") {
    const sortedDays = [...config.daysOfWeek].sort((a, b) => a - b);
    const daysText = sortedDays
      .map((d) => getWeekdayText(d, weekDaysMap, fallbackMap))
      .filter(Boolean)
      .join(", ");
    if (!daysText) {
      return interval === 1 ? "Every week" : `Every ${interval} weeks`;
    }
    if (interval === 1 && sortedDays.length === 1) {
      return `Every ${daysText}`;
    }
    return interval === 1 ? `Every week on ${daysText}` : `Every ${interval} weeks on ${daysText}`;
  }

  if (config.frequency === "monthly") {
    const day = config.dayOfMonth ?? config.startDate.getDate();
    const onText = getOrdinal(day);
    return interval === 1 ? `Every month on ${onText}` : `Every ${interval} months on ${onText}`;
  }

  const onText = format(config.startDate, "MMM d", { locale });
  return interval === 1 ? `Every year on ${onText}` : `Every ${interval} years on ${onText}`;
};

export const RepeatSelectSheet = ({
  visible,
  selectedDate,
  initialValue,
  onClose,
  onConfirm,
}: RepeatSelectSheetProps) => {
  const { t, i18n } = useTranslation("tasks");
  const isChinese = i18n.language.toLowerCase().startsWith("zh");
  const locale = isChinese ? zhCN : enUS;
  const dateFormat = isChinese ? "yyyy年M月d日" : "MMM d, yyyy";

  const [draft, setDraft] = useState<RepeatConfig>(
    () => initialValue ?? createDefaultRepeatConfig(selectedDate),
  );
  const [activeSelector, setActiveSelector] = useState<"startDate" | "endDate" | null>(null);
  const [intervalText, setIntervalText] = useState<string>(
    String(normalizeInterval(initialValue?.interval ?? 1)),
  );

  useEffect(() => {
    if (!visible) return;
    const next = initialValue ?? createDefaultRepeatConfig(selectedDate);
    setDraft(next);
    setIntervalText(String(normalizeInterval(next.interval)));
    setActiveSelector(null);
  }, [visible, selectedDate, initialValue]);

  const fallbackFrequencyLabels = useMemo<Record<RepeatFrequency, string>>(
    () => ({
      daily: isChinese ? "每天" : "Daily",
      weekly: isChinese ? "每周" : "Weekly",
      monthly: isChinese ? "每月" : "Monthly",
      yearly: isChinese ? "每年" : "Yearly",
    }),
    [isChinese],
  );

  const frequencyOptions = useMemo<DropdownOption<RepeatFrequency>[]>(
    () => [
      { value: "daily", label: t("repeat.daily", { defaultValue: fallbackFrequencyLabels.daily }) },
      {
        value: "weekly",
        label: t("repeat.weekly", { defaultValue: fallbackFrequencyLabels.weekly }),
      },
      {
        value: "monthly",
        label: t("repeat.monthly", { defaultValue: fallbackFrequencyLabels.monthly }),
      },
      {
        value: "yearly",
        label: t("repeat.yearly", { defaultValue: fallbackFrequencyLabels.yearly }),
      },
    ],
    [fallbackFrequencyLabels, t],
  );

  const weekDayOptions = useMemo(
    () => [
      { value: 1, label: t("repeat.weekdays.mon", { defaultValue: isChinese ? "周一" : "Mon" }) },
      { value: 2, label: t("repeat.weekdays.tue", { defaultValue: isChinese ? "周二" : "Tue" }) },
      { value: 3, label: t("repeat.weekdays.wed", { defaultValue: isChinese ? "周三" : "Wed" }) },
      { value: 4, label: t("repeat.weekdays.thu", { defaultValue: isChinese ? "周四" : "Thu" }) },
      { value: 5, label: t("repeat.weekdays.fri", { defaultValue: isChinese ? "周五" : "Fri" }) },
      { value: 6, label: t("repeat.weekdays.sat", { defaultValue: isChinese ? "周六" : "Sat" }) },
      { value: 7, label: t("repeat.weekdays.sun", { defaultValue: isChinese ? "周日" : "Sun" }) },
    ],
    [isChinese, t],
  );

  const weekDayMap = useMemo(
    () =>
      weekDayOptions.reduce<Record<number, string>>((acc, curr) => {
        acc[curr.value] = curr.label;
        return acc;
      }, {}),
    [weekDayOptions],
  );

  const unitText = useMemo(() => {
    const interval = normalizeInterval(draft.interval);
    if (isChinese) {
      if (draft.frequency === "daily") return "天";
      if (draft.frequency === "weekly") return "周";
      if (draft.frequency === "monthly") return "个月";
      return "年";
    }

    if (draft.frequency === "daily") return interval > 1 ? "days" : "day";
    if (draft.frequency === "weekly") return interval > 1 ? "weeks" : "week";
    if (draft.frequency === "monthly") return interval > 1 ? "months" : "month";
    return interval > 1 ? "years" : "year";
  }, [draft.frequency, draft.interval, isChinese]);

  const dayOfMonthOptions = useMemo<DropdownOption<number>[]>(
    () =>
      Array.from({ length: 31 }, (_, index) => {
        const day = index + 1;
        return {
          value: day,
          label: isChinese ? `${day}号` : getOrdinal(day),
        };
      }),
    [isChinese],
  );

  const onFrequencyChange = (next: RepeatFrequency) => {
    setDraft((prev) => {
      const nextDraft: RepeatConfig = { ...prev, frequency: next };
      if (next === "weekly" && nextDraft.daysOfWeek.length === 0) {
        nextDraft.daysOfWeek = [toWeekdayValue(nextDraft.startDate)];
      }
      if (next === "monthly" && !nextDraft.dayOfMonth) {
        nextDraft.dayOfMonth = nextDraft.startDate.getDate();
      }
      return nextDraft;
    });
  };

  const onIntervalChange = (text: string) => {
    const digits = text.replace(/[^\d]/g, "");
    setIntervalText(digits);
    const parsed = Number.parseInt(digits, 10);
    setDraft((prev) => ({
      ...prev,
      interval: normalizeInterval(Number.isNaN(parsed) ? 1 : parsed),
    }));
  };

  const toggleWeekday = (day: number) => {
    setDraft((prev) => {
      const exists = prev.daysOfWeek.includes(day);
      const nextDays = exists
        ? prev.daysOfWeek.filter((item) => item !== day)
        : [...prev.daysOfWeek, day];
      return {
        ...prev,
        daysOfWeek: nextDays.length ? nextDays : [day],
      };
    });
  };

  const confirm = () => {
    const finalized: RepeatConfig = {
      ...draft,
      interval: normalizeInterval(draft.interval),
      daysOfWeek:
        draft.frequency === "weekly"
          ? [...draft.daysOfWeek].sort((a, b) => a - b)
          : [...draft.daysOfWeek],
      dayOfMonth:
        draft.frequency === "monthly" ? (draft.dayOfMonth ?? draft.startDate.getDate()) : null,
    };
    const summary = buildRepeatSummary(finalized, isChinese, weekDayMap);
    onConfirm(finalized, summary);
    onClose();
  };

  const startDateText = format(draft.startDate, dateFormat, { locale });
  const endDateText = draft.endDate ? format(draft.endDate, dateFormat, { locale }) : null;

  return (
    <Modal
      isVisible={visible}
      onBackdropPress={onClose}
      onBackButtonPress={onClose}
      backdropOpacity={0.35}
      animationIn="slideInUp"
      animationOut="slideOutDown"
      style={{ margin: 0 }}
      useNativeDriver={false}
    >
      <View className="mt-auto bg-white rounded-t-3xl px-6 pt-6 pb-8 max-h-[88%]">
        <View className="flex-row items-center justify-between mb-5">
          <Text className="font-balooBold text-2xl text-secondary">
            {t("form.repeat", { defaultValue: isChinese ? "重复" : "Repeat" })}
          </Text>
          <Pressable onPress={onClose} className="p-1">
            <MaterialCommunityIcons name="close" size={22} color="#4B5563" />
          </Pressable>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 16 }}
        >
          <Animated.View className="mb-4" layout={MotionAnimations.layout}>
            <View className="flex-row items-center justify-between">
              <Text className="font-baloo text-secondary text-xl mt-1">
                {t("repeat.frequency", { defaultValue: isChinese ? "频率" : "Frequency" })}
              </Text>
              <AnimatedDropdown
                value={draft.frequency}
                onChange={onFrequencyChange}
                options={frequencyOptions}
                minWidth={180}
              />
            </View>
          </Animated.View>

          <Animated.View className="mb-4" layout={MotionAnimations.layout}>
            <Text className="font-baloo text-secondary text-xl mt-1 mb-2">
              {t("repeat.interval", { defaultValue: isChinese ? "间隔" : "Interval" })}
            </Text>
            <View className="flex-row items-center bg-background rounded-xl px-4 py-2">
              <Text className="font-baloo text-secondary text-lg mr-2">
                {t("repeat.every", { defaultValue: isChinese ? "每" : "Every" })}
              </Text>
              <TextInput
                value={intervalText}
                onChangeText={onIntervalChange}
                keyboardType="number-pad"
                className="min-w-[56px] h-9 px-2 py-0 text-center text-lg font-baloo text-secondary bg-white rounded-lg"
              />
              <Text className="font-baloo text-secondary text-lg ml-2">{unitText}</Text>
            </View>
          </Animated.View>

          {draft.frequency === "weekly" && (
            <Animated.View className="mb-4" layout={MotionAnimations.layout}>
              <Text className="font-baloo text-secondary text-xl mt-1 mb-2">
                {t("repeat.daysOfWeek", { defaultValue: isChinese ? "重复于" : "Days of week" })}
              </Text>
              <View className="flex-row flex-wrap">
                {weekDayOptions.map((day) => {
                  const selected = draft.daysOfWeek.includes(day.value);
                  return (
                    <Pressable
                      key={day.value}
                      onPress={() => toggleWeekday(day.value)}
                      className={`min-h-[40px] px-3 py-2 rounded-xl mr-2 mb-2 border ${
                        selected
                          ? "bg-highlight border-highlight"
                          : "bg-background border-transparent"
                      }`}
                    >
                      <Text
                        className={`font-baloo text-base ${
                          selected ? "text-white" : "text-secondary"
                        }`}
                      >
                        {day.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </Animated.View>
          )}

          {draft.frequency === "monthly" && (
            <Animated.View className="mb-4" layout={MotionAnimations.layout}>
              <View className="flex-row items-center justify-between">
                <Text className="font-baloo text-secondary text-xl mt-1">
                  {t("repeat.dayOfMonth", {
                    defaultValue: isChinese ? "每月日期" : "Day of month",
                  })}
                </Text>
                <AnimatedDropdown
                  value={draft.dayOfMonth ?? draft.startDate.getDate()}
                  onChange={(value) => setDraft((prev) => ({ ...prev, dayOfMonth: value }))}
                  options={dayOfMonthOptions}
                  minWidth={140}
                  maxVisibleItems={4}
                />
              </View>
            </Animated.View>
          )}

          <Animated.View className="mb-4" layout={MotionAnimations.layout}>
            <View className="flex-row items-center justify-between">
              <Text className="font-baloo text-secondary text-xl mt-1">
                {t("repeat.startDate", { defaultValue: isChinese ? "开始日期" : "Start date" })}
              </Text>
              <Pressable
                onPress={() =>
                  setActiveSelector((prev) => (prev === "startDate" ? null : "startDate"))
                }
                className="bg-background px-4 py-2 rounded-xl"
              >
                <Text className="text-xl font-balooThin text-secondary">{startDateText}</Text>
              </Pressable>
            </View>

            {activeSelector === "startDate" && (
              <Animated.View
                entering={MotionAnimations.upEntering}
                exiting={MotionAnimations.outExiting}
                className="mt-2"
              >
                <SingleDateCalendar
                  defaultStartDate={format(draft.startDate, "yyyy-MM-dd")}
                  onStartDateChange={(nextDate) => {
                    setDraft((prev) => ({ ...prev, startDate: nextDate }));
                    setActiveSelector(null);
                  }}
                />
              </Animated.View>
            )}
          </Animated.View>

          <Animated.View className="mb-6" layout={MotionAnimations.layout}>
            <View className="flex-row items-center justify-between">
              <Text className="font-baloo text-secondary text-xl mt-1">
                {t("repeat.endDate", { defaultValue: isChinese ? "结束日期" : "End date" })}
              </Text>
              <View className="flex-row items-center">
                {endDateText ? (
                  <Pressable
                    onPress={() =>
                      setActiveSelector((prev) => (prev === "endDate" ? null : "endDate"))
                    }
                    className="bg-background px-4 py-2 rounded-xl mr-2"
                  >
                    <Text className="text-xl font-balooThin text-secondary">{endDateText}</Text>
                  </Pressable>
                ) : (
                  <Pressable
                    onPress={() => {
                      setDraft((prev) => ({ ...prev, endDate: prev.startDate }));
                      setActiveSelector("endDate");
                    }}
                    className="bg-background px-4 py-2 rounded-xl"
                  >
                    <Text className="text-xl font-balooThin text-secondary">
                      {t("repeat.noEndDate", {
                        defaultValue: isChinese ? "无结束日期" : "No end date",
                      })}
                    </Text>
                  </Pressable>
                )}

                {endDateText && (
                  <Pressable
                    onPress={() => {
                      setDraft((prev) => ({ ...prev, endDate: null }));
                      setActiveSelector(null);
                    }}
                  >
                    <Text className="font-baloo text-base text-[#6B7280]">
                      {t("repeat.clearEndDate", {
                        defaultValue: isChinese ? "清除" : "Clear",
                      })}
                    </Text>
                  </Pressable>
                )}
              </View>
            </View>

            {activeSelector === "endDate" && draft.endDate && (
              <Animated.View
                entering={MotionAnimations.upEntering}
                exiting={MotionAnimations.outExiting}
                className="mt-2"
              >
                <SingleDateCalendar
                  defaultStartDate={format(draft.endDate, "yyyy-MM-dd")}
                  onStartDateChange={(nextDate) => {
                    setDraft((prev) => ({ ...prev, endDate: nextDate }));
                    setActiveSelector(null);
                  }}
                />
              </Animated.View>
            )}
          </Animated.View>

          <Pressable
            onPress={confirm}
            className="rounded-xl py-4 items-center justify-center bg-lime-300"
          >
            <Text className="font-balooBold text-xl text-black">
              {t("common:confirm", { defaultValue: isChinese ? "确认" : "Confirm" })}
            </Text>
          </Pressable>
        </ScrollView>
      </View>
    </Modal>
  );
};

export default RepeatSelectSheet;
