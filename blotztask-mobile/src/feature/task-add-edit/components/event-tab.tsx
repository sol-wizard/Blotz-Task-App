import { useState } from "react";
import { Pressable, View, Text } from "react-native";
import { SingleDateCalendar } from "./single-date-calendar";
import {
  addDays,
  differenceInCalendarDays,
  format,
  isAfter,
  isSameDay,
  isBefore,
  isEqual,
} from "date-fns";
import { zhCN, enUS } from "date-fns/locale";
import { Control, FieldPath, useController, UseFormClearErrors, UseFormTrigger, Path } from "react-hook-form";
import { FormValues } from "./reminder-tab";
import TimePicker from "./time-picker";
import DoubleDatesCalendar from "./double-dates-calendar";
import { useTranslation } from "react-i18next";
import Animated from "react-native-reanimated";
import { MotionAnimations } from "@/shared/constants/animations/motion";
import { combineDateTime } from "../util/combine-date-time";

export const EventTab = <T extends FormValues>({
  control,
  trigger,
  clearErrors,
}: {
  control: Control<T>;
  trigger?: UseFormTrigger<T>;
  clearErrors?: UseFormClearErrors<T>;
}) => {
  const validateRange = (sd: Date, st: Date, ed: Date, et: Date) => {
    const start = combineDateTime(sd, st);
    const end = combineDateTime(ed, et);
    if (start && end && (isBefore(start, end) || isEqual(start, end))) {
      clearErrors?.("endTime" as any);
    } else {
      trigger?.("endTime" as any);
    }
  };
  const { t, i18n } = useTranslation("tasks");
  const isChinese = i18n.language === "zh";
  const locale = isChinese ? zhCN : enUS;
  const dateFormat = isChinese ? "yyyy年M月d日" : "MMM d, yyyy";
  const [activeSelector, setActiveSelector] = useState<
    "startDate" | "startTime" | "endDate" | "endTime" | null
  >(null);

  const useField = <K extends FieldPath<T>>(name: K) =>
    useController<T, K>({ control, name }).field;

  const { value: startDateValue, onChange: startDateOnChange } = useField("startDate" as any);
  const { value: startTimeValue, onChange: startTimeOnChange } = useField("startTime" as any);
  const { value: endDateValue, onChange: endDateOnChange } = useField("endDate" as any);
  const { value: endTimeValue, onChange: endTimeOnChange } = useField("endTime" as any);
  const { value: deadlineDate } = useField("deadlineDate" as any);
  const { value: isDdl } = useField("isDeadline" as any);

  const ddlStr = isDdl && deadlineDate ? format(deadlineDate, "yyyy-MM-dd") : undefined;

  const handleStartDateChange = (nextDate: Date) => {
    startDateOnChange(nextDate);

    if (endDateValue && isAfter(nextDate, endDateValue)) {
      const previousSpan =
        startDateValue ? Math.max(differenceInCalendarDays(endDateValue, startDateValue), 0) : 0;
      const nextEndDate = addDays(nextDate, previousSpan);
      endDateOnChange(nextEndDate);
      validateRange(nextDate, startTimeValue, nextEndDate, endTimeValue);
    } else {
      validateRange(nextDate, startTimeValue, endDateValue, endTimeValue);
    }
  };

  const isDateInvalid =
    endDateValue &&
    startDateValue &&
    isBefore(endDateValue, startDateValue) &&
    !isSameDay(endDateValue, startDateValue);

  const isSameDate = endDateValue && startDateValue && isSameDay(endDateValue, startDateValue);

  const isTimeInvalid =
    isSameDate && endTimeValue && startTimeValue && isBefore(endTimeValue, startTimeValue);

  return (
    <Animated.View
      layout={MotionAnimations.layout}
      entering={MotionAnimations.leftEntering}
      exiting={MotionAnimations.rightExiting}
    >
      <Animated.View className="mb-4" layout={MotionAnimations.layout}>
        <Animated.View className="flex-row justify-between" layout={MotionAnimations.layout}>
          <Text className="font-baloo text-secondary text-xl mt-1">{t("form.start")}</Text>

          <View className="flex-row">
            <Pressable
              onPress={() =>
                setActiveSelector((prev) => (prev === "startDate" ? null : "startDate"))
              }
              className="bg-background px-4 py-2 rounded-xl mr-2"
            >
              <Text className="text-xl font-balooThin text-secondary">
                {startDateValue
                  ? format(startDateValue, dateFormat, { locale })
                  : t("form.selectDate")}
              </Text>
            </Pressable>

            <Pressable
              onPress={() =>
                setActiveSelector((prev) => (prev === "startTime" ? null : "startTime"))
              }
              className="bg-background px-4 py-2 rounded-xl"
            >
              <Text className="text-xl font-balooThin text-secondary ">
                {startTimeValue ? format(startTimeValue, "hh:mm a") : t("form.selectTime")}
              </Text>
            </Pressable>
          </View>
        </Animated.View>

        {activeSelector === "startDate" && (
          <Animated.View
            entering={MotionAnimations.upEntering}
            exiting={MotionAnimations.outExiting}
          >
            <SingleDateCalendar
              onStartDateChange={handleStartDateChange}
              defaultStartDate={format(new Date(startDateValue), "yyyy-MM-dd")}
              deadlineDate={ddlStr}
            />
          </Animated.View>
        )}
        {activeSelector === "startTime" && (
          <Animated.View
            entering={MotionAnimations.upEntering}
            exiting={MotionAnimations.outExiting}
          >
            <TimePicker
              value={startTimeValue}
              onChange={(v: Date) => {
                startTimeOnChange(v);
                validateRange(startDateValue, v, endDateValue, endTimeValue);
              }}
            />
          </Animated.View>
        )}
      </Animated.View>

      <Animated.View layout={MotionAnimations.layout}>
        <Animated.View className="flex-row justify-between" layout={MotionAnimations.layout}>
          <Text className="font-baloo text-secondary text-xl mt-1">{t("form.end")}</Text>

          <View className="flex-row">
            <Pressable
              onPress={() => setActiveSelector((prev) => (prev === "endDate" ? null : "endDate"))}
              className="bg-background px-4 py-2 rounded-xl mr-2"
            >
              <Text
                className={`text-xl font-balooThin ${
                  isDateInvalid
                    ? "text-red-500 line-through"
                    : isTimeInvalid
                      ? "text-secondary line-through"
                      : "text-secondary"
                }`}
              >
                {endDateValue ? format(endDateValue, dateFormat, { locale }) : t("form.selectDate")}
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setActiveSelector((prev) => (prev === "endTime" ? null : "endTime"))}
              className="bg-background px-4 py-2 rounded-xl"
            >
              <Text
                className={`text-xl font-balooThin ${
                  isTimeInvalid
                    ? "text-red-500 line-through"
                    : isDateInvalid
                      ? "text-secondary line-through"
                      : "text-secondary"
                }`}
              >
                {endTimeValue ? format(endTimeValue, "hh:mm a") : t("form.selectTime")}
              </Text>
            </Pressable>
          </View>
        </Animated.View>
        {activeSelector === "endDate" && (
          <Animated.View
            entering={MotionAnimations.upEntering}
            exiting={MotionAnimations.outExiting}
          >
            <DoubleDatesCalendar
              startDate={startDateValue}
              endDate={endDateValue}
              deadlineDate={ddlStr}
              setEndDate={(v: Date) => {
                endDateOnChange(v);
                validateRange(startDateValue, startTimeValue, v, endTimeValue);
              }}
              current={format(
                activeSelector === "endDate"
                  ? (endDateValue ?? startDateValue ?? new Date())
                  : (startDateValue ?? new Date()),
                "yyyy-MM-dd",
              )}
            />
          </Animated.View>
        )}
        {activeSelector === "endTime" && (
          <Animated.View
            entering={MotionAnimations.upEntering}
            exiting={MotionAnimations.outExiting}
          >
            <TimePicker
              value={endTimeValue}
              onChange={(v: Date) => {
                endTimeOnChange(v);
                validateRange(startDateValue, startTimeValue, endDateValue, v);
              }}
            />
          </Animated.View>
        )}
      </Animated.View>
    </Animated.View>
  );
};
