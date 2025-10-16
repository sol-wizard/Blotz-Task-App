import React, { useState } from "react";
import { View, Text } from "react-native";
import WheelPicker, { type PickerItem } from "@quidone/react-native-wheel-picker";

type Meridiem = "AM" | "PM";

type Props = {
  value?: Date;
  onChange?: (v: Date) => void;
  itemHeight?: number;
  visibleItemCount?: 3 | 5 | 7;
};

const pad2 = (n: number) => n.toString().padStart(2, "0");

const HOURS: PickerItem<number>[] = Array.from({ length: 12 }, (_, i) => {
  const h = i + 1; // 1..12
  return { value: h, label: pad2(h) };
});
const MINUTES: PickerItem<number>[] = Array.from({ length: 60 }, (_, i) => ({
  value: i,
  label: pad2(i),
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

  const [hour12, setHour12] = useState<number>(splitTo12h(initial).hour12);
  const [minute, setMinute] = useState<number>(splitTo12h(initial).minute);
  const [meridiem, setMeridiem] = useState<Meridiem>(splitTo12h(initial).meridiem);

  const combineWheelValue = (
    next: Partial<{ hour12: number; minute: number; meridiem: Meridiem }>,
  ) => {
    const h = next.hour12 ?? hour12;
    const m = next.minute ?? minute;
    const md = next.meridiem ?? meridiem;

    const base = value ?? new Date();
    const out = mergeToDate(base, h, m, md);
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
          value={hour12}
          width={96}
          itemHeight={itemHeight}
          visibleItemCount={visibleItemCount}
          enableScrollByTapOnItem
          onValueChanged={({ item }) => {
            const h = item.value as number;
            setHour12(h);
            combineWheelValue({ hour12: h });
          }}
        />

        <Text className="text-[22px] font-semibold text-[#2e3654] w-6 text-center">:</Text>

        <WheelPicker
          data={MINUTES}
          value={minute}
          width={96}
          itemHeight={itemHeight}
          visibleItemCount={visibleItemCount}
          enableScrollByTapOnItem
          onValueChanged={({ item }) => {
            const m = item.value as number;
            setMinute(m);
            combineWheelValue({ minute: m });
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
