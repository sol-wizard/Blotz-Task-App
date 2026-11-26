import React, { useMemo, useState } from "react";
import { View, Text } from "react-native";
import WheelPicker, { type PickerItem } from "@quidone/react-native-wheel-picker";

type Props = {
  value?: Date;
  onChange?: (v: Date) => void;
  itemHeight?: number;
  visibleItemCount?: 3 | 5 | 7;
  /** Minutes between wheel items: 1 shows every minute, 5 shows 00, 05, 10… A value off the step shows the step below it. */
  minuteStep?: 1 | 5 | 10 | 15 | 30;
  /** Total width of the picker. */
  width?: number;
  /** Width of each of the two wheels. */
  wheelWidth?: number;
};

const pad2 = (n: number) => n.toString().padStart(2, "0");

const PICKER_CYCLES = 3;
const PICKER_MIDDLE_CYCLE = Math.floor(PICKER_CYCLES / 2);

const HOURS: PickerItem<number>[] = Array.from({ length: 24 * PICKER_CYCLES }, (_, i) => ({
  value: i,
  label: pad2(i % 24), //00..23
}));

const buildMinutes = (step: number): PickerItem<number>[] =>
  Array.from({ length: (60 / step) * PICKER_CYCLES }, (_, i) => ({
    value: i,
    label: pad2((i % (60 / step)) * step), //00...59, or 00, 05...55 for a step of 5
  }));

function mergeToDate(base: Date, hour: number, minute: number) {
  const next = new Date(base);
  next.setHours(hour, minute, base.getSeconds(), base.getMilliseconds());
  return next;
}

export default function TimePicker({
  value,
  onChange,
  itemHeight = 44,
  visibleItemCount = 5,
  minuteStep = 1,
  width = 320,
  wheelWidth = 96,
}: Props) {
  const initial = value ?? new Date();
  const minutesPerCycle = 60 / minuteStep;
  const minutes = useMemo(() => buildMinutes(minuteStep), [minuteStep]);

  const [hourIndex, setHourIndex] = useState<number>(
    PICKER_MIDDLE_CYCLE * 24 + initial.getHours(),
  );
  const [minuteIndex, setMinuteIndex] = useState<number>(
    PICKER_MIDDLE_CYCLE * minutesPerCycle + Math.floor(initial.getMinutes() / minuteStep),
  );

  const combineWheelValue = (next: Partial<{ hourIndex: number; minuteIndex: number }>) => {
    const h = next.hourIndex ?? hourIndex;
    const m = next.minuteIndex ?? minuteIndex;

    const base = value ?? new Date();

    // Convert indexes to actual hours/minutes
    const selectedHour = h % 24;
    const selectedMinute = (m % minutesPerCycle) * minuteStep;

    const out = mergeToDate(base, selectedHour, selectedMinute);
    onChange?.(out);
  };

  return (
    <View
      className="mx-auto rounded-xl overflow-hidden"
      style={{ width, height: itemHeight * visibleItemCount }}
    >
      <View className="flex-1 flex-row items-center justify-center">
        <WheelPicker
          data={HOURS}
          value={hourIndex}
          width={wheelWidth}
          itemHeight={itemHeight}
          visibleItemCount={visibleItemCount}
          enableScrollByTapOnItem
          onValueChanged={({ item }) => {
            const h = item.value as number;
            setHourIndex(h);
            combineWheelValue({ hourIndex: h });
          }}
        />

        <Text className="text-[22px] font-semibold text-[#2e3654] w-6 text-center">:</Text>

        <WheelPicker
          data={minutes}
          value={minuteIndex}
          width={wheelWidth}
          itemHeight={itemHeight}
          visibleItemCount={visibleItemCount}
          enableScrollByTapOnItem
          onValueChanged={({ item }) => {
            const m = item.value as number;
            setMinuteIndex(m);
            combineWheelValue({ minuteIndex: m });
          }}
        />
      </View>
    </View>
  );
}
