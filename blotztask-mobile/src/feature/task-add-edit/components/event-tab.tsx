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
import { Control, UseFormClearErrors, UseFormTrigger, useController } from "react-hook-form";
import { TaskFormField } from "../models/task-form-schema";
import TimePicker from "./time-picker";
import DoubleDatesCalendar from "./double-dates-calendar";
import { useTranslation } from "react-i18next";
import Animated from "react-native-reanimated";
import { MotionAnimations } from "@/shared/constants/animations/motion";
import { combineDateTime } from "../util/combine-date-time";
import { ToggleSwitch } from "../../settings/components/toggle-switch";
import { FormDivider } from "@/shared/components/ui/form-divider";

export const EventTab = ({
  control,
  trigger,
  clearErrors,
}: {
  control: Control<TaskFormField>;
  trigger?: UseFormTrigger<TaskFormField>;
  clearErrors?: UseFormClearErrors<TaskFormField>;
}) => {
  const validateRange = (sd: Date, st: Date, ed: Date, et: Date) => {
    const start = combineDateTime(sd, st);
    const end = combineDateTime(ed, et);
    if (start && end && (isBefore(start, end) || isEqual(start, end))) {
      clearErrors?.("endTime");
    } else {
      trigger?.("endTime");
    }
  };
  const { t, i18n } = useTranslation("tasks");
  const isChinese = i18n.language === "zh";
  const locale = isChinese ? zhCN : enUS;
  const dateFormat = isChinese ? "yyyy年M月d日" : "MMM d, yyyy";
  const [activeSelector, setActiveSelector] = useState<
    "startDate" | "startTime" | "endDate" | "endTime" | "deadlineDate" | "deadlineTime" | null
  >(null);

  const {
    field: { value: startDateValue, onChange: startDateOnChange },
  } = useController({
    control,
    name: "startDate",
  });

  const {
    field: { value: startTimeValue, onChange: startTimeOnChange },
  } = useController({
    control,
    name: "startTime",
  });

  const {
    field: { value: endDateValue, onChange: endDateOnChange },
  } = useController({
    control,
    name: "endDate",
  });

  const {
    field: { value: endTimeValue, onChange: endTimeOnChange },
  } = useController({
    control,
    name: "endTime",
  });
  const {
    field: { value: isDdl, onChange: onIsDdlChange },
  } = useController({
    control,
    name: "isDdl",
  });
  const {
    field: { value: deadlineDate, onChange: onDeadlineDateChange },
  } = useController({
    control,
    name: "deadlineDate",
  });
  const {
    field: { value: deadlineTime, onChange: onDeadlineTimeChange },
  } = useController({
    control,
    name: "deadlineTime",
  });

  const handleStartDateChange = (nextDate: Date) => {
    const previousSpan =
      startDateValue && endDateValue
        ? Math.max(differenceInCalendarDays(endDateValue, startDateValue), 0)
        : 0;

    startDateOnChange(nextDate);

    const nextEndDate =
      endDateValue && isAfter(nextDate, endDateValue)
        ? addDays(nextDate, previousSpan)
        : endDateValue;
    if (endDateValue && isAfter(nextDate, endDateValue)) {
      endDateOnChange(nextEndDate);
    }

    validateRange(nextDate, startTimeValue, nextEndDate, endTimeValue);
  };

  const isDateInvalid =
    endDateValue &&
    startDateValue &&
    isBefore(endDateValue, startDateValue) &&
    !isSameDay(endDateValue, startDateValue);

  const isSameDate = endDateValue && startDateValue && isSameDay(endDateValue, startDateValue);

  const isTimeInvalid =
    isSameDate && endTimeValue && startTimeValue && isBefore(endTimeValue, startTimeValue);

  const deadlineDateDisplayText = deadlineDate
    ? format(deadlineDate, dateFormat, { locale })
    : t("form.selectDate");
  const deadlineTimeDisplayText = deadlineTime
    ? format(deadlineTime, "hh:mm a")
    : t("form.selectTime");

  return (
    <Animated.View
      className="mb-4"
      layout={MotionAnimations.layout}
      entering={MotionAnimations.leftEntering}
      exiting={MotionAnimations.rightExiting}
    >
      <Animated.View className="mb-4" layout={MotionAnimations.layout}>
        <Animated.View className="flex-row justify-between" layout={MotionAnimations.layout}>
          <Text className="font-baloo text-secondary text-2xl mt-1">{t("form.start")}</Text>

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
          <Text className="font-baloo text-secondary text-2xl mt-1">{t("form.end")}</Text>

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

      <FormDivider />

      {/* Deadline Toggle */}
      <Animated.View
        className="flex-row justify-between items-center mb-4"
        layout={MotionAnimations.layout}
      >
        <Text className="font-baloo text-secondary text-2xl mt-1">{t("form.markAsDeadline")}</Text>
        <ToggleSwitch value={isDdl} onChange={() => onIsDdlChange(!isDdl)} />
      </Animated.View>

      {/* Due Time  */}
      {isDdl && (
        <Animated.View
          entering={MotionAnimations.upEntering}
          exiting={MotionAnimations.outExiting}
          layout={MotionAnimations.layout}
        >
          <Animated.View className="mb-4" layout={MotionAnimations.layout}>
            <Animated.View className="flex-row justify-between" layout={MotionAnimations.layout}>
              <Text className="font-baloo text-secondary text-2xl mt-1">{t("form.dueTime")}</Text>
              <View className="flex-row">
                <Pressable
                  onPress={() =>
                    setActiveSelector((prev) => (prev === "deadlineDate" ? null : "deadlineDate"))
                  }
                  className="bg-background px-4 py-2 rounded-xl mr-2"
                >
                  <Text className="text-xl font-balooThin text-secondary">
                    {deadlineDateDisplayText}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() =>
                    setActiveSelector((prev) => (prev === "deadlineTime" ? null : "deadlineTime"))
                  }
                  className="bg-background px-4 py-2 rounded-xl"
                >
                  <Text className="text-xl font-balooThin text-secondary">
                    {deadlineTimeDisplayText}
                  </Text>
                </Pressable>
              </View>
            </Animated.View>

            {activeSelector === "deadlineDate" && (
              <Animated.View
                entering={MotionAnimations.upEntering}
                exiting={MotionAnimations.outExiting}
              >
                <SingleDateCalendar
                  defaultStartDate={format(deadlineDate || new Date(), "yyyy-MM-dd")}
                  onStartDateChange={onDeadlineDateChange}
                />
              </Animated.View>
            )}

            {activeSelector === "deadlineTime" && (
              <Animated.View
                entering={MotionAnimations.upEntering}
                exiting={MotionAnimations.outExiting}
                className="items-center"
              >
                <TimePicker value={deadlineTime || new Date()} onChange={onDeadlineTimeChange} />
              </Animated.View>
            )}
          </Animated.View>
        </Animated.View>
      )}
    </Animated.View>
  );
};
