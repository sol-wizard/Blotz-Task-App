import React, { useState } from "react";
import { View, Text } from "react-native";
import WheelPicker, { type PickerItem } from "@quidone/react-native-wheel-picker";

type Props = {
  value?: Date;
  onChange?: (v: Date) => void;
  itemHeight?: number;
  visibleItemCount?: 3 | 5 | 7;
};

const pad2 = (n: number) => n.toString().padStart(2, "0");

const PICKER_CYCLES = 3;
const PICKER_MIDDLE_CYCLE = Math.floor(PICKER_CYCLES / 2);

const HOURS: PickerItem<number>[] = Array.from({ length: 24 * PICKER_CYCLES }, (_, i) => ({
  value: i,
  label: pad2(i % 24), //00..23
}));

const MINUTES: PickerItem<number>[] = Array.from({ length: 60 * PICKER_CYCLES }, (_, i) => ({
  value: i,
  label: pad2(i % 60), //00...59
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
}: Props) {
  const initial = value ?? new Date();

  const [hourIndex, setHourIndex] = useState<number>(
    PICKER_MIDDLE_CYCLE * 24 + initial.getHours(),
  );
  const [minuteIndex, setMinuteIndex] = useState<number>(
    PICKER_MIDDLE_CYCLE * 60 + initial.getMinutes(),
  );

  const combineWheelValue = (next: Partial<{ hourIndex: number; minuteIndex: number }>) => {
    const h = next.hourIndex ?? hourIndex;
    const m = next.minuteIndex ?? minuteIndex;

    const base = value ?? new Date();

    // Convert indexes to actual hours/minutes
    const selectedHour = h % 24;
    const selectedMinute = m % 60;

    const out = mergeToDate(base, selectedHour, selectedMinute);
    onChange?.(out);
  };

  return (
    <View
      className="mx-auto w-[320px] rounded-xl overflow-hidden"
      style={{ height: itemHeight * visibleItemCount }}
    >
      <View className="flex-1 flex-row items-center justify-center">
        <WheelPicker
          data={HOURS}
          value={hourIndex}
          width={96}
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
          data={MINUTES}
          value={minuteIndex}
          width={96}
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
