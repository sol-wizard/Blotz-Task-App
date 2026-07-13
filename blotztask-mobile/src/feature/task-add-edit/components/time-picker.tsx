import React, { useState } from "react";
import { View, Text } from "react-native";
import WheelPicker, { type PickerItem, withVirtualized } from "@quidone/react-native-wheel-picker";

const VirtualizedWheelPicker = withVirtualized(WheelPicker);

type Meridiem = "AM" | "PM";

type Props = {
  value?: Date;
  onChange?: (v: Date) => void;
  itemHeight?: number;
  visibleItemCount?: 3 | 5 | 7;
};

const pad2 = (n: number) => n.toString().padStart(2, "0");

const PICKER_CYCLES = 21;
const PICKER_MIDDLE_CYCLE = Math.floor(PICKER_CYCLES / 2);

const HOURS: PickerItem<number>[] = Array.from({ length: 12 * PICKER_CYCLES }, (_, i) => ({
  value: i,
  label: pad2((i % 12) + 1), //01..12
}));

const MINUTES: PickerItem<number>[] = Array.from({ length: 60 * PICKER_CYCLES }, (_, i) => ({
  value: i,
  label: pad2(i % 60), //00...59
}));
const MERIDIEMS: PickerItem<Meridiem>[] = [
  { value: "AM", label: "AM" },
  { value: "PM", label: "PM" },
];

function splitTo12h(date: Date) {
  const h24 = date.getHours();
  const minute = date.getMinutes();
  const meridiem: Meridiem = h24 >= 12 ? "PM" : "AM";
  let hour12 = h24 % 12;
  if (hour12 === 0) hour12 = 12;
  return { hour12, minute, meridiem };
}

function mergeToDate(base: Date, hour12: number, minute: number, meridiem: Meridiem) {
  const h24 = (hour12 % 12) + (meridiem === "PM" ? 12 : 0);
  const next = new Date(base);
  next.setHours(h24, minute, base.getSeconds(), base.getMilliseconds());
  return next;
}

export default function TimePicker({
  value,
  onChange,
  itemHeight = 44,
  visibleItemCount = 5,
}: Props) {
  const initial = value ?? new Date();

  const [hour12Index, setHour12Index] = useState<number>(
    PICKER_MIDDLE_CYCLE * 12 + splitTo12h(initial).hour12 - 1,
  );
  const [minuteIndex, setMinuteIndex] = useState<number>(
    PICKER_MIDDLE_CYCLE * 60 + splitTo12h(initial).minute,
  );
  const [meridiem, setMeridiem] = useState<Meridiem>(splitTo12h(initial).meridiem);

  const combineWheelValue = (
    next: Partial<{ hour12Index: number; minuteIndex: number; meridiem: Meridiem }>,
  ) => {
    const h = next.hour12Index ?? hour12Index;
    const m = next.minuteIndex ?? minuteIndex;
    const md = next.meridiem ?? meridiem;

    const base = value ?? new Date();

    // Convert indexes to actual hours/minutes
    const selectedHour = (h % 12) + 1;
    const selectedMinute = m % 60;

    const out = mergeToDate(base, selectedHour, selectedMinute, md);
    onChange?.(out);
  };

  return (
    <View
      className="mx-auto w-[320px] rounded-xl overflow-hidden"
      style={{ height: itemHeight * visibleItemCount }}
    >
      <View className="flex-1 flex-row items-center justify-center">
        <VirtualizedWheelPicker
          data={HOURS}
          value={hour12Index}
          width={96}
          itemHeight={itemHeight}
          visibleItemCount={visibleItemCount}
          enableScrollByTapOnItem
          onValueChanged={({ item }) => {
            const h = item.value as number;
            setHour12Index(h);
            combineWheelValue({ hour12Index: h });
          }}
        />

        <Text className="text-[22px] font-semibold text-[#2e3654] w-6 text-center">:</Text>

        <VirtualizedWheelPicker
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

        <WheelPicker
          data={MERIDIEMS}
          value={meridiem}
          width={84}
          itemHeight={itemHeight}
          visibleItemCount={visibleItemCount}
          enableScrollByTapOnItem
          onValueChanged={({ item }) => {
            const md = item.value as Meridiem;
            setMeridiem(md);
            combineWheelValue({ meridiem: md });
          }}
        />
      </View>
    </View>
  );
}
